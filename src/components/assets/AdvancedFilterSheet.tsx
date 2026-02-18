import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CheckCircle, Package, MapPin, Sparkles, Clock } from "lucide-react";
import { Site } from "@/types/asset";

export interface AdvancedFilters {
    // Stock Health
    criticalStock: boolean;
    lowStock: boolean;
    outOfStock: boolean;
    hasDamaged: boolean;
    hasMissing: boolean;
    isReserved: boolean;

    // Search
    searchTerm: string;

    // Location (actual locations, not vague "office/sites")
    specificLocation: string; // Asset's location field OR site name

    // Time-based (for manager questions)
    recentlyUpdated: 'all' | 'today' | 'week' | 'month';
}

interface AdvancedFilterSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    filters: AdvancedFilters;
    onFiltersChange: (filters: AdvancedFilters) => void;
    onApply: () => void;
    onClear: () => void;
    activeFilterCount: number;
    sites: Site[]; // Pass sites for location dropdown
    assetLocations: string[]; // Unique locations from assets
}

export const AdvancedFilterSheet = ({
    open,
    onOpenChange,
    filters,
    onFiltersChange,
    onApply,
    onClear,
    activeFilterCount,
    sites,
    assetLocations
}: AdvancedFilterSheetProps) => {
    const [localFilters, setLocalFilters] = useState<AdvancedFilters>(filters);

    const updateFilter = (key: keyof AdvancedFilters, value: any) => {
        const updated = { ...localFilters, [key]: value };
        setLocalFilters(updated);
        onFiltersChange(updated);
    };

    const handleApplyPreset = (preset: 'attention' | 'ready' | 'restock' | 'thisMonth') => {
        let presetFilters: Partial<AdvancedFilters> = {};

        switch (preset) {
            case 'attention':
                // "What needs my attention?"
                presetFilters = {
                    criticalStock: true,
                    lowStock: false,
                    outOfStock: false,
                    hasDamaged: true,
                    hasMissing: true,
                    isReserved: false,
                    specificLocation: 'all',
                    recentlyUpdated: 'all'
                };
                break;
            case 'ready':
                // "What's ready to deploy?"
                presetFilters = {
                    criticalStock: false,
                    lowStock: false,
                    outOfStock: false,
                    hasDamaged: false,
                    hasMissing: false,
                    isReserved: false,
                    specificLocation: 'all',
                    recentlyUpdated: 'all'
                };
                break;
            case 'restock':
                // "What needs restocking?"
                presetFilters = {
                    criticalStock: true,
                    lowStock: true,
                    outOfStock: true,
                    hasDamaged: false,
                    hasMissing: false,
                    isReserved: false,
                    specificLocation: 'all',
                    recentlyUpdated: 'all'
                };
                break;
            case 'thisMonth':
                // "What was updated this month?" (for usage tracking)
                presetFilters = {
                    criticalStock: false,
                    lowStock: false,
                    outOfStock: false,
                    hasDamaged: false,
                    hasMissing: false,
                    isReserved: false,
                    specificLocation: 'all',
                    recentlyUpdated: 'month'
                };
                break;
        }

        const updated = { ...localFilters, ...presetFilters };
        setLocalFilters(updated);
        onFiltersChange(updated);
    };

    const handleClear = () => {
        onClear();
        setLocalFilters(filters);
    };

    const handleApply = () => {
        onApply();
        onOpenChange(false);
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        Advanced Filters
                        {activeFilterCount > 0 && (
                            <Badge variant="secondary" className="ml-2">
                                {activeFilterCount} active
                            </Badge>
                        )}
                    </SheetTitle>
                    <SheetDescription>
                        Quick answers for manager questions
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-6 py-6">
                    {/* Quick Presets - Manager Questions */}
                    <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4" />
                            Quick Answers
                        </Label>
                        <div className="grid grid-cols-1 gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleApplyPreset('attention')}
                                className="justify-start"
                            >
                                <AlertCircle className="h-4 w-4 mr-2 text-destructive" />
                                Needs Attention
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleApplyPreset('ready')}
                                className="justify-start"
                            >
                                <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                                Ready to Deploy
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleApplyPreset('restock')}
                                className="justify-start"
                            >
                                <Package className="h-4 w-4 mr-2 text-orange-500" />
                                Needs Restocking
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleApplyPreset('thisMonth')}
                                className="justify-start"
                            >
                                <Clock className="h-4 w-4 mr-2 text-blue-500" />
                                Updated This Month
                            </Button>
                        </div>
                    </div>

                    <Separator />

                    {/* Enhanced Search */}
                    <div className="space-y-3">
                        <Label htmlFor="search" className="flex items-center gap-2">
                            🔍 Search
                        </Label>
                        <Input
                            id="search"
                            placeholder="Search name, description, location..."
                            value={localFilters.searchTerm}
                            onChange={(e) => updateFilter('searchTerm', e.target.value)}
                            className="border-0 bg-muted/50 focus:bg-background"
                        />
                    </div>

                    <Separator />

                    {/* Location - ACTUAL locations */}
                    <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Location
                        </Label>
                        <Select
                            value={localFilters.specificLocation}
                            onValueChange={(value) => updateFilter('specificLocation', value)}
                        >
                            <SelectTrigger className="border-0 bg-muted/50">
                                <SelectValue placeholder="All Locations" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Locations</SelectItem>
                                <SelectItem value="Office">Office</SelectItem>
                                {sites.map((site) => (
                                    <SelectItem key={site.id} value={site.name}>
                                        {site.name}{site.clientName ? ` (${site.clientName})` : ''}
                                    </SelectItem>
                                ))}
                                {assetLocations.filter(loc => loc && loc !== 'Office' && !sites.some(s => s.name === loc)).map((location) => (
                                    <SelectItem key={location} value={location}>
                                        {location}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            Filter by office or specific site
                        </p>
                    </div>

                    <Separator />

                    {/* Time-based Filter */}
                    <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Last Updated
                        </Label>
                        <Select
                            value={localFilters.recentlyUpdated}
                            onValueChange={(value: any) => updateFilter('recentlyUpdated', value)}
                        >
                            <SelectTrigger className="border-0 bg-muted/50">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Any Time</SelectItem>
                                <SelectItem value="today">Today</SelectItem>
                                <SelectItem value="week">Last 7 Days</SelectItem>
                                <SelectItem value="month">Last 30 Days</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            Track recent usage and changes
                        </p>
                    </div>

                    <Separator />

                    {/* Stock Health */}
                    <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                            📦 Stock Status
                        </Label>
                        <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="critical"
                                    checked={localFilters.criticalStock}
                                    onCheckedChange={(checked) => updateFilter('criticalStock', checked)}
                                />
                                <label htmlFor="critical" className="text-sm cursor-pointer flex-1">
                                    Critical Stock
                                </label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="low"
                                    checked={localFilters.lowStock}
                                    onCheckedChange={(checked) => updateFilter('lowStock', checked)}
                                />
                                <label htmlFor="low" className="text-sm cursor-pointer flex-1">
                                    Low Stock
                                </label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="out"
                                    checked={localFilters.outOfStock}
                                    onCheckedChange={(checked) => updateFilter('outOfStock', checked)}
                                />
                                <label htmlFor="out" className="text-sm cursor-pointer flex-1">
                                    Out of Stock
                                </label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="damaged"
                                    checked={localFilters.hasDamaged}
                                    onCheckedChange={(checked) => updateFilter('hasDamaged', checked)}
                                />
                                <label htmlFor="damaged" className="text-sm cursor-pointer flex-1">
                                    Has Damaged Items
                                </label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="missing"
                                    checked={localFilters.hasMissing}
                                    onCheckedChange={(checked) => updateFilter('hasMissing', checked)}
                                />
                                <label htmlFor="missing" className="text-sm cursor-pointer flex-1">
                                    Has Missing Items
                                </label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="reserved"
                                    checked={localFilters.isReserved}
                                    onCheckedChange={(checked) => updateFilter('isReserved', checked)}
                                />
                                <label htmlFor="reserved" className="text-sm cursor-pointer flex-1">
                                    Has Reserved Items (Reserved &gt; 0)
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <SheetFooter className="flex gap-2">
                    <Button variant="outline" onClick={handleClear} className="flex-1">
                        Clear All
                    </Button>
                    <Button onClick={handleApply} className="flex-1 bg-gradient-primary">
                        Apply Filters
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
};
