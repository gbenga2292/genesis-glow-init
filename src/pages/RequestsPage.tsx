import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { dataService } from "@/services/dataService";
import { SiteRequest } from "@/types/request";
import { format } from "date-fns";
import { Loader2, CheckCircle, XCircle, Clock, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export const RequestsPage = () => {
    const { toast } = useToast();
    const { currentUser } = useAuth();
    const [requests, setRequests] = useState<SiteRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const loadRequests = async () => {
        setLoading(true);
        try {
            const data = await dataService.requests.getRequests();
            setRequests(data);
        } catch (error) {
            console.error("Failed to load requests", error);
            toast({ title: "Error", description: "Failed to load requests", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRequests();
    }, []);

    const handleUpdateStatus = async (id: string, status: 'approved' | 'rejected') => {
        try {
            await dataService.requests.updateRequest(id, {
                status,
                approvedBy: currentUser?.name,
                approvedAt: new Date(),
                updatedAt: new Date()
            });

            setRequests(prev => prev.map(r => r.id === id ? { ...r, status, approvedBy: currentUser?.name, approvedAt: new Date() } : r));

            toast({ title: `Request ${status === 'approved' ? 'Approved' : 'Rejected'}`, description: "Status updated successfully." });
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
        }
    };

    const filteredRequests = statusFilter === 'all'
        ? requests
        : requests.filter(r => r.status === statusFilter);

    // Sort: Pending first, then by date desc
    const sortedRequests = [...filteredRequests].sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return (
        <div className="space-y-6 p-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Site Requests</h1>
                    <p className="text-muted-foreground">Manage requests from site workers.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="fulfilled">Fulfilled</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={loadRequests}>
                        <Clock className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : sortedRequests.length === 0 ? (
                <Card>
                    <CardContent className="p-12 text-center text-muted-foreground">
                        No requests found.
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {sortedRequests.map(request => (
                        <Card key={request.id} className={request.priority === 'urgent' ? 'border-red-200 bg-red-50/10' : ''}>
                            <CardHeader className="p-4 flex flex-row items-center justify-between pb-2 space-y-0">
                                <div className="space-y-1">
                                    <div className="font-semibold flex items-center gap-2">
                                        {request.siteName}
                                        {request.priority === 'urgent' && <Badge variant="destructive">Urgent</Badge>}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        Requested by {request.requesterName} on {format(new Date(request.createdAt), 'PPP p')}
                                    </div>
                                </div>
                                <Badge variant={
                                    request.status === 'pending' ? 'secondary' :
                                        request.status === 'approved' ? 'default' :
                                            request.status === 'fulfilled' ? 'outline' : 'destructive'
                                } className={request.status === 'fulfilled' ? 'text-green-600 border-green-200 bg-green-50' : ''}>
                                    {request.status.toUpperCase()}
                                </Badge>
                            </CardHeader>
                            <CardContent className="p-4 pt-2">
                                <div className="space-y-4">
                                    <div className="bg-muted/50 p-3 rounded-md text-sm">
                                        <ul className="list-disc list-inside space-y-1">
                                            {request.items.map((item, idx) => (
                                                <li key={idx}>
                                                    <span className="font-medium">{item.quantity}x</span> {item.name}
                                                    {item.notes && <span className="text-muted-foreground italic ml-2">- {item.notes}</span>}
                                                </li>
                                            ))}
                                        </ul>
                                        {request.notes && (
                                            <div className="mt-2 pt-2 border-t text-muted-foreground">
                                                Note: {request.notes}
                                            </div>
                                        )}
                                    </div>

                                    {request.status === 'pending' && (
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="outline"
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => handleUpdateStatus(request.id, 'rejected')}
                                            >
                                                <XCircle className="h-4 w-4 mr-2" />
                                                Reject
                                            </Button>
                                            <Button
                                                onClick={() => handleUpdateStatus(request.id, 'approved')}
                                                className="bg-green-600 hover:bg-green-700"
                                            >
                                                <CheckCircle className="h-4 w-4 mr-2" />
                                                Approve
                                            </Button>
                                        </div>
                                    )}
                                    {request.status === 'approved' && (
                                        <div className="flex justify-end items-center gap-2 text-sm text-muted-foreground">
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                            Approved by {request.approvedBy || 'Manager'}
                                            {!request.waybillId && (
                                                <div className="ml-4 text-orange-600 text-xs font-medium">
                                                    Ready for Waybill
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {request.status === 'fulfilled' && (
                                        <div className="flex justify-end text-sm text-green-700 font-medium">
                                            Fulfilled via Waybill
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};
