import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useAIAssistant } from '@/contexts/AIAssistantContext';
import { Bot, User, Send, Loader2, Trash2, Sparkles, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export const AIAssistantChat: React.FC = () => {
  const { messages, isProcessing, sendMessage, clearMessages, executeAction } = useAIAssistant();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAIEnabled, setIsAIEnabled] = useState(true);

  // Check if AI is enabled in company settings
  useEffect(() => {
    const checkAIStatus = async () => {
      try {
        if (window.electronAPI && window.electronAPI.db && window.electronAPI.db.getCompanySettings) {
          const settings = await window.electronAPI.db.getCompanySettings();
          const remoteConfig = (settings as any)?.ai?.remote;
          const r = remoteConfig?.enabled;
          const enabled = !!r && r !== 'false' && r !== '0';
          setIsAIEnabled(enabled);
        }
      } catch (error) {
        console.error('Failed to check AI status:', error);
      }
    };
    checkAIStatus();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const messageToSend = input;
    setInput('');
    await sendMessage(messageToSend);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getIntentBadge = (action?: string) => {
    if (!action) return null;

    const actionMap: Record<string, { label: string; variant: any }> = {
      create_waybill: { label: 'Create Waybill', variant: 'default' },
      add_asset: { label: 'Add Asset', variant: 'default' },
      process_return: { label: 'Process Return', variant: 'secondary' },
      check_inventory: { label: 'Check Inventory', variant: 'outline' },
      view_analytics: { label: 'View Analytics', variant: 'outline' },
      create_site: { label: 'Create Site', variant: 'default' },
    };

    const config = actionMap[action] || { label: action, variant: 'outline' };

    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    );
  };

  return (
    <Card className="flex flex-col h-full max-h-full border-0 shadow-soft overflow-hidden">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                AI Assistant
                <Sparkles className="h-4 w-4 text-primary" />
              </CardTitle>
              <CardDescription className="text-xs">
                Offline natural language task execution
              </CardDescription>
            </div>
          </div>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearMessages}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        <ScrollArea className="flex-1 h-0 p-4">
          <div className="space-y-4">
            {!isAIEnabled && (
              <div className="text-center py-12">
                <Bot className="h-16 w-16 mx-auto mb-4 opacity-20 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground mb-2">AI Assistant is Disabled</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  The AI Assistant has been turned off. To enable it, go to <strong>Settings → AI Assistant</strong> and toggle "Enable AI Assistant" on.
                </p>
              </div>
            )}

            {isAIEnabled && messages.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Bot className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="text-sm">Start by asking me to help you with tasks...</p>
                <div className="mt-6 space-y-2 text-xs text-left max-w-sm mx-auto">
                  <p className="font-medium">Try saying:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>"Create a waybill for Site A with 5 water pumps"</li>
                    <li>"Add 10 bags of cement to inventory"</li>
                    <li>"Check inventory levels"</li>
                    <li>"Process return from Site B"</li>
                    <li>"Show analytics for equipment"</li>
                  </ul>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-3 animate-fade-in',
                  message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                )}
              >
                <div className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}>
                  {message.role === 'user' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>

                <div className={cn(
                  'flex-1 space-y-2',
                  message.role === 'user' ? 'items-end' : 'items-start'
                )}>
                  <div className={cn(
                    'rounded-lg px-4 py-3 max-w-[85%] shadow-sm',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground ml-auto'
                      : 'bg-muted'
                  )}>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>

                  {message.intent && message.role === 'assistant' && (
                    <div className="flex items-center gap-2 px-2">
                      {getIntentBadge(message.intent.action)}
                      {message.intent.confidence && (
                        <span className="text-xs text-muted-foreground">
                          {Math.round(message.intent.confidence * 100)}% confidence
                        </span>
                      )}
                    </div>
                  )}

                  {message.suggestedAction && message.role === 'assistant' && (
                    <div className="px-2">
                      <Button
                        size="sm"
                        onClick={() => executeAction(message.suggestedAction)}
                        className="gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        {message.suggestedAction.type === 'open_form'
                          ? 'Open Form'
                          : 'Execute Action'}
                      </Button>
                    </div>
                  )}

                  <div className={cn(
                    'text-xs text-muted-foreground px-2',
                    message.role === 'user' ? 'text-right' : 'text-left'
                  )}>
                    {message.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            ))}

            {isProcessing && (
              <div className="flex gap-3 animate-fade-in">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-muted rounded-lg px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}

            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <div className="border-t p-4">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isAIEnabled ? "Ask me to create waybills, add assets, check inventory..." : "AI Assistant is disabled"}
              disabled={isProcessing || !isAIEnabled}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isProcessing || !isAIEnabled}
              size="icon"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            {isAIEnabled ? "All processing happens offline on your device" : "Enable AI in Settings to use this feature"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
