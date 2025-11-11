export const actionSynonyms: Record<string, string[]> = {
  // Waybill creation
  'create_waybill': [
    'create waybill', 'new waybill', 'make waybill', 'generate waybill',
    'send', 'dispatch', 'transfer', 'ship', 'deliver', 'send to',
    'dispatch to', 'transfer to', 'ship to', 'deliver to'
  ],
  
  // Asset management
  'add_asset': [
    'add asset', 'new asset', 'create asset', 'make asset',
    'add item', 'new item', 'create item', 'register item',
    'add inventory', 'add stock', 'add material', 'add equipment'
  ],
  
  // Returns
  'process_return': [
    'process return', 'return from', 'receive back', 'get back',
    'return items', 'receive items', 'accept return', 'handle return'
  ],
  
  // Site management
  'create_site': [
    'create site', 'new site', 'add site', 'make site',
    'register site', 'add location', 'new location', 'create location'
  ],
  
  // Inventory checks
  'check_inventory': [
    'check inventory', 'show inventory', 'view inventory', 'list inventory',
    'check stock', 'show stock', 'stock level', 'inventory level',
    'how many', 'how much', 'quantity of', 'amount of',
    'what do we have', 'available stock', 'available inventory'
  ],
  
  // Analytics
  'view_analytics': [
    'show analytics', 'view analytics', 'display analytics',
    'analytics', 'statistics', 'stats', 'report', 'reports',
    'show stats', 'view stats', 'show report', 'view report'
  ]
};

export const entitySynonyms: Record<string, string[]> = {
  'site': ['site', 'location', 'project', 'construction site', 'work site', 'job site'],
  'asset': ['asset', 'item', 'material', 'equipment', 'stock', 'inventory'],
  'quantity': ['quantity', 'qty', 'amount', 'number', 'count', 'units'],
  'driver': ['driver', 'employee', 'person', 'staff', 'worker'],
  'vehicle': ['vehicle', 'truck', 'car', 'van', 'transport']
};

export const unitSynonyms: Record<string, string[]> = {
  'pieces': ['piece', 'pieces', 'pcs', 'pc', 'unit', 'units'],
  'bags': ['bag', 'bags', 'sack', 'sacks'],
  'liters': ['liter', 'liters', 'litre', 'litres', 'l'],
  'meters': ['meter', 'meters', 'metre', 'metres', 'm'],
  'kilograms': ['kilogram', 'kilograms', 'kg', 'kgs'],
  'drums': ['drum', 'drums', 'barrel', 'barrels']
};

/**
 * Find synonyms for a given term
 */
export function findSynonyms(term: string, category: 'action' | 'entity' | 'unit'): string[] {
  const synonymMap = category === 'action' ? actionSynonyms : 
                     category === 'entity' ? entitySynonyms : unitSynonyms;
  
  for (const [key, values] of Object.entries(synonymMap)) {
    if (values.some(v => v.toLowerCase() === term.toLowerCase())) {
      return values;
    }
  }
  return [term];
}

/**
 * Check if text contains any synonym of the target action
 */
export function matchesActionSynonym(text: string, action: keyof typeof actionSynonyms): boolean {
  const synonyms = actionSynonyms[action] || [];
  return synonyms.some(synonym => text.toLowerCase().includes(synonym.toLowerCase()));
}

/**
 * Normalize unit names to standard format
 */
export function normalizeUnit(unit: string): string {
  const lowerUnit = unit.toLowerCase();
  for (const [standard, variants] of Object.entries(unitSynonyms)) {
    if (variants.some(v => v === lowerUnit)) {
      return standard;
    }
  }
  return unit;
}
