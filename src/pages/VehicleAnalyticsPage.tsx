import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Vehicle, Waybill } from "@/types/asset";
import { Badge } from "@/components/ui/badge";
import { Truck, ArrowLeft, BarChart3, MapPin, User, Calendar, FileText } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

interface VehicleAnalyticsPageProps {
    vehicles: Vehicle[];
    waybills: Waybill[];
    onBack: () => void;
    initialVehicle?: Vehicle;
}

export const VehicleAnalyticsPage = ({ vehicles, waybills, onBack, initialVehicle }: VehicleAnalyticsPageProps) => {
    const isMobile = useIsMobile();
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(initialVehicle || null);

    // Set initial vehicle when prop changes
    useEffect(() => {
        if (initialVehicle) {
            setSelectedVehicle(initialVehicle);
        }
    }, [initialVehicle]);

    // Calculate stats for all vehicles
    const vehicleStats = useMemo(() => {
        return vehicles.map(vehicle => {
            const vehicleWaybills = waybills.filter(w => w.vehicle === vehicle.name);
            const totalTrips = vehicleWaybills.length;

            // Calculate sites visited
            const sitesVisited = new Set(vehicleWaybills.map(w => w.siteId)).size;

            // Calculate most frequent driver
            const driverCounts: Record<string, number> = {};
            vehicleWaybills.forEach(w => {
                driverCounts[w.driverName] = (driverCounts[w.driverName] || 0) + 1;
            });
            const topDriverEntry = Object.entries(driverCounts).sort((a, b) => b[1] - a[1])[0];
            const topDriver = topDriverEntry ? topDriverEntry[0] : 'N/A';

            // Last trip
            const dates = vehicleWaybills.map(w => new Date(w.issueDate).getTime());
            const lastTrip = dates.length > 0 ? new Date(Math.max(...dates)) : null;

            return {
                ...vehicle,
                stats: {
                    totalTrips,
                    sitesVisited,
                    topDriver,
                    lastTrip,
                    waybills: vehicleWaybills.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())
                }
            };
        }).sort((a, b) => b.stats.totalTrips - a.stats.totalTrips); // Sort by usage frequency desc
    }, [vehicles, waybills]);

    const handleVehicleSelect = (vehicle: Vehicle) => {
        // Find the vehicle with stats
        const v = vehicleStats.find(vs => vs.id === vehicle.id);
        if (v) setSelectedVehicle(v);
    };

    const selectedVehicleWithStats = useMemo(() => {
        if (!selectedVehicle) return null;
        return vehicleStats.find(v => v.id === selectedVehicle.id);
    }, [selectedVehicle, vehicleStats]);

    return (
        <div className="h-full flex flex-col animate-fade-in p-4 md:p-0">
            {/* Header */}
            <div className="flex items-center gap-2 md:gap-4 mb-4 md:mb-6">
                <Button variant="ghost" size="icon" onClick={() => {
                    if (isMobile && selectedVehicle) {
                        setSelectedVehicle(null);
                    } else {
                        onBack();
                    }
                }} className="shrink-0">
                    <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
                </Button>
                <div className="min-w-0 flex-1">
                    <h1 className="text-lg md:text-2xl lg:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent truncate">
                        {isMobile && selectedVehicle ? selectedVehicle.name : 'Vehicle Analytics'}
                    </h1>
                    <p className="text-xs md:text-sm text-muted-foreground truncate">
                        {isMobile && selectedVehicle
                            ? 'Vehicle usage details and history'
                            : 'Track vehicle usage frequency and trip history'}
                    </p>
                </div>
            </div>

            <div className="flex flex-1 gap-2 md:gap-6 overflow-hidden border rounded-xl bg-background/50 backdrop-blur-sm shadow-sm">

                {/* List View (Left) */}
                {(!isMobile || !selectedVehicle) && (
                    <div className={cn(
                        "flex flex-col border-r transition-all duration-300 bg-muted/10",
                        isMobile ? "w-full border-r-0" : "w-full md:w-1/3 lg:w-1/4 min-w-[250px] max-w-sm"
                    )}>
                        <div className="p-3 md:p-4 border-b bg-muted/20">
                            <h3 className="font-semibold flex items-center gap-2 text-sm md:text-base">
                                <Truck className="h-4 w-4" />
                                Fleet Overview ({vehicleStats.length})
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 min-h-0">
                            {vehicleStats.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground text-sm">
                                    No vehicles available
                                </div>
                            ) : (
                                vehicleStats.map((v) => (
                                    <button
                                        key={v.id}
                                        onClick={() => handleVehicleSelect(v)}
                                        className={cn(
                                            "w-full text-left p-2 md:p-3 mb-2 rounded-lg border transition-all hover:bg-muted/50 flex flex-col gap-2",
                                            selectedVehicle?.id === v.id ? "border-primary bg-primary/5 shadow-sm" : "border-transparent bg-background"
                                        )}
                                    >
                                        <div className="flex justify-between items-start w-full gap-2">
                                            <div className="font-semibold text-sm md:text-base truncate flex-1">{v.name}</div>
                                            <Badge variant={v.status === 'active' ? 'default' : 'secondary'} className="text-[10px] h-5 shrink-0">
                                                {v.status}
                                            </Badge>
                                        </div>
                                        <div className="flex justify-between items-center text-xs text-muted-foreground w-full gap-2">
                                            <span className="flex items-center gap-1">
                                                <BarChart3 className="h-3 w-3" /> {v.stats.totalTrips} Trips
                                            </span>
                                            {v.stats.lastTrip && (
                                                <span className="flex items-center gap-1 truncate">
                                                    <Calendar className="h-3 w-3 shrink-0" />
                                                    <span className="truncate">{v.stats.lastTrip.toLocaleDateString()}</span>
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* Details View (Right) */}
                {(!isMobile || selectedVehicle) && (
                    <div className="flex-1 overflow-y-auto p-2 md:p-4 lg:p-6 bg-card/30 min-h-0">
                        {selectedVehicleWithStats ? (
                            <div className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-right-4">

                                {/* Vehicle Header - Mobile */}
                                {isMobile && (
                                    <div className="mb-4">
                                        <h2 className="text-xl font-bold">{selectedVehicleWithStats.name}</h2>
                                        <p className="text-sm text-muted-foreground">
                                            {selectedVehicleWithStats.type || 'Vehicle'}
                                        </p>
                                    </div>
                                )}

                                {/* KPI Cards */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                                    <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200 dark:from-blue-950 dark:to-blue-900/50 dark:border-blue-800">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-xs md:text-sm font-medium text-blue-700 dark:text-blue-300">Total Trips</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl md:text-3xl font-bold text-blue-900 dark:text-blue-100">
                                                {selectedVehicleWithStats.stats.totalTrips}
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200 dark:from-green-950 dark:to-green-900/50 dark:border-green-800">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-xs md:text-sm font-medium text-green-700 dark:text-green-300">Unique Sites</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl md:text-3xl font-bold text-green-900 dark:text-green-100">
                                                {selectedVehicleWithStats.stats.sitesVisited}
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200 dark:from-purple-950 dark:to-purple-900/50 dark:border-purple-800 sm:col-span-2 lg:col-span-1">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-xs md:text-sm font-medium text-purple-700 dark:text-purple-300">Top Driver</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-lg md:text-xl font-bold text-purple-900 dark:text-purple-100 truncate" title={selectedVehicleWithStats.stats.topDriver}>
                                                {selectedVehicleWithStats.stats.topDriver}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Recent History */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base md:text-lg flex items-center gap-2">
                                            <FileText className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                                            Trip History
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {selectedVehicleWithStats.stats.waybills.length > 0 ? (
                                            <div className="space-y-3 md:space-y-4">
                                                {selectedVehicleWithStats.stats.waybills.map((wb: Waybill, idx: number) => (
                                                    <div key={wb.id} className="flex flex-col gap-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="flex flex-col gap-1 min-w-0 flex-1">
                                                                <div className="font-medium flex items-center gap-2 flex-wrap">
                                                                    <span className="text-sm md:text-base">Waybill #{wb.id}</span>
                                                                    {idx === 0 && <Badge className="text-[10px] h-5">Latest</Badge>}
                                                                </div>
                                                                <div className="text-xs md:text-sm text-muted-foreground flex items-center gap-1">
                                                                    <Calendar className="h-3 w-3 shrink-0" />
                                                                    {new Date(wb.issueDate).toLocaleDateString()}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-xs md:text-sm">
                                                            <div className="flex items-center gap-1 min-w-0">
                                                                <MapPin className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground shrink-0" />
                                                                <span className="truncate">{wb.siteId}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1 min-w-0">
                                                                <User className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground shrink-0" />
                                                                <span className="truncate">{wb.driverName}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-10 text-muted-foreground text-sm md:text-base">
                                                No trips recorded for this vehicle.
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-4">
                                <div className="bg-muted/30 p-6 md:p-8 rounded-full mb-4 md:mb-6">
                                    <Truck className="h-12 w-12 md:h-16 md:w-16 opacity-20" />
                                </div>
                                <h3 className="text-lg md:text-xl font-semibold mb-2">Select a Vehicle</h3>
                                <p className="max-w-md text-center text-sm md:text-base">
                                    Click on a vehicle from the list to view detailed usage analytics and trip history.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
