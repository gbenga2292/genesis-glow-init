import { UserRole } from '@/contexts/AuthContext';
import { Asset, Site, Employee, Vehicle } from '@/types/asset';

export interface AIIntent {
  action: 'create_waybill' | 'add_asset' | 'process_return' | 'create_site' | 
          'add_employee' | 'add_vehicle' | 'generate_report' | 'view_analytics' |
          'send_to_site' | 'check_inventory' | 'update_asset' | 'unknown';
  confidence: number;
  parameters: Record<string, any>;
  missingParameters: string[];
  extractedEntities?: {
    sites?: Array<{ match: Site; score: number }>;
    assets?: Array<{ match: Asset; score: number }>;
    employees?: Array<{ match: Employee; score: number }>;
    vehicles?: Array<{ match: Vehicle; score: number }>;
  };
}

export interface AIResponse {
  success: boolean;
  message: string;
  intent?: AIIntent;
  suggestedAction?: {
    type: 'open_form' | 'execute_action' | 'clarify';
    data?: any;
  };
  executionResult?: {
    success: boolean;
    data?: any;
    error?: string;
  };
}

export interface ConversationMessage {
  id: string;
  userInput: string;
  intent: AIIntent;
  timestamp: Date;
  resolved: boolean;
}

export interface AIContext {
  assets: Asset[];
  sites: Site[];
  employees: Employee[];
  vehicles: Vehicle[];
  userRole: UserRole;
}

export interface ActionExecutionContext {
  addAsset: (asset: any) => Promise<Asset>;
  createWaybill: (waybill: any) => Promise<any>;
  processReturn: (returnData: any) => Promise<any>;
  createSite: (site: any) => Promise<Site>;
  updateAsset: (id: string, updates: Partial<Asset>) => Promise<Asset>;
}

export interface ExtractedItem {
  id: string;
  name: string;
  quantity?: number;
  confidence?: number;
}

export interface FuzzyMatchResult<T> {
  item: T;
  score: number;
  matches: Array<{ key: string; value: string }>;
}
