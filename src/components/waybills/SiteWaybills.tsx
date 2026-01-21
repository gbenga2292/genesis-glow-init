import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Site, Waybill, Asset, Employee } from "@/types/asset";
import { MapPin, FileText, RotateCcw, Truck, Package, Eye } from "lucide-react";

interface SiteWaybillsProps {
  sites: Site[];
  waybills: Waybill[];
  assets: Asset[];
  employees: Employee[];
  onViewWaybill?: (waybill: Waybill) => void;
  onPrepareReturnWaybill: (site: Site) => void;
  onProcessReturn: (site: Site) => void;
}

export const SiteWaybills = ({
  sites,
  waybills,
  assets,
  employees,
  onViewWaybill,
  onPrepareReturnWaybill,
  onProcessReturn
}: SiteWaybillsProps) => {
  const getSiteWaybills = (siteId: string) => {
    return waybills.filter(waybill => String(waybill.siteId) === String(siteId));
  };

  const getSiteAssets = (siteId: string) => {
    return assets.filter(asset => String(asset.siteId) === String(siteId));
  };

  const getOutstandingWaybills = (siteId: string) => {
    return getSiteWaybills(siteId).filter(waybill => waybill.type === 'waybill' && waybill.status === 'outstanding');
  };

  const getReturnInitiatedWaybills = (siteId: string) => {
    return getSiteWaybills(siteId).filter(waybill => waybill.type === 'return' && waybill.status === 'outstanding');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Site Waybills Management
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage materials and returns for each construction site
        </p>
      </div>

      {/* Sites Grid */}
      <div className="grid gap-6">
        {sites.map((site, index) => {
          const siteWaybills = getSiteWaybills(site.id);
          const siteAssets = getSiteAssets(site.id);
          const outstandingWaybills = getOutstandingWaybills(site.id);
          const returnInitiatedWaybills = getReturnInitiatedWaybills(site.id);

          return (
            <Card
              key={site.id}
              className="border-0 shadow-soft hover:shadow-medium transition-all duration-300 animate-slide-up"
              style={{animationDelay: `${index * 0.1}s`}}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-6 w-6 text-primary" />
                    <div>
                      <CardTitle className="text-xl">{site.name}</CardTitle>
                      <p className="text-muted-foreground text-sm">{site.location}</p>
                    </div>
                  </div>
                  <Badge variant={site.status === 'active' ? 'default' : 'secondary'}>
                    {site.status}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent>
                {/* Site Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <Truck className="h-5 w-5 text-primary mx-auto mb-1" />
                    <p className="text-2xl font-bold">{siteWaybills.length}</p>
                    <p className="text-xs text-muted-foreground">Total Waybills</p>
                  </div>
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <Package className="h-5 w-5 text-orange-500 mx-auto mb-1" />
                    <p className="text-2xl font-bold">{outstandingWaybills.length}</p>
                    <p className="text-xs text-muted-foreground">Outstanding</p>
                  </div>
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <RotateCcw className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                    <p className="text-2xl font-bold">{returnInitiatedWaybills.length}</p>
                    <p className="text-xs text-muted-foreground">Return Initiated</p>
                  </div>
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <FileText className="h-5 w-5 text-green-500 mx-auto mb-1" />
                    <p className="text-2xl font-bold">{siteAssets.length}</p>
                    <p className="text-xs text-muted-foreground">Assets at Site</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={() => onPrepareReturnWaybill(site)}
                    className="flex-1 bg-gradient-primary hover:scale-105 transition-all duration-300"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Prepare Return Waybill
                  </Button>
                </div>

                {/* Recent Waybills */}
                {siteWaybills.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium mb-3">Recent Waybills</h4>
                    <div className="space-y-2">
                      {siteWaybills.slice(0, 3).map((waybill) => (
                        <div key={waybill.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg gap-2">
                          <div className="flex-1">
                            <p className="font-medium">{waybill.id}</p>
                            <p className="text-sm text-muted-foreground">
                              {waybill.driverName} • {waybill.items.length} items
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              onViewWaybill?.(waybill);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Badge variant={
                            waybill.type === 'return' 
                              ? (waybill.status === 'outstanding' ? 'secondary' : 'outline')
                              : (waybill.status === 'outstanding' ? 'default' : 'outline')
                          }>
                            {waybill.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assets at Site */}
                {siteAssets.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium mb-3">Materials at Site</h4>
                    <div className="space-y-2">
                      {siteAssets.slice(0, 5).map((asset) => (
                        <div key={asset.id} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                          <div>
                            <p className="font-medium">{asset.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {asset.quantity} {asset.unitOfMeasurement}
                            </p>
                          </div>
                          <Badge variant="outline">{asset.category}</Badge>
                        </div>
                      ))}
                      {siteAssets.length > 5 && (
                        <p className="text-sm text-muted-foreground text-center">
                          +{siteAssets.length - 5} more materials
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {sites.length === 0 && (
        <Card className="border-0 shadow-soft">
          <CardContent className="text-center py-12">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No sites available</h3>
            <p className="text-muted-foreground">
              Add sites in the Sites section to manage waybills by location
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
