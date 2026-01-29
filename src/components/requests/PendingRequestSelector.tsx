import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { dataService } from "@/services/dataService";
import { SiteRequest } from "@/types/request";
import { ClipboardList, Clock, CheckCircle } from "lucide-react";
import { format } from "date-fns";

interface PendingRequestSelectorProps {
    onSelectRequest: (request: SiteRequest) => void;
}

export const PendingRequestSelector = ({ onSelectRequest }: PendingRequestSelectorProps) => {
    const [open, setOpen] = useState(false);
    const [requests, setRequests] = useState<SiteRequest[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            loadRequests();
        }
    }, [open]);

    const loadRequests = async () => {
        setLoading(true);
        try {
            const allRequests = await dataService.requests.getRequests();
            // Filter: pending or approved, and NOT fulfilled/rejected
            const actionableRequests = allRequests.filter(r =>
                (r.status === 'pending' || r.status === 'approved') && !r.waybillId
            );
            setRequests(actionableRequests);
        } catch (error) {
            console.error("Failed to load requests", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (request: SiteRequest) => {
        onSelectRequest(request);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <ClipboardList className="h-4 w-4" />
                    Add from Request
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Select Request</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-hidden">
                    <ScrollArea className="h-[500px]">
                        {loading ? (
                            <div className="p-8 text-center text-muted-foreground">Loading...</div>
                        ) : requests.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground">No actionable requests found.</div>
                        ) : (
                            <div className="space-y-4 p-1">
                                {requests.map(request => (
                                    <Card
                                        key={request.id}
                                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                                        onClick={() => handleSelect(request)}
                                    >
                                        <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                                            <div className="font-semibold text-sm">
                                                {request.siteName}
                                                <span className="text-muted-foreground text-xs font-normal ml-2">
                                                    by {request.requesterName}
                                                </span>
                                            </div>
                                            <Badge variant={request.status === 'approved' ? 'default' : 'secondary'}>
                                                {request.status === 'approved' ? <CheckCircle className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                                                {request.status}
                                            </Badge>
                                        </CardHeader>
                                        <CardContent className="p-4 pt-2">
                                            <div className="text-xs text-muted-foreground mb-2">
                                                {format(new Date(request.createdAt), 'PPP p')}
                                            </div>
                                            <div className="text-sm">
                                                <span className="font-medium">Items: </span>
                                                {request.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                                            </div>
                                            {request.notes && (
                                                <div className="text-xs text-muted-foreground mt-1 bg-muted p-1 rounded">
                                                    Note: {request.notes}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
};
