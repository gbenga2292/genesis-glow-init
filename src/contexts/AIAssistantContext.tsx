import React, { createContext, useContext, useState, useEffect } from 'react';
import { AIAssistantService, AIResponse, AIIntent, ActionExecutionContext } from '@/services/aiAssistant';
import { useAuth } from './AuthContext';
import { useAssets } from './AssetsContext';
import { Asset, Site, Employee, Vehicle } from '@/types/asset';
import { useToast } from '@/hooks/use-toast';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  intent?: AIIntent;
  suggestedAction?: AIResponse['suggestedAction'];
}

interface AIAssistantContextType {
  messages: ChatMessage[];
  isProcessing: boolean;
  sendMessage: (message: string) => Promise<void>;
  clearMessages: () => void;
  executeAction: (action: AIResponse['suggestedAction']) => void;
  updateContext: (assets: Asset[], sites: Site[], employees: Employee[], vehicles: Vehicle[]) => void;
}

const AIAssistantContext = createContext<AIAssistantContextType | undefined>(undefined);

export const useAIAssistant = () => {
  const context = useContext(AIAssistantContext);
  if (!context) {
    throw new Error('useAIAssistant must be used within AIAssistantProvider');
  }
  return context;
};

interface AIAssistantProviderProps {
  children: React.ReactNode;
  assets: Asset[];
  sites: Site[];
  employees: Employee[];
  vehicles: Vehicle[];
  onAction?: (action: AIResponse['suggestedAction']) => void;
}

export const AIAssistantProvider: React.FC<AIAssistantProviderProps> = ({
  children,
  assets,
  sites,
  employees,
  vehicles,
  onAction
}) => {
  const { currentUser } = useAuth();
  const { addAsset } = useAssets();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiService, setAiService] = useState<AIAssistantService | null>(null);

  // Initialize AI service with execution context
  useEffect(() => {
    if (currentUser?.role) {
      const executionContext: ActionExecutionContext = {
        addAsset: async (assetData) => {
          await addAsset(assetData as any);
          toast({
            title: "Asset Added",
            description: `${assetData.name} has been added to inventory.`,
          });
          return { ...assetData, id: Date.now().toString() } as Asset;
        },
        createWaybill: async (waybillData) => {
          // Trigger the onAction callback to open waybill form
          if (onAction) {
            onAction({
              type: 'open_form',
              data: { formType: 'waybill', prefillData: waybillData }
            });
          }
          return waybillData;
        },
        processReturn: async (returnData) => {
          // Trigger the onAction callback to open return form
          if (onAction) {
            onAction({
              type: 'open_form',
              data: { formType: 'return', prefillData: returnData }
            });
          }
          return returnData;
        },
        createSite: async (siteData) => {
          // Trigger the onAction callback to open site form
          if (onAction) {
            onAction({
              type: 'open_form',
              data: { formType: 'site', prefillData: siteData }
            });
          }
          return siteData;
        },
        updateAsset: async (id, updates) => {
          // This would need to be implemented in AssetsContext
          const asset = assets.find(a => a.id === id);
          if (!asset) throw new Error('Asset not found');
          return { ...asset, ...updates };
        }
      };

      const service = new AIAssistantService(
        currentUser.role,
        assets,
        sites,
        employees,
        vehicles,
        (errorMsg: string) => {
          // Show toast notification on LLM failure
          toast({
            title: "AI Assistant",
            description: errorMsg,
            variant: "default"
          });
        }
      );
      
      // Set execution context separately
      service.setExecutionContext(executionContext);
      setAiService(service);
    }
  }, [currentUser?.role, assets, sites, employees, vehicles, addAsset, onAction]);

  // Update AI service context when data changes
  useEffect(() => {
    if (aiService) {
      aiService.updateContext(assets, sites, employees, vehicles);
    }
  }, [assets, sites, employees, vehicles, aiService]);

  // Restore conversation history on mount
  useEffect(() => {
    if (aiService) {
      const history = aiService.getConversationHistory();
      if (history && history.length > 0) {
        // Convert conversation history to chat messages
        const chatMessages: ChatMessage[] = [];
        for (const msg of history) {
          chatMessages.push({
            id: msg.id,
            role: 'user',
            content: msg.userInput,
            timestamp: msg.timestamp,
            intent: msg.intent
          });
        }
        setMessages(chatMessages);
      }
    }
  }, [aiService]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || !aiService) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      // Process with AI
      const response = await aiService.processInput(content);

      // Add assistant response
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        intent: response.intent,
        suggestedAction: response.suggestedAction
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Show execution result if available
      if (response.executionResult?.success) {
        toast({
          title: "Action Executed",
          description: response.message,
        });
      } else if (response.executionResult?.error) {
        toast({
          title: "Execution Failed",
          description: response.executionResult.error,
          variant: "destructive"
        });
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const clearMessages = () => {
    setMessages([]);
  };

  const executeAction = (action: AIResponse['suggestedAction']) => {
    if (onAction) {
      onAction(action);
    }
  };

  const updateContext = (
    newAssets: Asset[],
    newSites: Site[],
    newEmployees: Employee[],
    newVehicles: Vehicle[]
  ) => {
    if (aiService) {
      aiService.updateContext(newAssets, newSites, newEmployees, newVehicles);
    }
  };

  return (
    <AIAssistantContext.Provider
      value={{
        messages,
        isProcessing,
        sendMessage,
        clearMessages,
        executeAction,
        updateContext
      }}
    >
      {children}
    </AIAssistantContext.Provider>
  );
};
