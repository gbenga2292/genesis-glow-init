import nlp from 'compromise';
import { AIIntent, AIContext } from './types';
import { matchesActionSynonym } from './synonyms';
import { EntityExtractor } from './entityExtraction';
import { ConversationMemory } from './conversationMemory';

export class IntentRecognizer {
  constructor(
    private context: AIContext,
    private entityExtractor: EntityExtractor,
    private conversationMemory: ConversationMemory
  ) {}

  /**
   * Identify the user's intent from their input
   */
  identifyIntent(userInput: string): AIIntent {
    const doc = nlp(userInput.toLowerCase());
    const text = userInput.toLowerCase();

    // Check if this is a follow-up message
    const isFollowUp = this.conversationMemory.isFollowUp(userInput);
    const contextHints = this.conversationMemory.getContextualHints();

    // Try to match each intent type
    if (this.isWaybillIntent(text)) {
      return this.parseWaybillIntent(text, doc, contextHints);
    }

    if (this.isAssetIntent(text)) {
      return this.parseAssetIntent(text, doc);
    }

    if (this.isReturnIntent(text)) {
      return this.parseReturnIntent(text, contextHints);
    }

    if (this.isSiteIntent(text)) {
      return this.parseSiteIntent(text);
    }

    if (this.isInventoryCheckIntent(text)) {
      return this.parseInventoryCheckIntent(text);
    }

    if (this.isAnalyticsIntent(text)) {
      return this.parseAnalyticsIntent(text);
    }

    // If follow-up, try to infer from context
    if (isFollowUp && contextHints.likelyAction) {
      return this.handleFollowUp(userInput, contextHints);
    }

    return {
      action: 'unknown',
      confidence: 0,
      parameters: {},
      missingParameters: []
    };
  }

  private isWaybillIntent(text: string): boolean {
    return matchesActionSynonym(text, 'create_waybill');
  }

  private isAssetIntent(text: string): boolean {
    return matchesActionSynonym(text, 'add_asset');
  }

  private isReturnIntent(text: string): boolean {
    return matchesActionSynonym(text, 'process_return');
  }

  private isSiteIntent(text: string): boolean {
    return matchesActionSynonym(text, 'create_site');
  }

  private isInventoryCheckIntent(text: string): boolean {
    return matchesActionSynonym(text, 'check_inventory');
  }

  private isAnalyticsIntent(text: string): boolean {
    return matchesActionSynonym(text, 'view_analytics');
  }

  private parseWaybillIntent(text: string, doc: any, contextHints: any): AIIntent {
    const parameters: Record<string, any> = {};
    const missingParameters: string[] = [];

    // Extract site
    const siteMatch = this.entityExtractor.findSiteInText(text);
    if (siteMatch) {
      parameters.siteName = siteMatch.site.name;
      parameters.siteId = siteMatch.site.id;
    } else if (contextHints.likelySiteId) {
      // Use from context
      parameters.siteId = contextHints.likelySiteId;
      parameters.siteName = contextHints.likelySiteName;
    } else {
      missingParameters.push('site');
    }

    // Extract items (supports multiple items)
    const items = this.entityExtractor.parseMultipleItems(text);
    if (items.length > 0) {
      parameters.items = items;
    } else {
      missingParameters.push('items');
    }

    // Extract employee
    const employeeMatch = this.entityExtractor.findEmployeeInText(text);
    if (employeeMatch) {
      parameters.driver = employeeMatch.employee.name;
      parameters.driverId = employeeMatch.employee.id;
    }

    // Extract vehicle
    const vehicleMatch = this.entityExtractor.findVehicleInText(text);
    if (vehicleMatch) {
      parameters.vehicle = vehicleMatch.vehicle.registration_number || vehicleMatch.vehicle.name;
      parameters.vehicleId = vehicleMatch.vehicle.id;
    }

    // Extract purpose
    const purpose = this.entityExtractor.extractPurpose(text);
    if (purpose) {
      parameters.purpose = purpose;
    }

    const confidence = this.calculateConfidence('create_waybill', parameters, missingParameters);

    return {
      action: 'create_waybill',
      confidence,
      parameters,
      missingParameters
    };
  }

  private parseAssetIntent(text: string, doc: any): AIIntent {
    const parameters: Record<string, any> = {};
    const missingParameters: string[] = [];

    // Extract asset name
    const nameMatch = text.match(/(?:add|create|new)\s+(?:asset\s+)?["']?([^"',0-9]+?)["']?\s*(?:\d|$)/i);
    if (nameMatch) {
      parameters.name = nameMatch[1].trim();
    } else {
      // Try to extract from known assets
      const assets = this.entityExtractor.findAssetsInText(text);
      if (assets.length > 0) {
        parameters.name = assets[0].name;
      } else {
        missingParameters.push('name');
      }
    }

    // Extract quantity
    const numbers = this.entityExtractor.extractNumbers(text);
    if (numbers.length > 0) {
      parameters.quantity = numbers[0];
    } else {
      missingParameters.push('quantity');
    }

    // Extract unit
    const unit = this.entityExtractor.extractUnit(text);
    if (unit) {
      parameters.unit = unit;
    }

    // Extract type
    if (text.includes('consumable')) {
      parameters.type = 'consumable';
    } else if (text.includes('equipment')) {
      parameters.type = 'equipment';
    } else if (text.includes('tool')) {
      parameters.type = 'tools';
    }

    const confidence = this.calculateConfidence('add_asset', parameters, missingParameters);

    return {
      action: 'add_asset',
      confidence,
      parameters,
      missingParameters
    };
  }

  private parseReturnIntent(text: string, contextHints: any): AIIntent {
    const parameters: Record<string, any> = {};
    const missingParameters: string[] = [];

    // Extract site
    const siteMatch = this.entityExtractor.findSiteInText(text);
    if (siteMatch) {
      parameters.siteName = siteMatch.site.name;
      parameters.siteId = siteMatch.site.id;
    } else if (contextHints.likelySiteId) {
      parameters.siteId = contextHints.likelySiteId;
      parameters.siteName = contextHints.likelySiteName;
    } else {
      missingParameters.push('site');
    }

    // Extract items
    const items = this.entityExtractor.findAssetsInText(text);
    if (items.length > 0) {
      parameters.items = items;
    }

    const confidence = this.calculateConfidence('process_return', parameters, missingParameters);

    return {
      action: 'process_return',
      confidence,
      parameters,
      missingParameters
    };
  }

  private parseSiteIntent(text: string): AIIntent {
    const parameters: Record<string, any> = {};
    const missingParameters: string[] = [];

    // Extract site name
    const nameMatch = text.match(/(?:site|location)\s+(?:called\s+)?["']?([^"',]+?)["']?(?:\s+at|\s+located|$)/i);
    if (nameMatch) {
      parameters.name = nameMatch[1].trim();
    } else {
      missingParameters.push('name');
    }

    // Extract address
    const addressMatch = text.match(/(?:at|address|located at)\s+(.+?)(?:\.|$)/i);
    if (addressMatch) {
      parameters.address = addressMatch[1].trim();
    }

    const confidence = this.calculateConfidence('create_site', parameters, missingParameters);

    return {
      action: 'create_site',
      confidence,
      parameters,
      missingParameters
    };
  }

  private parseInventoryCheckIntent(text: string): AIIntent {
    const parameters: Record<string, any> = {};

    // Check for specific asset
    const assets = this.entityExtractor.findAssetsInText(text);
    if (assets.length > 0) {
      parameters.assetName = assets[0].name;
      parameters.assetId = assets[0].id;
    }

    // Check for specific site
    const siteMatch = this.entityExtractor.findSiteInText(text);
    if (siteMatch) {
      parameters.siteName = siteMatch.site.name;
      parameters.siteId = siteMatch.site.id;
    }

    return {
      action: 'check_inventory',
      confidence: 0.9,
      parameters,
      missingParameters: []
    };
  }

  private parseAnalyticsIntent(text: string): AIIntent {
    const parameters: Record<string, any> = {};

    // Check for type
    if (text.includes('consumable')) {
      parameters.type = 'consumable';
    } else if (text.includes('equipment') || text.includes('machine')) {
      parameters.type = 'equipment';
    } else if (text.includes('site')) {
      parameters.type = 'site';
    }

    // Check for site
    const siteMatch = this.entityExtractor.findSiteInText(text);
    if (siteMatch) {
      parameters.siteName = siteMatch.site.name;
      parameters.siteId = siteMatch.site.id;
    }

    return {
      action: 'view_analytics',
      confidence: 0.85,
      parameters,
      missingParameters: []
    };
  }

  private handleFollowUp(userInput: string, contextHints: any): AIIntent {
    // If user just typed a number, assume it's a quantity
    const numbers = this.entityExtractor.extractNumbers(userInput);
    if (numbers.length > 0 && userInput.trim().match(/^\d+$/)) {
      return {
        action: contextHints.likelyAction || 'unknown',
        confidence: 0.7,
        parameters: { quantity: numbers[0] },
        missingParameters: []
      };
    }

    // If user said yes/ok, continue with previous action
    if (/^(yes|yeah|yep|sure|ok|okay)/i.test(userInput.trim())) {
      return {
        action: contextHints.likelyAction || 'unknown',
        confidence: 0.8,
        parameters: {},
        missingParameters: []
      };
    }

    return {
      action: 'unknown',
      confidence: 0,
      parameters: {},
      missingParameters: []
    };
  }

  /**
   * Calculate actual confidence based on matched parameters
   */
  private calculateConfidence(action: string, parameters: any, missingParameters: string[]): number {
    let confidence = 0.5; // Base confidence

    // Boost for having all required parameters
    const requiredParams = this.getRequiredParameters(action);
    const foundRequired = requiredParams.filter(p => parameters[p] !== undefined).length;
    const requiredRatio = requiredParams.length > 0 ? foundRequired / requiredParams.length : 1;
    confidence += requiredRatio * 0.3;

    // Boost for having optional parameters
    const optionalParams = this.getOptionalParameters(action);
    const foundOptional = optionalParams.filter(p => parameters[p] !== undefined).length;
    if (optionalParams.length > 0) {
      confidence += (foundOptional / optionalParams.length) * 0.2;
    }

    return Math.min(confidence, 1.0);
  }

  private getRequiredParameters(action: string): string[] {
    const requiredMap: Record<string, string[]> = {
      create_waybill: ['siteId', 'items'],
      add_asset: ['name', 'quantity'],
      process_return: ['siteId'],
      create_site: ['name'],
      check_inventory: [],
      view_analytics: []
    };
    return requiredMap[action] || [];
  }

  private getOptionalParameters(action: string): string[] {
    const optionalMap: Record<string, string[]> = {
      create_waybill: ['driverId', 'vehicleId', 'purpose'],
      add_asset: ['unit', 'type'],
      process_return: ['items'],
      create_site: ['address'],
      check_inventory: ['assetId', 'siteId'],
      view_analytics: ['type', 'siteId']
    };
    return optionalMap[action] || [];
  }
}
