import { AIIntent, ConversationMessage } from './types';

export class ConversationMemory {
  private history: ConversationMessage[] = [];
  private maxHistory: number = 50; // Keep last 50 exchanges (increased from 10)
  private onMemoryFull?: () => void;

  constructor(onMemoryFull?: () => void) {
    this.onMemoryFull = onMemoryFull;
  }

  addMessage(userInput: string, intent: AIIntent): void {
    this.history.push({
      id: Date.now().toString(),
      userInput,
      intent,
      timestamp: new Date(),
      resolved: intent.missingParameters.length === 0
    });

    // Trim history if too long
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }

    // Notify if approaching limit (>80% full)
    if (this.onMemoryFull && this.history.length >= Math.ceil(this.maxHistory * 0.8)) {
      this.onMemoryFull();
    }
  }

  /**
   * Get the most recent message
   */
  getLastMessage(): ConversationMessage | null {
    return this.history.length > 0 ? this.history[this.history.length - 1] : null;
  }

  /**
   * Get recent messages (default: last 5)
   */
  getRecentMessages(count: number = 5): ConversationMessage[] {
    return this.history.slice(-count);
  }

  /**
   * Try to resolve missing parameters from conversation history
   */
  resolveFromHistory(missingParam: string): any {
    // Search backwards through history
    for (let i = this.history.length - 1; i >= 0; i--) {
      const msg = this.history[i];
      
      // Check if this parameter was present in a previous message
      if (msg.intent.parameters[missingParam] !== undefined) {
        return msg.intent.parameters[missingParam];
      }
      
      // Check related parameters (e.g., siteId when looking for siteName)
      if (missingParam === 'siteName' && msg.intent.parameters.siteName) {
        return msg.intent.parameters.siteName;
      }
      if (missingParam === 'siteId' && msg.intent.parameters.siteId) {
        return msg.intent.parameters.siteId;
      }
    }
    
    return null;
  }

  /**
   * Check if the current input is a follow-up to previous message
   */
  isFollowUp(currentInput: string): boolean {
    const lastMsg = this.getLastMessage();
    if (!lastMsg) return false;

    // Check for follow-up indicators
    const followUpPatterns = [
      /^(yes|yeah|yep|sure|ok|okay)/i,
      /^(no|nope|nah)/i,
      /^(more|another|add|also)/i,
      /^(\d+)/,  // Starting with a number (likely answering "how many?")
    ];

    return followUpPatterns.some(pattern => pattern.test(currentInput.trim()));
  }

  /**
   * Get the context from recent conversation for intent enhancement
   */
  getContextualHints(): {
    likelySiteId?: string;
    likelySiteName?: string;
    likelyAction?: string;
    recentItems?: Array<{ id: string; name: string }>;
  } {
    const recent = this.getRecentMessages(3);
    const hints: any = {};

    for (const msg of recent) {
      if (msg.intent.parameters.siteId && !hints.likelySiteId) {
        hints.likelySiteId = msg.intent.parameters.siteId;
        hints.likelySiteName = msg.intent.parameters.siteName;
      }
      if (msg.intent.action && !hints.likelyAction) {
        hints.likelyAction = msg.intent.action;
      }
      if (msg.intent.parameters.items && !hints.recentItems) {
        hints.recentItems = msg.intent.parameters.items;
      }
    }

    return hints;
  }

  /**
   * Clear conversation history
   */
  clear(): void {
    this.history = [];
    this.clearFromStorage();
  }

  /**
   * Get full history
   */
  getHistory(): ConversationMessage[] {
    return [...this.history];
  }

  /**
   * Save conversation to localStorage
   */
  saveToStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('ai_conversation_history', JSON.stringify(this.history));
      }
    } catch (err) {
      console.warn('Failed to save conversation to localStorage', err);
    }
  }

  /**
   * Restore conversation from localStorage
   */
  restoreFromStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem('ai_conversation_history');
        if (stored) {
          this.history = JSON.parse(stored);
          // Ensure timestamps are Date objects
          this.history = this.history.map(msg => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
        }
      }
    } catch (err) {
      console.warn('Failed to restore conversation from localStorage', err);
    }
  }

  /**
   * Clear conversation from localStorage
   */
  clearFromStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('ai_conversation_history');
      }
    } catch (err) {
      console.warn('Failed to clear conversation from localStorage', err);
    }
  }
}