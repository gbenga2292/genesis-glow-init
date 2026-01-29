import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SiteRequest } from "@/types/request";
import { dataService } from "@/services/dataService";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { Loader2, Clock, CheckCircle, XCircle, Package } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export const RequestList = () => {
    const { currentUser } = useAuth();
    const [requests, setRequests] = useState<SiteRequest[]>([]);
    const [loading, setLoading] = useState(true);

    const loadRequests = async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            const data = await dataService.requests.getRequestsByRequester(currentUser.id);
            setRequests(data);
        } catch (error) {
            console.error("Failed to load requests", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRequests();
        const interval = setInterval(loadRequests, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, [currentUser]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'approved': return 'bg-blue-100 text-blue-800';
            case 'fulfilled': return 'bg-green-100 text-green-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending': return <Clock className="h-4 w-4" />;
            case 'approved': return <CheckCircle className="h-4 w-4" />;
            case 'fulfilled': return <Package className="h-4 w-4" />;
            case 'rejected': return <XCircle className="h-4 w-4" />;
            default: return <Clock className="h-4 w-4" />;
        }
    };

    if (loading && requests.length === 0) {
        return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
    }

    if (requests.length === 0) {
        return (
            <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                    No requests found. Submit a request to get started.
                </CardContent>
            </Card>
        );
    }

    return (
        <ScrollArea className="h-[500px] w-full pr-4">
            <div className="space-y-4">
                {requests.map(request => (
                    <Card key={request.id}>
                        <CardHeader className="p-4 pb-2">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-base">
                                            {request.siteName || "Unknown Site"}
                                        </CardTitle>
                                        <Badge className={getStatusColor(request.status)} variant="outline">
                                            <span className="flex items-center gap-1">
                                                {getStatusIcon(request.status)}
                                                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                            </span>
                                        </Badge>
                                        {request.priority === 'urgent' && (
                                            <Badge variant="destructive">Urgent</Badge>
                                        )}
                                    </div>
                                    <CardDescription>
                                        {format(new Date(request.createdAt), 'PPP p')}
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-2">
                            <div className="space-y-2">
                                <div className="text-sm font-medium">Items:</div>
                                <ul className="list-disc list-inside text-sm text-gray-700">
                                    {request.items.map((item, idx) => (
                                        <li key={idx}>
                                            {item.quantity}x {item.name}
                                            {item.notes && <span className="text-muted-foreground ml-2">({item.notes})</span>}
                                        </li>
                                    ))}
                                </ul>
                                {request.notes && (
                                    <div className="text-sm text-muted-foreground mt-2 border-t pt-2">
                                        Note: {request.notes}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </ScrollArea>
    );
};
