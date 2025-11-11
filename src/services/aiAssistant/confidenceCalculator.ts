import { AIIntent } from './types';

export class ConfidenceCalculator {
  /**
   * Calculate confidence score for an intent based on multiple factors
   */
  calculateConfidence(intent: AIIntent): number {
    let score = 0.4; // Base score

    // Factor 1: Action identification (20%)
    if (intent.action !== 'unknown') {
      score += 0.2;
    }

    // Factor 2: Required parameters filled (30%)
    const requiredFilled = this.getRequiredParametersFillRatio(intent);
    score += requiredFilled * 0.3;

    // Factor 3: Optional parameters filled (10%)
    const optionalFilled = this.getOptionalParametersFillRatio(intent);
    score += optionalFilled * 0.1;

    // Factor 4: Entity extraction confidence (20%)
    const entityConfidence = this.getEntityConfidence(intent);
    score += entityConfidence * 0.2;

    // Factor 5: Missing parameters penalty (-20%)
    const missingRatio = intent.missingParameters.length > 0 ? 
      intent.missingParameters.length / 5 : 0; // Normalize by typical max of 5 params
    score -= Math.min(missingRatio, 0.2);

    return Math.max(0, Math.min(1, score));
  }

  private getRequiredParametersFillRatio(intent: AIIntent): number {
    const requiredParams = this.getRequiredParameters(intent.action);
    if (requiredParams.length === 0) return 1.0;

    const filled = requiredParams.filter(p => intent.parameters[p] !== undefined).length;
    return filled / requiredParams.length;
  }

  private getOptionalParametersFillRatio(intent: AIIntent): number {
    const optionalParams = this.getOptionalParameters(intent.action);
    if (optionalParams.length === 0) return 1.0;

    const filled = optionalParams.filter(p => intent.parameters[p] !== undefined).length;
    return filled / optionalParams.length;
  }

  private getEntityConfidence(intent: AIIntent): number {
    if (!intent.extractedEntities) return 0.5;

    const entities = intent.extractedEntities;
    const confidences: number[] = [];

    if (entities.sites && entities.sites.length > 0) {
      confidences.push(entities.sites[0].score);
    }
    if (entities.assets && entities.assets.length > 0) {
      const avgAssetConfidence = entities.assets.reduce((sum, a) => sum + a.score, 0) / entities.assets.length;
      confidences.push(avgAssetConfidence);
    }
    if (entities.employees && entities.employees.length > 0) {
      confidences.push(entities.employees[0].score);
    }
    if (entities.vehicles && entities.vehicles.length > 0) {
      confidences.push(entities.vehicles[0].score);
    }

    return confidences.length > 0 ? 
      confidences.reduce((sum, c) => sum + c, 0) / confidences.length : 
      0.5;
  }

  private getRequiredParameters(action: AIIntent['action']): string[] {
    const map: Record<string, string[]> = {
      create_waybill: ['siteId', 'items'],
      add_asset: ['name', 'quantity'],
      process_return: ['siteId'],
      create_site: ['name'],
      check_inventory: [],
      view_analytics: []
    };
    return map[action] || [];
  }

  private getOptionalParameters(action: AIIntent['action']): string[] {
    const map: Record<string, string[]> = {
      create_waybill: ['driverId', 'vehicleId', 'purpose'],
      add_asset: ['unit', 'type'],
      process_return: ['items'],
      create_site: ['address'],
      check_inventory: ['assetId', 'siteId'],
      view_analytics: ['type', 'siteId']
    };
    return map[action] || [];
  }
}
