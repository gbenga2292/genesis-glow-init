export interface ParsedIntent {
  action: string;
  confidence: number;
  parameters: Record<string, any>;
  missingParameters: string[];
}

/**
 * Basic runtime validator for LLM-produced intent JSON.
 * Returns the parsed object if valid, otherwise null.
 */
export function validateIntentJson(raw: any): ParsedIntent | null {
  if (!raw || typeof raw !== 'object') return null;
  const { action, confidence, parameters, missingParameters } = raw as any;
  if (typeof action !== 'string') return null;
  if (typeof confidence !== 'number' || Number.isNaN(confidence) || confidence < 0 || confidence > 1) return null;
  if (parameters === undefined || typeof parameters !== 'object') return null;
  if (!Array.isArray(missingParameters)) return null;
  // All good
  return {
    action,
    confidence,
    parameters,
    missingParameters
  };
}
