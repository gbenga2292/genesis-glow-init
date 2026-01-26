import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Employee, QuickCheckout, Asset } from "@/types/asset";
import { Users, User, Package, Shield, CalendarIcon, ChevronLeft, ChevronRight, ArrowLeft, CheckCircle } from "lucide-react";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface EmployeeAnalyticsPageProps {
    employees: Employee[];
    quickCheckouts: QuickCheckout[];
    assets: Asset[];
    onBack: () => void;
    onUpdateStatus?: (checkoutId: string, status: string) => Promise<void>;
}

export const EmployeeAnalyticsPage = ({ employees, quickCheckouts, assets, onBack, onUpdateStatus }: EmployeeAnalyticsPageProps) => {
    const isMobile = useIsMobile();
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    // View state for mobile: 'list' or 'details'
    const [mobileView, setMobileView] = useState<'list' | 'details'>('list');

    const getEmployeeStats = (empName: string) => {
        const checkouts = quickCheckouts.filter(qc => qc.employee === empName);
        const totalItems = checkouts.reduce((sum, qc) => sum + qc.quantity, 0);
        const outstanding = checkouts.filter(qc =>
            qc.status === 'outstanding' || qc.status === 'lost' || qc.status === 'damaged'
        ).reduce((sum, qc) => sum + qc.quantity, 0);
        const returned = checkouts.filter(qc => qc.status === 'return_completed').reduce((sum, qc) => sum + qc.quantity, 0);

        return { totalItems, outstanding, returned, checkouts };
    };

    const handleEmployeeSelect = (emp: Employee) => {
        setSelectedEmployee(emp);
        if (isMobile) {
            setMobileView('details');
        }
    };

    const handleBackToList = () => {
        setMobileView('list');
        setSelectedEmployee(null);
    };

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="icon" onClick={() => {
                    if (isMobile && mobileView === 'details') {
                        handleBackToList();
                    } else {
                        onBack();
                    }
                }}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                        {isMobile && mobileView === 'details' && selectedEmployee ? selectedEmployee.name : 'Employee Analytics'}
                    </h1>
                    <p className="text-sm sm:text-base text-muted-foreground">
                        {isMobile && mobileView === 'details'
                            ? 'Employee equipment usage details'
                            : 'Detailed breakdown of employee equipment usage and status'}
                    </p>
                </div>
            </div>

            <div className="flex flex-1 gap-6 overflow-hidden border rounded-xl bg-background/50 backdrop-blur-sm shadow-sm">

                {/* Employee List - Left Sidebar (Visible if desktop OR (mobile and view is list)) */}
                {(!isMobile || mobileView === 'list') && (
                    <div
                        className={cn(
                            "flex flex-col border-r transition-all duration-300 relative bg-muted/10",
                            isMobile ? "w-full border-r-0" : isSidebarCollapsed ? "w-[60px]" : "w-1/3 min-w-[280px] max-w-sm"
                        )}
                    >
                        <div className="p-4 flex items-center justify-between border-b h-[60px]">
                            {(!isSidebarCollapsed || isMobile) && (
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                    <Users className="h-5 w-5" />
                                    Employees
                                </h3>
                            )}
                            {!isMobile && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn("h-8 w-8", isSidebarCollapsed && "mx-auto")}
                                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                                >
                                    {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                                </Button>
                            )}
                        </div>

                        <ScrollArea className="flex-1">
                            <div className="flex flex-col gap-1 p-2">
                                {employees.map(emp => {
                                    const stats = getEmployeeStats(emp.name);
                                    return (
                                        <button
                                            key={emp.id}
                                            onClick={() => handleEmployeeSelect(emp)}
                                            className={cn(
                                                "flex items-center gap-3 p-3 rounded-lg text-left transition-colors border",
                                                selectedEmployee?.id === emp.id
                                                    ? "bg-primary/10 border-primary shadow-sm"
                                                    : "hover:bg-muted border-transparent bg-transparent",
                                                (isSidebarCollapsed && !isMobile) ? "justify-center px-2" : "justify-start"
                                            )}
                                            title={(isSidebarCollapsed && !isMobile) ? emp.name : undefined}
                                        >
                                            <div className={cn(
                                                "flex items-center justify-center p-2 rounded-full",
                                                selectedEmployee?.id === emp.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                            )}>
                                                <User className="h-4 w-4" />
                                            </div>

                                            {(!isSidebarCollapsed || isMobile) && (
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium truncate">{emp.name}</div>
                                                    <div className="text-xs text-muted-foreground flex items-center justify-between mt-1">
                                                        <span>{emp.role}</span>
                                                        {stats.outstanding > 0 && (
                                                            <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                                                                {stats.outstanding}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                    </div>
                )}

                {/* Analytics View - Right Content (Visible if desktop OR (mobile and view is details)) */}
                {(!isMobile || mobileView === 'details') && (
                    <div className={cn("flex-1 overflow-y-auto p-4 md:p-6 bg-card/50", isMobile ? "w-full" : "")}>
                        {selectedEmployee ? (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="flex flex-col md:flex-row md:items-start justify-between border-b pb-6 gap-4">
                                    <div>
                                        <h2 className="text-3xl font-bold mb-1">{selectedEmployee.name}</h2>
                                        <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
                                            <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-sm">
                                                <User className="h-3 w-3" />
                                                {selectedEmployee.role}
                                            </span>
                                            <span className="hidden md:inline">•</span>
                                            <span className="text-sm">{selectedEmployee.email || 'No email provided'}</span>
                                        </div>
                                    </div>
                                    {selectedEmployee.status === 'active' ? (
                                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium border border-green-200 self-start">
                                            Active
                                        </span>
                                    ) : (
                                        <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium border border-red-200 self-start">
                                            Inactive
                                        </span>
                                    )}
                                </div>

                                {/* KPI Cards */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
                                    <Card className="shadow-sm border-l-4 border-l-blue-500">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Checkouts</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-3xl font-bold">{getEmployeeStats(selectedEmployee.name).totalItems}</div>
                                        </CardContent>
                                    </Card>
                                    <Card className="shadow-sm border-l-4 border-l-orange-500 bg-orange-50/30">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium text-orange-700">Currently Outstanding</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-3xl font-bold text-orange-700">
                                                {getEmployeeStats(selectedEmployee.name).outstanding}
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="shadow-sm border-l-4 border-l-green-500">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium text-green-700">Returned</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-3xl font-bold text-green-700">
                                                {getEmployeeStats(selectedEmployee.name).returned}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                    {/* Current Holdings */}
                                    <div className="space-y-4">
                                        <h3 className="font-semibold text-xl flex items-center gap-2 text-foreground/80">
                                            <Package className="h-5 w-5" />
                                            Current Holdings
                                        </h3>

                                        {getEmployeeStats(selectedEmployee.name).checkouts.filter(c => c.status === 'outstanding').length > 0 ? (
                                            <div className="flex flex-col gap-3">
                                                {getEmployeeStats(selectedEmployee.name).checkouts
                                                    .filter(c => c.status === 'outstanding')
                                                    .map((checkout, idx) => (
                                                        <Card key={idx} className="border-l-4 border-l-orange-400 shadow-sm hover:shadow-md transition-shadow">
                                                            <CardContent className="p-4">
                                                                <div className="flex justify-between items-start">
                                                                    <div>
                                                                        <div className="font-bold text-base md:text-lg">{checkout.assetName}</div>
                                                                        <div className="text-sm text-muted-foreground mt-1">
                                                                            Quantity: <span className="font-medium text-foreground">{checkout.quantity}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground flex flex-col items-end gap-1">
                                                                        <div className="flex items-center bg-muted px-2 py-1 rounded">
                                                                            <CalendarIcon className="h-3 w-3 mr-1" />
                                                                            {new Date(checkout.checkoutDate).toLocaleDateString()}
                                                                        </div>
                                                                        <div className="flex gap-2 items-center">
                                                                            <span className="text-orange-600 font-medium hidden sm:inline">Outstanding</span>
                                                                            {(() => {
                                                                                const asset = assets.find(a => a.id === checkout.assetId);
                                                                                const canMarkAsUsed = asset && (asset.type === 'consumable' || asset.type === 'non-consumable');

                                                                                return onUpdateStatus && canMarkAsUsed && (
                                                                                    <Button
                                                                                        size="sm"
                                                                                        variant="ghost"
                                                                                        className="h-6 px-2 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            onUpdateStatus(checkout.id, 'used');
                                                                                        }}
                                                                                    >
                                                                                        <CheckCircle className="h-3 w-3 mr-1" />
                                                                                        Mark Used
                                                                                    </Button>
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    ))}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-xl bg-muted/10 text-muted-foreground">
                                                <Package className="h-10 w-10 mb-2 opacity-20" />
                                                <p>No outstanding items.</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* History Overview */}
                                    <div className="space-y-4">
                                        <h3 className="font-semibold text-xl flex items-center gap-2 text-foreground/80">
                                            <Shield className="h-5 w-5" />
                                            Recent History
                                        </h3>
                                        <div className="border rounded-xl overflow-hidden shadow-sm bg-card">
                                            <div className="bg-muted/50 px-4 py-3 text-xs font-semibold uppercase text-muted-foreground grid grid-cols-12 gap-2">
                                                <div className="col-span-6">Item</div>
                                                <div className="col-span-3 text-center">Date</div>
                                                <div className="col-span-3 text-right">Status</div>
                                            </div>
                                            <div className="max-h-[400px] overflow-y-auto">
                                                {getEmployeeStats(selectedEmployee.name).checkouts.slice(0, 20).map((checkout, idx) => (
                                                    <div key={idx} className="px-4 py-3 text-sm grid grid-cols-12 gap-2 border-t hover:bg-muted/30 transition-colors items-center">
                                                        <div className="col-span-6 font-medium truncate">{checkout.assetName}</div>
                                                        <div className="col-span-3 text-center text-muted-foreground text-xs">
                                                            {new Date(checkout.checkoutDate).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: '2-digit' })}
                                                        </div>
                                                        <div className="col-span-3 text-right">
                                                            <span className={cn(
                                                                "inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium",
                                                                checkout.status === 'outstanding' ? 'bg-orange-100 text-orange-800' :
                                                                    checkout.status === 'return_completed' ? 'bg-green-100 text-green-800' :
                                                                        checkout.status === 'lost' ? 'bg-red-100 text-red-800' :
                                                                            'bg-gray-100 text-gray-800'
                                                            )}>
                                                                {checkout.status === 'return_completed' ? 'Returned' : checkout.status.replace('_', ' ')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {getEmployeeStats(selectedEmployee.name).checkouts.length === 0 && (
                                                <div className="p-8 text-center text-muted-foreground">No checkout history found for this employee.</div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                                <div className="bg-muted/30 p-8 rounded-full mb-6">
                                    <Users className="h-16 w-16 opacity-20" />
                                </div>
                                <h3 className="text-xl font-semibold mb-2">Select an Employee</h3>
                                <p className="max-w-md text-center">
                                    Click on an employee from the sidebar to view their full equipment usage history and analytics.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
