/**
 * Prompt templates for asking the local model to output structured JSON
 */
export function buildIntentExtractionPrompt(userInput: string, hintData: { sites?: string[]; assets?: string[] } = {}) {
  const availableSites = hintData.sites && hintData.sites.length > 0 ? `Available sites: ${hintData.sites.join(', ')}.` : '';
  const availableAssets = hintData.assets && hintData.assets.length > 0 ? `Available assets: ${hintData.assets.join(', ')}.` : '';

  return `You are an offline assistant for an inventory system. Given the user's input, output ONLY a single valid JSON object matching this schema:
{
  "action": string, // one of create_waybill, add_asset, process_return, create_site, add_employee, add_vehicle, generate_report, view_analytics, send_to_site, check_inventory, update_asset, unknown
  "confidence": number, // between 0 and 1
  "parameters": object, // key/value map of extracted parameters using canonical keys (siteId, siteName, items, name, quantity, unit, driverId, vehicleId, etc.)
  "missingParameters": array // list of parameter keys that are missing and required
}

Only return the JSON object and nothing else (no explanation). Be concise and deterministic.

${availableSites}
${availableAssets}

User input: "${userInput.replace(/"/g, '\\"')}"
`;
}
