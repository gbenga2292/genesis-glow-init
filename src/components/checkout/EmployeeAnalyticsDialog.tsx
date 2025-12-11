import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Employee, QuickCheckout } from "@/types/asset";
import { Users, User, Package, Shield, CalendarIcon } from "lucide-react";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface EmployeeAnalyticsDialogProps {
    employees: Employee[];
    quickCheckouts: QuickCheckout[];
}

export const EmployeeAnalyticsDialog = ({ employees, quickCheckouts }: EmployeeAnalyticsDialogProps) => {
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

    const getEmployeeStats = (empName: string) => {
        const checkouts = quickCheckouts.filter(qc => qc.employee === empName);
        const totalItems = checkouts.reduce((sum, qc) => sum + qc.quantity, 0);
        const outstanding = checkouts.filter(qc =>
            qc.status === 'outstanding' || qc.status === 'lost' || qc.status === 'damaged'
        ).reduce((sum, qc) => sum + qc.quantity, 0);
        const returned = checkouts.filter(qc => qc.status === 'return_completed').reduce((sum, qc) => sum + qc.quantity, 0);

        // Categorize item types
        const itemTypes = checkouts.reduce((acc, qc) => {
            // Logic to infer type if not present in QuickCheckout (it's not, we'd need to look up asset)
            // For now, we just list the asset names
            return acc;
        }, {} as Record<string, number>);

        return { totalItems, outstanding, returned, checkouts };
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Users className="h-4 w-4" />
                    Employees
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Employee Analytics</DialogTitle>
                </DialogHeader>

                <div className="flex flex-1 gap-6 overflow-hidden mt-4">
                    {/* Employee List - Left Sidebar */}
                    <div className="w-1/3 flex flex-col gap-2 min-w-[200px]">
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">Select Employee</h3>
                        <ScrollArea className="h-full pr-4">
                            <div className="flex flex-col gap-2">
                                {employees.map(emp => {
                                    const stats = getEmployeeStats(emp.name);
                                    return (
                                        <button
                                            key={emp.id}
                                            onClick={() => setSelectedEmployee(emp)}
                                            className={`flex flex-col items-start p-3 rounded-lg text-left transition-colors border ${selectedEmployee?.id === emp.id
                                                    ? "bg-primary/10 border-primary"
                                                    : "hover:bg-muted border-transparent bg-card"
                                                }`}
                                        >
                                            <div className="flex items-center gap-2 font-medium">
                                                <User className="h-4 w-4" />
                                                {emp.name}
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-1">
                                                {emp.role} • {stats.outstanding} outstanding
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                    </div>

                    <Separator orientation="vertical" />

                    {/* Analytics View - Right Content */}
                    <div className="flex-1 overflow-y-auto pr-2">
                        {selectedEmployee ? (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h2 className="text-2xl font-bold">{selectedEmployee.name}</h2>
                                        <p className="text-muted-foreground">{selectedEmployee.role} • {selectedEmployee.email || 'No email'}</p>
                                    </div>
                                    {selectedEmployee.status === 'active' ? (
                                        <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded border border-green-400">Active</span>
                                    ) : (
                                        <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded border border-red-400">Inactive</span>
                                    )}
                                </div>

                                {/* KPI Cards */}
                                <div className="grid grid-cols-3 gap-4">
                                    <Card className="shadow-sm">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium">Total Checkouts</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold">{getEmployeeStats(selectedEmployee.name).totalItems}</div>
                                        </CardContent>
                                    </Card>
                                    <Card className="shadow-sm">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium text-warning-foreground">Outstanding</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold text-warning-foreground">
                                                {getEmployeeStats(selectedEmployee.name).outstanding}
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="shadow-sm">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium text-primary">Returned</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold text-primary">
                                                {getEmployeeStats(selectedEmployee.name).returned}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="font-semibold text-lg flex items-center gap-2">
                                        <Package className="h-5 w-5" />
                                        Current Holdings
                                    </h3>

                                    {getEmployeeStats(selectedEmployee.name).checkouts.filter(c => c.status === 'outstanding').length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {getEmployeeStats(selectedEmployee.name).checkouts
                                                .filter(c => c.status === 'outstanding')
                                                .map((checkout, idx) => (
                                                    <Card key={idx} className="border-l-4 border-l-orange-400 shadow-sm">
                                                        <CardContent className="p-4">
                                                            <div className="flex justify-between items-start">
                                                                <div>
                                                                    <div className="font-semibold">{checkout.assetName}</div>
                                                                    <div className="text-sm text-muted-foreground mt-1">
                                                                        Quantity: {checkout.quantity}
                                                                    </div>
                                                                </div>
                                                                <div className="text-xs text-muted-foreground flex items-center bg-muted px-2 py-1 rounded">
                                                                    <CalendarIcon className="h-3 w-3 mr-1" />
                                                                    {new Date(checkout.checkoutDate).toLocaleDateString()}
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                        </div>
                                    ) : (
                                        <div className="text-muted-foreground text-sm italic py-4 border rounded-lg text-center bg-muted/20">
                                            No outstanding items currently held.
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <h3 className="font-semibold text-lg flex items-center gap-2">
                                        <Shield className="h-5 w-5" />
                                        History Overview
                                    </h3>
                                    <div className="border rounded-lg overflow-hidden">
                                        <div className="bg-muted px-4 py-2 text-xs font-semibold uppercase text-muted-foreground grid grid-cols-4 gap-4">
                                            <div className="col-span-2">Item</div>
                                            <div className="text-center">Date</div>
                                            <div className="text-right">Status</div>
                                        </div>
                                        {getEmployeeStats(selectedEmployee.name).checkouts.slice(0, 10).map((checkout, idx) => (
                                            <div key={idx} className="px-4 py-3 text-sm grid grid-cols-4 gap-4 border-t hover:bg-muted/50 transition-colors">
                                                <div className="col-span-2 font-medium">{checkout.assetName}</div>
                                                <div className="text-center text-muted-foreground">
                                                    {new Date(checkout.checkoutDate).toLocaleDateString()}
                                                </div>
                                                <div className="text-right">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${checkout.status === 'outstanding' ? 'bg-orange-100 text-orange-800' :
                                                            checkout.status === 'return_completed' ? 'bg-green-100 text-green-800' :
                                                                checkout.status === 'lost' ? 'bg-red-100 text-red-800' :
                                                                    'bg-gray-100 text-gray-800'
                                                        }`}>
                                                        {checkout.status.replace('_', ' ')}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                        {getEmployeeStats(selectedEmployee.name).checkouts.length === 0 && (
                                            <div className="p-4 text-center text-muted-foreground text-sm">No checkout history found.</div>
                                        )}
                                    </div>
                                </div>

                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                                <Users className="h-16 w-16 mb-4 opacity-20" />
                                <p>Select an employee from the list to view their analytics</p>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
