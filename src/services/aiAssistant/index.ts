import { UserRole } from '@/contexts/AuthContext';
import { Asset, Site, Employee, Vehicle } from '@/types/asset';
import { AIIntent, AIResponse, AIContext, ActionExecutionContext } from './types';
import { EntityExtractor } from './entityExtraction';
import { IntentRecognizer } from './intentRecognition';
import { PermissionChecker } from './permissionChecker';
import { ConfidenceCalculator } from './confidenceCalculator';
import { ActionExecutor } from './actionExecutor';
import { ConversationMemory } from './conversationMemory';
import { aiConfig } from '@/config/aiConfig';
import { logger } from '@/lib/logger';
import { LocalClient } from './llmClients/localClient';

export * from './types';

export class AIAssistantService {
  private context: AIContext;
  private entityExtractor: EntityExtractor;
  private conversationMemory: ConversationMemory;
  private intentRecognizer: IntentRecognizer;
  private permissionChecker: PermissionChecker;
  private confidenceCalculator: ConfidenceCalculator;
  private actionExecutor: ActionExecutor;
  private localClient?: LocalClient;
  private onLLMError?: (error: string) => void;
  private llmFailureNotified: boolean = false;

  constructor(
    userRole: UserRole,
    assets: Asset[] = [],
    sites: Site[] = [],
    employees: Employee[] = [],
    vehicles: Vehicle[] = [],
    onLLMError?: (error: string) => void
  ) {
    this.context = { assets, sites, employees, vehicles, userRole };
    this.onLLMError = onLLMError;

    this.entityExtractor = new EntityExtractor(sites, assets, employees, vehicles);
    this.conversationMemory = new ConversationMemory(() => {
      // Notify when memory is 80% full (40 messages)
      if (this.onLLMError) {
        this.onLLMError('Conversation history is getting long. Consider clearing to improve performance.');
      }
    });
    this.intentRecognizer = new IntentRecognizer(this.context, this.entityExtractor, this.conversationMemory);
    this.permissionChecker = new PermissionChecker(userRole);
    this.confidenceCalculator = new ConfidenceCalculator();
    this.actionExecutor = new ActionExecutor(this.context);

    // Initialize a client bridge to the renderer/main LLM API when available.
    // The bridge (`window.llm.generate`) will route to local or remote provider depending on app config.
    try {
      if (typeof window !== 'undefined' && (window as any).llm && typeof (window as any).llm.generate === 'function') {
        this.localClient = new LocalClient();
        logger.info('AI Assistant: LLM bridge initialized successfully');
      } else {
        logger.warn('AI Assistant: LLM bridge not available - will use rule-based fallback');
      }
    } catch (err) {
      logger.warn('AI Assistant: Error initializing LLM bridge', { data: { error: err } });
      // ignore initialization errors in non-electron environments
    }
  }

  /**
   * Update context when data changes
   */
  updateContext(
    assets: Asset[],
    sites: Site[],
    employees: Employee[],
    vehicles: Vehicle[]
  ): void {
    this.context.assets = assets;
    this.context.sites = sites;
    this.context.employees = employees;
    this.context.vehicles = vehicles;

    this.entityExtractor.updateContext(sites, assets, employees, vehicles);
  }

  /**
   * Set execution context for direct action execution
   */
  setExecutionContext(executionContext: ActionExecutionContext): void {
    this.actionExecutor = new ActionExecutor(this.context, executionContext);
  }

  /**
   * Process user input and generate response
   */
  async processInput(userInput: string): Promise<AIResponse> {
    // Try to use remote LLM if available to extract intent
    if ((aiConfig.AI_MODE === 'remote' || aiConfig.AI_MODE === 'hybrid') && this.localClient) {
      try {
        // Build a safer prompt and ask the remote LLM to emit STRICT JSON
        const { buildIntentExtractionPrompt } = await import('./promptTemplates');
        const { validateIntentJson } = await import('./schemaValidator');

        const hintData = {
          sites: this.context.sites ? this.context.sites.map(s => s.name) : [],
          assets: this.context.assets ? this.context.assets.slice(0, 50).map(a => a.name) : []
        };

        const prompt = buildIntentExtractionPrompt(userInput, hintData);

        // Use remote provider via window.llm bridge
        const raw = await this.localClient.generate(prompt, {});
        let parsed: any = null;
        try {
          // try to parse JSON from output - permissively extract the first JSON object if model emits extra text
          const trimmed = (raw || '').trim();
          const firstBrace = trimmed.indexOf('{');
          const lastBrace = trimmed.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            const candidate = trimmed.slice(firstBrace, lastBrace + 1);
            parsed = JSON.parse(candidate);
          }
        } catch (err) {
          parsed = null;
        }

        // Validate parsed JSON matches expected intent schema
        const validated = parsed ? validateIntentJson(parsed) : null;

        if (validated) {
          const intentFromLLM: AIIntent = {
            action: validated.action as AIIntent['action'],
            confidence: validated.confidence,
            parameters: validated.parameters,
            missingParameters: validated.missingParameters,
            extractedEntities: (validated as any).extractedEntities
          };

          // Recalculate confidence and continue the normal flow
          let intent = intentFromLLM;
          if (intent.missingParameters.length > 0) {
            intent = this.resolveParametersFromHistory(intent);
          }
          intent.confidence = this.confidenceCalculator.calculateConfidence(intent);
          this.conversationMemory.addMessage(userInput, intent);

          // permission check
          const permissionCheck = this.permissionChecker.checkPermission(intent.action);
          if (!permissionCheck.allowed) {
            return { success: false, message: permissionCheck.message, intent };
          }

          if (intent.missingParameters.length > 0) {
            return { success: false, message: this.generateClarificationMessage(intent), intent, suggestedAction: { type: 'clarify' } };
          }

          return await this.actionExecutor.executeAction(intent);
        }
      } catch (err) {
        // If remote LLM fails, notify and fall back to rule-based parser
        if (!this.llmFailureNotified && this.onLLMError) {
          this.llmFailureNotified = true;
          const errorMsg = err instanceof Error ? err.message : String(err);

          // Extract meaningful error info
          let userFriendlyError = 'Remote AI unavailable, using fallback intent recognition.';

          if (errorMsg.includes('429')) {
            userFriendlyError += ' (Rate limited - please wait a moment before trying again)';
          } else if (errorMsg.includes('401') || errorMsg.includes('403')) {
            userFriendlyError += ' (Authentication failed - check your API key)';
          } else if (errorMsg.includes('timeout') || errorMsg.includes('TimeoutError')) {
            userFriendlyError += ' (Request timed out)';
          } else if (errorMsg.length > 0) {
            // Only append a snippet if we have a clean error message
            const clean = errorMsg.replace(/[{}]/g, '').trim();
            if (clean.length > 0 && clean.length < 100) {
              userFriendlyError += ` (${clean})`;
            }
          }

          this.onLLMError(userFriendlyError);
        }
      }
    }

    // Step 1: Identify intent (rule-based fallback)
    let intent = this.intentRecognizer.identifyIntent(userInput);

    // Step 2: Try to resolve missing parameters from history
    if (intent.missingParameters.length > 0) {
      intent = this.resolveParametersFromHistory(intent);
    }

    // Step 3: Recalculate confidence with resolved parameters
    intent.confidence = this.confidenceCalculator.calculateConfidence(intent);

    // Step 4: Save to conversation memory
    this.conversationMemory.addMessage(userInput, intent);

    // Step 5: Handle unknown actions
    if (intent.action === 'unknown') {
      return {
        success: false,
        message: "I'm not sure what you'd like me to do. Could you please rephrase or provide more details? For example, you can ask me to:\n• Create a waybill\n• Add an asset\n• Process a return\n• Check inventory\n• View analytics",
        intent
      };
    }

    // Step 6: Check permissions
    const permissionCheck = this.permissionChecker.checkPermission(intent.action);
    if (!permissionCheck.allowed) {
      return {
        success: false,
        message: permissionCheck.message,
        intent
      };
    }

    // Step 7: If still missing critical parameters, ask for clarification
    if (intent.missingParameters.length > 0) {
      return {
        success: false,
        message: this.generateClarificationMessage(intent),
        intent,
        suggestedAction: { type: 'clarify' }
      };
    }

    // Step 8: Execute action or suggest form
    return await this.actionExecutor.executeAction(intent);
  }

  /**
   * Resolve missing parameters from conversation history
   */
  private resolveParametersFromHistory(intent: AIIntent): AIIntent {
    const resolved = { ...intent };
    const stillMissing: string[] = [];

    for (const param of intent.missingParameters) {
      const value = this.conversationMemory.resolveFromHistory(param);
      if (value !== null) {
        resolved.parameters[param] = value;
      } else {
        stillMissing.push(param);
      }
    }

    resolved.missingParameters = stillMissing;
    return resolved;
  }

  /**
   * Generate clarification message for missing parameters
   */
  private generateClarificationMessage(intent: AIIntent): string {
    const action = intent.action.replace(/_/g, ' ');
    const missing = intent.missingParameters;

    // Map technical parameter names to user-friendly names
    const friendlyNames: Record<string, string> = {
      driverId: 'driver',
      vehicleId: 'vehicle',
      siteId: 'site',
      site: 'site',
      items: 'items to include',
      name: 'name',
      quantity: 'quantity'
    };

    if (missing.length === 1) {
      const param = missing[0];
      const friendlyParam = friendlyNames[param] || param.replace(/Id$/, '');
      const suggestions = this.getSuggestionsForParameter(param);

      let message = `I understand you want to ${action}. `;
      message += `However, I need to know: which ${friendlyParam}?`;

      if (suggestions.length > 0) {
        message += `\n\nAvailable options:\n${suggestions.slice(0, 5).join('\n')}`;
        if (suggestions.length > 5) {
          message += `\n... and ${suggestions.length - 5} more`;
        }
      }

      return message;
    }

    const friendlyMissing = missing.map(param => friendlyNames[param] || param.replace(/Id$/, ''));
    return `I understand you want to ${action}. However, I need more information about: ${friendlyMissing.join(', ')}. Please provide these details.`;
  }

  /**
   * Get suggestions for a missing parameter
   */
  private getSuggestionsForParameter(param: string): string[] {
    switch (param) {
      case 'site':
        return this.context.sites.map(s => `• ${s.name}`);
      case 'items':
        return this.context.assets.slice(0, 10).map(a => `• ${a.name}`);
      case 'driver':
        return this.context.employees.map(e => `• ${e.name}`);
      case 'vehicle':
        return this.context.vehicles.map(v => `• ${v.registration_number || v.name}`);
      default:
        return [];
    }
  }

  /**
   * Clear conversation history
   */
  clearConversation(): void {
    this.conversationMemory.clear();
  }

  /**
   * Get conversation history
   */
  getConversationHistory() {
    return this.conversationMemory.getHistory();
  }
}
