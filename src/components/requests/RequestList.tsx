import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SiteRequest } from "@/types/request";
import { dataService } from "@/services/dataService";
import { useAuth } from "@/contexts/AuthContext";
import { format, subDays, subMonths, isAfter } from "date-fns";
import { Loader2, Clock, CheckCircle, XCircle, Package, Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const ITEMS_PER_PAGE = 10;

type TimeFilter = 'all' | '7days' | '30days' | '90days' | '6months' | '1year';
type StatusFilter = 'all' | 'pending' | 'approved' | 'fulfilled' | 'rejected';

export const RequestList = () => {
    const { currentUser } = useAuth();
    const [requests, setRequests] = useState<SiteRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [timeFilter, setTimeFilter] = useState<TimeFilter>('30days');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [currentPage, setCurrentPage] = useState(1);

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

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, timeFilter, statusFilter]);

    // Filter and paginate requests
    const filteredRequests = useMemo(() => {
        let result = [...requests];

        // Time filter
        const now = new Date();
        switch (timeFilter) {
            case '7days':
                result = result.filter(r => isAfter(new Date(r.createdAt), subDays(now, 7)));
                break;
            case '30days':
                result = result.filter(r => isAfter(new Date(r.createdAt), subDays(now, 30)));
                break;
            case '90days':
                result = result.filter(r => isAfter(new Date(r.createdAt), subDays(now, 90)));
                break;
            case '6months':
                result = result.filter(r => isAfter(new Date(r.createdAt), subMonths(now, 6)));
                break;
            case '1year':
                result = result.filter(r => isAfter(new Date(r.createdAt), subMonths(now, 12)));
                break;
        }

        // Status filter
        if (statusFilter !== 'all') {
            result = result.filter(r => r.status === statusFilter);
        }

        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(r =>
                r.siteName?.toLowerCase().includes(query) ||
                r.items.some(item => item.name.toLowerCase().includes(query)) ||
                r.notes?.toLowerCase().includes(query)
            );
        }

        // Sort by date descending
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return result;
    }, [requests, timeFilter, statusFilter, searchQuery]);

    const totalPages = Math.ceil(filteredRequests.length / ITEMS_PER_PAGE);
    const paginatedRequests = filteredRequests.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'approved': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
            case 'fulfilled': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
            default: return 'bg-muted text-muted-foreground';
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

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search requests..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
                    <SelectTrigger className="w-full sm:w-[140px]">
                        <SelectValue placeholder="Time" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="7days">Last 7 days</SelectItem>
                        <SelectItem value="30days">Last 30 days</SelectItem>
                        <SelectItem value="90days">Last 3 months</SelectItem>
                        <SelectItem value="6months">Last 6 months</SelectItem>
                        <SelectItem value="1year">Last year</SelectItem>
                        <SelectItem value="all">All time</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                    <SelectTrigger className="w-full sm:w-[130px]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="fulfilled">Fulfilled</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Summary */}
            <div className="text-sm text-muted-foreground">
                Showing {paginatedRequests.length} of {filteredRequests.length} requests
                {filteredRequests.length !== requests.length && ` (${requests.length} total)`}
            </div>

            {/* Request List */}
            {filteredRequests.length === 0 ? (
                <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                        {requests.length === 0
                            ? "No requests found. Submit a request to get started."
                            : "No requests match your filters."}
                    </CardContent>
                </Card>
            ) : (
                <ScrollArea className="h-[450px] w-full pr-4">
                    <div className="space-y-3">
                        {paginatedRequests.map(request => (
                            <Card key={request.id} className="border-border/50">
                                <CardHeader className="p-4 pb-2">
                                    <div className="flex justify-between items-start">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <CardTitle className="text-base truncate">
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
                                            <CardDescription className="mt-1">
                                                {format(new Date(request.createdAt), 'PPP p')}
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 pt-2">
                                    <div className="space-y-2">
                                        <div className="text-sm font-medium">Items ({request.items.length}):</div>
                                        <ul className="list-disc list-inside text-sm text-muted-foreground">
                                            {request.items.slice(0, 3).map((item, idx) => (
                                                <li key={idx} className="truncate">
                                                    {item.quantity}x {item.name}
                                                    {item.notes && <span className="ml-2">({item.notes})</span>}
                                                </li>
                                            ))}
                                            {request.items.length > 3 && (
                                                <li className="text-muted-foreground">
                                                    +{request.items.length - 3} more items
                                                </li>
                                            )}
                                        </ul>
                                        {request.notes && (
                                            <div className="text-sm text-muted-foreground mt-2 border-t pt-2 truncate">
                                                Note: {request.notes}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </ScrollArea>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                    >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                </div>
            )}
        </div>
    );
};
