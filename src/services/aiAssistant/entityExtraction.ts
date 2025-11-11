import Fuse from 'fuse.js';
import { Asset, Site, Employee, Vehicle } from '@/types/asset';
import { ExtractedItem, FuzzyMatchResult } from './types';
import { normalizeUnit } from './synonyms';

export class EntityExtractor {
  private sites: Site[];
  private assets: Asset[];
  private employees: Employee[];
  private vehicles: Vehicle[];
  private siteFuse: Fuse<Site> | null = null;
  private assetFuse: Fuse<Asset> | null = null;
  private employeeFuse: Fuse<Employee> | null = null;
  private vehicleFuse: Fuse<Vehicle> | null = null;

  constructor(
    sites: Site[],
    assets: Asset[],
    employees: Employee[],
    vehicles: Vehicle[]
  ) {
    this.sites = sites;
    this.assets = assets;
    this.employees = employees;
    this.vehicles = vehicles;
    this.initializeFuse();
  }

  updateContext(sites: Site[], assets: Asset[], employees: Employee[], vehicles: Vehicle[]): void {
    this.sites = sites;
    this.assets = assets;
    this.employees = employees;
    this.vehicles = vehicles;
    this.initializeFuse();
  }

  private initializeFuse(): void {
    // Fuzzy search with 40% tolerance for typos
    const fuseOptions = {
      threshold: 0.4,
      includeScore: true,
      minMatchCharLength: 2,
    };

    this.siteFuse = new Fuse(this.sites, {
      ...fuseOptions,
      keys: ['name', 'address']
    });

    this.assetFuse = new Fuse(this.assets, {
      ...fuseOptions,
      keys: ['name', 'description']
    });

    this.employeeFuse = new Fuse(this.employees, {
      ...fuseOptions,
      keys: ['name']
    });

    this.vehicleFuse = new Fuse(this.vehicles, {
      ...fuseOptions,
      keys: ['registration_number', 'name']
    });
  }

  /**
   * Find site in text with fuzzy matching
   */
  findSiteInText(text: string): { site: Site; confidence: number } | null {
    if (!this.siteFuse || this.sites.length === 0) return null;

    const results = this.siteFuse.search(text);
    if (results.length === 0) return null;

    const bestMatch = results[0];
    return {
      site: bestMatch.item,
      confidence: 1 - (bestMatch.score || 0) // Convert distance to confidence
    };
  }

  /**
   * Find all assets mentioned in text with quantities
   */
  findAssetsInText(text: string): ExtractedItem[] {
    if (!this.assetFuse || this.assets.length === 0) return [];

    const found: ExtractedItem[] = [];
    const lowerText = text.toLowerCase();

    // Try direct fuzzy search first
    const fuzzyResults = this.assetFuse.search(text);
    
    for (const result of fuzzyResults) {
      if (!result.score || result.score > 0.4) continue; // Skip poor matches

      const asset = result.item;
      const assetNameLower = asset.name.toLowerCase();
      
      // Find quantity associated with this asset
      const quantity = this.extractQuantityNearAsset(lowerText, assetNameLower);
      
      found.push({
        id: asset.id,
        name: asset.name,
        quantity,
        confidence: 1 - result.score
      });
    }

    // Also try exact substring matches for better precision
    for (const asset of this.assets) {
      const assetNameLower = asset.name.toLowerCase();
      if (lowerText.includes(assetNameLower) && !found.some(f => f.id === asset.id)) {
        const quantity = this.extractQuantityNearAsset(lowerText, assetNameLower);
        found.push({
          id: asset.id,
          name: asset.name,
          quantity,
          confidence: 1.0 // Exact match
        });
      }
    }

    return found;
  }

  /**
   * Extract quantity near an asset name (searches 50 chars before and after)
   */
  private extractQuantityNearAsset(text: string, assetName: string): number | undefined {
    const assetIndex = text.indexOf(assetName);
    if (assetIndex === -1) return undefined;

    const searchRadius = 50;
    const startIndex = Math.max(0, assetIndex - searchRadius);
    const endIndex = Math.min(text.length, assetIndex + assetName.length + searchRadius);
    const contextText = text.substring(startIndex, endIndex);

    // Look for numbers in the context
    const numberPatterns = [
      /(\d+)\s*(?:units?|pcs?|pieces?|bags?|items?)?/gi,
      /(?:quantity|qty|amount|count)[\s:]*(\d+)/gi,
      /(\d+)/g
    ];

    for (const pattern of numberPatterns) {
      const match = contextText.match(pattern);
      if (match) {
        const numMatch = match[0].match(/\d+/);
        if (numMatch) {
          return parseInt(numMatch[0]);
        }
      }
    }

    return undefined;
  }

  /**
   * Find employee in text
   */
  findEmployeeInText(text: string): { employee: Employee; confidence: number } | null {
    if (!this.employeeFuse || this.employees.length === 0) return null;

    const results = this.employeeFuse.search(text);
    if (results.length === 0) return null;

    const bestMatch = results[0];
    return {
      employee: bestMatch.item,
      confidence: 1 - (bestMatch.score || 0)
    };
  }

  /**
   * Find vehicle in text
   */
  findVehicleInText(text: string): { vehicle: Vehicle; confidence: number } | null {
    if (!this.vehicleFuse || this.vehicles.length === 0) return null;

    const results = this.vehicleFuse.search(text);
    if (results.length === 0) return null;

    const bestMatch = results[0];
    return {
      vehicle: bestMatch.item,
      confidence: 1 - (bestMatch.score || 0)
    };
  }

  /**
   * Extract all numbers from text
   */
  extractNumbers(text: string): number[] {
    const matches = text.match(/\d+/g);
    return matches ? matches.map(m => parseInt(m)) : [];
  }

  /**
   * Extract unit of measurement
   */
  extractUnit(text: string): string | null {
    const unitPattern = /\b(units?|pieces?|pcs?|bags?|drums?|liters?|litres?|kg|kgs?|kilograms?|meters?|metres?|m)\b/i;
    const match = text.match(unitPattern);
    return match ? normalizeUnit(match[1]) : null;
  }

  /**
   * Extract purpose (text after "for" or "to")
   */
  extractPurpose(text: string): string | null {
    const purposePatterns = [
      /for\s+([^.,;]+?)(?:\s+with|\s+to|\.|,|;|$)/i,
      /purpose[\s:]+([^.,;]+?)(?:\.|,|;|$)/i,
      /to\s+([^.,;]+?)(?:\s+with|\s+at|\.|,|;|$)/i
    ];

    for (const pattern of purposePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Parse multiple items from complex requests
   * Example: "send 5 pumps and 10 cement bags" -> [{pumps, 5}, {cement bags, 10}]
   */
  parseMultipleItems(text: string): ExtractedItem[] {
    const items: ExtractedItem[] = [];
    
    // Split by "and" or commas
    const segments = text.split(/\s+and\s+|,\s*/i);
    
    for (const segment of segments) {
      const segmentItems = this.findAssetsInText(segment);
      items.push(...segmentItems);
    }

    return items;
  }
}
