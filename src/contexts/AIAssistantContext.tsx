import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AIResponse, AIIntent, AIAssistantService } from '@/services/aiAssistant';
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
  const aiServiceRef = useRef<AIAssistantService | null>(null);

  // Initialize AI service
  useEffect(() => {
    if (!aiServiceRef.current && currentUser) {
      aiServiceRef.current = new AIAssistantService(
        currentUser.role,
        assets,
        sites,
        employees,
        vehicles,
        (error) => {
          // Only show toast for non-API key related errors to reduce noise
          if (!error.includes('API key') && !error.includes('Authentication failed')) {
            console.warn('AI Service Error:', error);
            toast({
              title: "AI Assistant",
              description: error,
              variant: "default"
            });
          } else {
            console.warn('AI Service Error (suppressed):', error);
          }
        }
      );

      // Set execution context for actual action execution
      aiServiceRef.current.setExecutionContext({
        addAsset: async (assetData) => {
          await addAsset(assetData);
          // Return the asset with a temporary ID (the actual asset will be in the database)
          return { ...assetData, id: Date.now().toString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as Asset;
        },
        createWaybill: async (waybillData) => {
          // This will be handled through onAction callback
          if (onAction) {
            onAction({
              type: 'open_form',
              data: { formType: 'create_waybill', prefillData: waybillData }
            });
          }
          return waybillData;
        },
        processReturn: async (returnData) => {
          if (onAction) {
            onAction({
              type: 'open_form',
              data: { formType: 'process_return', prefillData: returnData }
            });
          }
          return returnData;
        },
        createSite: async (siteData) => {
          if (onAction) {
            onAction({
              type: 'open_form',
              data: { formType: 'create_site', prefillData: siteData }
            });
          }
          return siteData;
        },
        updateAsset: async (id, updates) => {
          // Use the database API to update asset
          if (window.db && window.db.updateAsset) {
            await window.db.updateAsset(id, updates);
          }
          return { ...updates, id } as Asset;
        }
      });

      console.log('AI Assistant Service initialized with execution context');
    }
  }, [currentUser, assets, sites, employees, vehicles, addAsset, onAction]);

  // Update context when data changes
  useEffect(() => {
    if (aiServiceRef.current) {
      aiServiceRef.current.updateContext(assets, sites, employees, vehicles);
    }
  }, [assets, sites, employees, vehicles]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || !aiServiceRef.current) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      // Process input through the AI service
      const response: AIResponse = await aiServiceRef.current.processInput(content);

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        intent: response.intent,
        suggestedAction: response.suggestedAction
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Execute suggested action if provided
      if (response.suggestedAction && onAction) {
        if (response.suggestedAction.type === 'open_form') {
          onAction(response.suggestedAction);
        } else if (response.suggestedAction.type === 'execute_action') {
          onAction(response.suggestedAction);
        }
      }

      // Show success/error toast for execution results
      if (response.executionResult) {
        if (response.executionResult.success) {
          toast({
            title: "Action completed",
            description: response.message,
          });
        } else {
          toast({
            title: "Action failed",
            description: response.executionResult.error || "An error occurred",
            variant: "destructive"
          });
        }
      }

    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
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
    if (aiServiceRef.current) {
      aiServiceRef.current.updateContext(newAssets, newSites, newEmployees, newVehicles);
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

