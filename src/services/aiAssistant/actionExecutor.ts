import { AIIntent, AIResponse, ActionExecutionContext, AIContext } from './types';
import { Asset } from '@/types/asset';

export class ActionExecutor {
  constructor(
    private context: AIContext,
    private executionContext?: ActionExecutionContext
  ) {}

  /**
   * Execute an action based on intent
   */
  async executeAction(intent: AIIntent): Promise<AIResponse> {
    if (!this.executionContext) {
      return this.generateFormSuggestion(intent);
    }

    try {
      switch (intent.action) {
        case 'add_asset':
          return await this.executeAddAsset(intent);
        
        case 'create_waybill':
          return await this.executeCreateWaybill(intent);
        
        case 'process_return':
          return await this.executeProcessReturn(intent);
        
        case 'create_site':
          return await this.executeCreateSite(intent);
        
        case 'check_inventory':
          return this.executeCheckInventory(intent);
        
        case 'view_analytics':
          return this.executeViewAnalytics(intent);
        
        default:
          return this.generateFormSuggestion(intent);
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to execute action: ${error instanceof Error ? error.message : 'Unknown error'}`,
        intent,
        executionResult: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  private async executeAddAsset(intent: AIIntent): Promise<AIResponse> {
    if (!this.executionContext?.addAsset) {
      return this.generateFormSuggestion(intent);
    }

    const { name, quantity, unit, type } = intent.parameters;

    // Check for missing critical parameters
    if (!name) {
      return {
        success: false,
        message: "I need to know which asset you'd like to add. What's the name?",
        intent,
        suggestedAction: { type: 'clarify' }
      };
    }

    if (!quantity) {
      return {
        success: false,
        message: `How many units of ${name} would you like to add?`,
        intent,
        suggestedAction: { type: 'clarify' }
      };
    }

    // Show confirmation before executing
    const confirmationMessage = `📋 **Confirm Asset Addition:**\n\n` +
      `• Asset: ${name}\n` +
      `• Quantity: ${quantity} ${unit || 'units'}\n` +
      `• Category: ${type || 'equipment'}\n\n` +
      `Should I proceed with adding this to inventory?`;

    const newAsset: any = {
      name,
      quantity: quantity || 0,
      unitOfMeasurement: unit || 'units',
      category: type || 'equipment',
      type: type || 'equipment',
      description: `Added via AI assistant`,
      siteQuantities: {},
      availableQuantity: quantity || 0
    };

    // Execute with confirmation action
    try {
      const createdAsset = await this.executionContext.addAsset(newAsset);

      return {
        success: true,
        message: `✅ Successfully added ${quantity} ${unit || 'units'} of ${name} to inventory!`,
        intent,
        executionResult: {
          success: true,
          data: createdAsset
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to add asset: ${error instanceof Error ? error.message : 'Unknown error'}`,
        intent,
        executionResult: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  private async executeCreateWaybill(intent: AIIntent): Promise<AIResponse> {
    if (!this.executionContext?.createWaybill) {
      return this.generateFormSuggestion(intent);
    }

    const { siteId, siteName, items, driverId, vehicleId, purpose } = intent.parameters;

    // Check for missing critical parameters
    if (!siteName && !siteId) {
      return {
        success: false,
        message: "Which site should this waybill go to?",
        intent,
        suggestedAction: { type: 'clarify' }
      };
    }

    if (!items || items.length === 0) {
      return {
        success: false,
        message: `What items should be included in the waybill for ${siteName}?`,
        intent,
        suggestedAction: { type: 'clarify' }
      };
    }

    if (!driverId && !vehicleId) {
      return {
        success: false,
        message: `Who will be driving this waybill to ${siteName}? (driver or vehicle required)`,
        intent,
        suggestedAction: { type: 'clarify' }
      };
    }

    const waybillData = {
      siteId,
      siteName,
      items: items || [],
      driverId,
      vehicleId,
      purpose: purpose || 'Asset transfer',
      date: new Date().toISOString(),
      status: 'pending'
    };

    const itemSummary = items.map((i: any) => `${i.quantity || 1}x ${i.name}`).join(', ');

    try {
      const createdWaybill = await this.executionContext.createWaybill(waybillData);

      return {
        success: true,
        message: `✅ Waybill created for ${siteName}! Sending: ${itemSummary}`,
        intent,
        suggestedAction: {
          type: 'execute_action',
          data: {
            action: 'view_waybill',
            waybillId: createdWaybill.id
          }
        },
        executionResult: {
          success: true,
          data: createdWaybill
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create waybill: ${error instanceof Error ? error.message : 'Unknown error'}`,
        intent,
        executionResult: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  private async executeProcessReturn(intent: AIIntent): Promise<AIResponse> {
    if (!this.executionContext?.processReturn) {
      return this.generateFormSuggestion(intent);
    }

    const { siteId, siteName, items } = intent.parameters;

    // Check for missing critical parameters
    if (!siteName && !siteId) {
      return {
        success: false,
        message: "Which site is this return from?",
        intent,
        suggestedAction: { type: 'clarify' }
      };
    }

    if (!items || items.length === 0) {
      return {
        success: false,
        message: `What items are being returned from ${siteName}?`,
        intent,
        suggestedAction: { type: 'clarify' }
      };
    }

    const returnData = {
      siteId,
      siteName,
      items: items || [],
      date: new Date().toISOString(),
      status: 'pending'
    };

    const itemSummary = items.map((i: any) => `${i.quantity || 1}x ${i.name}`).join(', ');

    try {
      const processedReturn = await this.executionContext.processReturn(returnData);

      return {
        success: true,
        message: `✅ Return from ${siteName} has been processed!\n📦 Items: ${itemSummary}`,
        intent,
        executionResult: {
          success: true,
          data: processedReturn
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to process return: ${error instanceof Error ? error.message : 'Unknown error'}`,
        intent,
        executionResult: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  private async executeCreateSite(intent: AIIntent): Promise<AIResponse> {
    if (!this.executionContext?.createSite) {
      return this.generateFormSuggestion(intent);
    }

    const { name, address } = intent.parameters;

    // Check for missing critical parameters
    if (!name) {
      return {
        success: false,
        message: "What should the site be called?",
        intent,
        suggestedAction: { type: 'clarify' }
      };
    }

    const siteData = {
      name,
      address: address || '',
      status: 'active',
      createdAt: new Date().toISOString()
    };

    try {
      const createdSite = await this.executionContext.createSite(siteData);

      return {
        success: true,
        message: `✅ Site "${name}" has been created successfully!${address ? `\n📍 Address: ${address}` : ''}`,
        intent,
        executionResult: {
          success: true,
          data: createdSite
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create site: ${error instanceof Error ? error.message : 'Unknown error'}`,
        intent,
        executionResult: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  private executeCheckInventory(intent: AIIntent): AIResponse {
    const { assetId, assetName, siteId, siteName } = intent.parameters;
    let message = '';

    if (assetId) {
      const asset = this.context.assets.find(a => a.id === assetId);
      if (asset) {
        message = `📦 ${asset.name}: ${asset.quantity} ${asset.unitOfMeasurement} in stock`;
        if (asset.availableQuantity !== undefined) {
          message += ` (${asset.availableQuantity} available)`;
        }
        if (siteId && asset.siteQuantities) {
          const siteQty = asset.siteQuantities[String(siteId)];
          if (siteQty !== undefined) {
            message += `\n📍 ${siteQty} at ${siteName}`;
          }
        }
      } else {
        message = `❌ Asset not found: ${assetName}`;
      }
    } else if (siteId) {
      const siteAssets = this.context.assets.filter(a => 
        a.siteQuantities && a.siteQuantities[String(siteId)] > 0
      );
      message = `📍 ${siteName} has ${siteAssets.length} different items:\n\n`;
      message += siteAssets.slice(0, 10).map(a => 
        `• ${a.name}: ${a.siteQuantities![String(siteId)]}`
      ).join('\n');
      if (siteAssets.length > 10) {
        message += `\n... and ${siteAssets.length - 10} more`;
      }
    } else {
      const totalAssets = this.context.assets.length;
      const totalQty = this.context.assets.reduce((sum, a) => sum + a.quantity, 0);
      const lowStock = this.context.assets.filter(a => a.quantity > 0 && a.quantity < 10).length;
      const outOfStock = this.context.assets.filter(a => a.quantity === 0).length;

      message = `📊 Inventory Summary:\n\n`;
      message += `• Total items: ${totalAssets}\n`;
      message += `• Total units: ${totalQty}\n`;
      if (lowStock > 0) message += `⚠️ Low stock: ${lowStock} items\n`;
      if (outOfStock > 0) message += `❌ Out of stock: ${outOfStock} items`;
    }

    return {
      success: true,
      message,
      intent
    };
  }

  private executeViewAnalytics(intent: AIIntent): AIResponse {
    const { type, siteName } = intent.parameters;

    return {
      success: true,
      message: `📊 Opening ${type || 'general'} analytics${siteName ? ` for ${siteName}` : ''}...`,
      intent,
      suggestedAction: {
        type: 'execute_action',
        data: {
          action: 'open_analytics',
          analyticsType: type,
          siteId: intent.parameters.siteId
        }
      }
    };
  }

  private generateFormSuggestion(intent: AIIntent): AIResponse {
    const formTypeMap: Record<string, string> = {
      create_waybill: 'waybill',
      add_asset: 'asset',
      process_return: 'return',
      create_site: 'site'
    };

    const formType = formTypeMap[intent.action];

    if (!formType) {
      return {
        success: false,
        message: "I'm not sure how to help with that. Can you rephrase?",
        intent
      };
    }

    const actionName = intent.action.replace(/_/g, ' ');
    const siteName = intent.parameters.siteName;
    const assetName = intent.parameters.name;

    let message = `I'll help you ${actionName}`;
    if (siteName) message += ` for ${siteName}`;
    if (assetName) message += ` ${assetName}`;
    message += '.';

    return {
      success: true,
      message,
      intent,
      suggestedAction: {
        type: 'open_form',
        data: {
          formType,
          prefillData: intent.parameters
        }
      }
    };
  }
}
