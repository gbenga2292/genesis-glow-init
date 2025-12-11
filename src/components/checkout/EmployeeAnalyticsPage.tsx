import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Employee, QuickCheckout } from "@/types/asset";
import { Users, User, Package, Shield, CalendarIcon, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface EmployeeAnalyticsPageProps {
    employees: Employee[];
    quickCheckouts: QuickCheckout[];
    onBack: () => void;
}

export const EmployeeAnalyticsPage = ({ employees, quickCheckouts, onBack }: EmployeeAnalyticsPageProps) => {
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const getEmployeeStats = (empName: string) => {
        const checkouts = quickCheckouts.filter(qc => qc.employee === empName);
        const totalItems = checkouts.reduce((sum, qc) => sum + qc.quantity, 0);
        const outstanding = checkouts.filter(qc =>
            qc.status === 'outstanding' || qc.status === 'lost' || qc.status === 'damaged'
        ).reduce((sum, qc) => sum + qc.quantity, 0);
        const returned = checkouts.filter(qc => qc.status === 'return_completed').reduce((sum, qc) => sum + qc.quantity, 0);

        return { totalItems, outstanding, returned, checkouts };
    };

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="icon" onClick={onBack}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                        Employee Analytics
                    </h1>
                    <p className="text-muted-foreground">
                        Detailed breakdown of employee equipment usage and status
                    </p>
                </div>
            </div>

            <div className="flex flex-1 gap-6 overflow-hidden border rounded-xl bg-background/50 backdrop-blur-sm shadow-sm">
                {/* Employee List - Left Sidebar */}
                <div
                    className={cn(
                        "flex flex-col border-r transition-all duration-300 relative bg-muted/10",
                        isSidebarCollapsed ? "w-[60px]" : "w-1/3 min-w-[280px] max-w-sm"
                    )}
                >
                    <div className="p-4 flex items-center justify-between border-b h-[60px]">
                        {!isSidebarCollapsed && (
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Employees
                            </h3>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn("h-8 w-8", isSidebarCollapsed && "mx-auto")}
                            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        >
                            {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                        </Button>
                    </div>

                    <ScrollArea className="flex-1">
                        <div className="flex flex-col gap-1 p-2">
                            {employees.map(emp => {
                                const stats = getEmployeeStats(emp.name);
                                return (
                                    <button
                                        key={emp.id}
                                        onClick={() => setSelectedEmployee(emp)}
                                        className={cn(
                                            "flex items-center gap-3 p-3 rounded-lg text-left transition-colors border",
                                            selectedEmployee?.id === emp.id
                                                ? "bg-primary/10 border-primary shadow-sm"
                                                : "hover:bg-muted border-transparent bg-transparent",
                                            isSidebarCollapsed ? "justify-center px-2" : "justify-start"
                                        )}
                                        title={isSidebarCollapsed ? emp.name : undefined}
                                    >
                                        <div className={cn(
                                            "flex items-center justify-center p-2 rounded-full",
                                            selectedEmployee?.id === emp.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                        )}>
                                            <User className="h-4 w-4" />
                                        </div>

                                        {!isSidebarCollapsed && (
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

                {/* Analytics View - Right Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-card/50">
                    {selectedEmployee ? (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="flex items-start justify-between border-b pb-6">
                                <div>
                                    <h2 className="text-3xl font-bold mb-1">{selectedEmployee.name}</h2>
                                    <div className="flex items-center gap-3 text-muted-foreground">
                                        <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-sm">
                                            <User className="h-3 w-3" />
                                            {selectedEmployee.role}
                                        </span>
                                        <span>•</span>
                                        <span>{selectedEmployee.email || 'No email provided'}</span>
                                    </div>
                                </div>
                                {selectedEmployee.status === 'active' ? (
                                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium border border-green-200">
                                        Active Employee
                                    </span>
                                ) : (
                                    <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium border border-red-200">
                                        Inactive Employee
                                    </span>
                                )}
                            </div>

                            {/* KPI Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                                        <CardTitle className="text-sm font-medium text-green-700">Successfully Returned</CardTitle>
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
                                                                    <div className="font-bold text-lg">{checkout.assetName}</div>
                                                                    <div className="text-sm text-muted-foreground mt-1">
                                                                        Quantity: <span className="font-medium text-foreground">{checkout.quantity}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="text-xs text-muted-foreground flex flex-col items-end gap-1">
                                                                    <div className="flex items-center bg-muted px-2 py-1 rounded">
                                                                        <CalendarIcon className="h-3 w-3 mr-1" />
                                                                        {new Date(checkout.checkoutDate).toLocaleDateString()}
                                                                    </div>
                                                                    <span className="text-orange-600 font-medium">Outstanding</span>
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
                                        <div className="bg-muted/50 px-4 py-3 text-xs font-semibold uppercase text-muted-foreground grid grid-cols-12 gap-4">
                                            <div className="col-span-6">Item</div>
                                            <div className="col-span-3 text-center">Date</div>
                                            <div className="col-span-3 text-right">Status</div>
                                        </div>
                                        <div className="max-h-[400px] overflow-y-auto">
                                            {getEmployeeStats(selectedEmployee.name).checkouts.slice(0, 20).map((checkout, idx) => (
                                                <div key={idx} className="px-4 py-3 text-sm grid grid-cols-12 gap-4 border-t hover:bg-muted/30 transition-colors items-center">
                                                    <div className="col-span-6 font-medium">{checkout.assetName}</div>
                                                    <div className="col-span-3 text-center text-muted-foreground">
                                                        {new Date(checkout.checkoutDate).toLocaleDateString()}
                                                    </div>
                                                    <div className="col-span-3 text-right">
                                                        <span className={cn(
                                                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                                                            checkout.status === 'outstanding' ? 'bg-orange-100 text-orange-800' :
                                                                checkout.status === 'return_completed' ? 'bg-green-100 text-green-800' :
                                                                    checkout.status === 'lost' ? 'bg-red-100 text-red-800' :
                                                                        'bg-gray-100 text-gray-800'
                                                        )}>
                                                            {checkout.status.replace('_', ' ')}
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
            </div>
        </div>
    );
};
