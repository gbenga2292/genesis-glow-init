
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, subDays } from "date-fns";
import { CalendarIcon, User } from "lucide-react";
import { getActivities } from "@/utils/activityLogger";
import { Activity } from "@/types/asset";
import { useAppData } from "@/contexts/AppDataContext";

export const RecentActivitiesPage = () => {
    const { sites } = useAppData();
    const [activities, setActivities] = useState<Activity[]>([]);
    const [activityDateRange, setActivityDateRange] = useState({
        from: subDays(new Date(), 7),
        to: new Date()
    });
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Load activities on mount
    useEffect(() => {
        const loadData = async () => {
            const loadedActivities = await getActivities();
            setActivities(loadedActivities);
        };
        loadData();
    }, []);

    // Filter activities by date range
    const filteredActivities = useMemo(() => {
        return activities.filter(activity => {
            const activityDate = activity.timestamp;
            return activityDate >= activityDateRange.from && activityDate <= activityDateRange.to;
        });
    }, [activities, activityDateRange]);

    return (
        <div className="space-y-4 md:space-y-8">

            <div className="px-1">
                <h1 className="text-2xl md:text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                    Recent Activities
                </h1>
                <p className="text-muted-foreground text-sm md:text-base mt-1">
                    Latest system activities and user actions
                </p>
            </div>

            <Card className="border-0 shadow-soft">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Activity Log</CardTitle>
                            <CardDescription>Comprehensive list of system actions</CardDescription>
                        </div>
                        <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-2">
                                    <CalendarIcon className="h-4 w-4" />
                                    {format(activityDateRange.from, "MMM dd")} - {format(activityDateRange.to, "MMM dd")}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <Calendar
                                    mode="range"
                                    selected={{
                                        from: activityDateRange.from,
                                        to: activityDateRange.to
                                    }}
                                    onSelect={range => {
                                        if (range?.from && range?.to) {
                                            setActivityDateRange({
                                                from: range.from,
                                                to: range.to
                                            });
                                            setShowDatePicker(false);
                                        }
                                    }}
                                    numberOfMonths={2}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {filteredActivities.slice(0, 50).map((activity, index) => { // Increased limit for full page
                            // Format the action text to be more readable
                            const formatAction = (action: string): string => {
                                return action.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                            };

                            // Format the entity text
                            const formatEntity = (entity: string): string => {
                                return entity.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                            };

                            // Get site name if entityId is a site ID
                            const getDisplayEntityId = (entityId?: string): string => {
                                if (!entityId) return '';

                                // Check if it's a site ID pattern and get the site name
                                const site = sites.find(s => s.id === entityId);
                                if (site) {
                                    return site.name;
                                }
                                return entityId;
                            };

                            return (
                                <div key={activity.id || index} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                                    <div>
                                        <div className="font-medium flex items-center gap-2">
                                            <User className="h-4 w-4 text-primary" />
                                            {activity.userName || activity.userId}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {formatAction(activity.action)} {formatEntity(activity.entity)}
                                            {activity.entityId && ` - ${getDisplayEntityId(activity.entityId)}`}
                                        </div>
                                        {activity.details && (
                                            <div className="text-xs text-muted-foreground mt-1">
                                                {activity.details}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-muted-foreground">
                                            {activity.timestamp.toLocaleDateString()} {activity.timestamp.toLocaleTimeString()}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {filteredActivities.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>No activities in selected date range</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
