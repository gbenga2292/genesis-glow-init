import { useMemo } from 'react';
import {
    PieChart, Pie, Cell, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Asset } from '@/types/asset';
import { EquipmentLog } from '@/types/equipment';
import { ConsumableUsageLog } from '@/types/consumable';

interface AuditChartsProps {
    assets: Asset[];
    equipmentLogs: EquipmentLog[];
    consumableLogs: ConsumableUsageLog[];
    startDate: Date;
    endDate: Date;
}

const COLORS = ['#2980b9', '#27ae60', '#f39c12', '#c0392b', '#8e44ad', '#16a085', '#2c3e50'];
// Custom colors for health
const HEALTH_COLORS: Record<string, string> = {
    'Active': '#27ae60',
    'Damaged': '#c0392b',
    'Missing': '#e67e22',
    'Maintenance': '#f1c40f'
};

const formatNGN = (value: number) => `NGN ${value.toLocaleString()}`;

export const AuditCharts = ({ assets, equipmentLogs, consumableLogs, startDate, endDate }: AuditChartsProps) => {

    // 1. Asset Value Distribution by Category (Values - Snapshot)
    const categoryValueData = useMemo(() => {
        const catMap = new Map<string, number>();
        assets.forEach(a => {
            const val = a.cost * a.quantity;
            const cat = a.category || 'Uncategorized';
            catMap.set(cat, (catMap.get(cat) || 0) + val);
        });
        return Array.from(catMap.entries())
            .filter(([_, value]) => value > 0)
            .map(([name, value]) => ({
                name: name.charAt(0).toUpperCase() + name.slice(1),
                value: Math.round(value)
            }))
            .sort((a, b) => b.value - a.value);
    }, [assets]);

    // 2. Asset Condition Status (Snapshot)
    const statusData = useMemo(() => {
        const statusCounts = { active: 0, damaged: 0, missing: 0, maintenance: 0 };
        assets.forEach(a => {
            const s = a.status || 'active';
            if (s in statusCounts) statusCounts[s as keyof typeof statusCounts]++;
        });
        return Object.entries(statusCounts)
            .filter(([_, value]) => value > 0)
            .map(([name, value]) => ({
                name: name.charAt(0).toUpperCase() + name.slice(1),
                value
            }));
    }, [assets]);

    // 3. Equipment Utilization (Date Range Aware - Flow)
    const equipmentData = useMemo(() => {
        const daysInRange = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
        const usage = new Map<string, number>();

        // Filter logs within range
        const validLogs = equipmentLogs.filter(l => {
            const d = new Date(l.date);
            return d >= startDate && d <= endDate;
        });

        validLogs.forEach(log => {
            if (log.active) usage.set(log.equipmentName, (usage.get(log.equipmentName) || 0) + 1);
        });

        return Array.from(usage.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([name, days]) => ({
                name: name.length > 18 ? name.substring(0, 18) + '...' : name,
                days,
                utilization: Math.min(100, Math.round((days / daysInRange) * 100))
            }));
    }, [equipmentLogs, startDate, endDate]);

    // 4. Consumable Usage Cost (Date Range Aware - Flow)
    const consumableData = useMemo(() => {
        const costMap = new Map<string, number>();

        // Filter logs
        const validLogs = consumableLogs.filter(l => {
            const d = new Date(l.date);
            return d >= startDate && d <= endDate;
        });

        validLogs.forEach(log => {
            const asset = assets.find(a => a.id === log.consumableId);
            const cost = (asset?.cost || 0) * log.quantityUsed;
            if (cost > 0) {
                costMap.set(log.consumableName, (costMap.get(log.consumableName) || 0) + cost);
            }
        });

        return Array.from(costMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([name, value]) => ({
                name: name.length > 20 ? name.substring(0, 20) + '...' : name,
                value
            }));
    }, [consumableLogs, assets, startDate, endDate]);

    // 5. Top 10 High Value Assets (Snapshot)
    const topAssetsData = useMemo(() => {
        return assets
            .map(a => ({
                name: a.name.length > 20 ? a.name.substring(0, 20) + '...' : a.name,
                value: a.cost * a.quantity
            }))
            .filter(a => a.value > 0)
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);
    }, [assets]);

    return (
        <div className="w-[900px] bg-white p-6" id="audit-charts-container">
            <div className="grid grid-cols-2 gap-6">
                {/* 1. Asset Value by Category (Donut) */}
                <div className="h-[280px] flex flex-col border rounded-lg p-4 bg-gradient-to-br from-slate-50 to-white shadow-sm">
                    <h3 className="text-sm font-bold mb-2 text-slate-800 text-center">Portfolio Value by Category</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={categoryValueData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={2}
                                dataKey="value"
                            >
                                {categoryValueData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => formatNGN(value)} />
                            <Legend verticalAlign="bottom" height={36} iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* 2. Asset Health (Donut) */}
                <div className="h-[280px] flex flex-col border rounded-lg p-4 bg-gradient-to-br from-slate-50 to-white shadow-sm">
                    <h3 className="text-sm font-bold mb-2 text-slate-800 text-center">Asset Health Status</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={statusData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={2}
                                dataKey="value"
                            >
                                {statusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={HEALTH_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" height={36} iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* 3. Top Consumables by Cost (Bar) */}
                <div className="h-[280px] flex flex-col border rounded-lg p-4 bg-gradient-to-br from-slate-50 to-white shadow-sm">
                    <h3 className="text-sm font-bold mb-2 text-slate-800 text-center">Top Consumable Costs (OpEx)</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={consumableData}
                            layout="vertical"
                            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="name" width={100} style={{ fontSize: '10px' }} />
                            <Tooltip formatter={(value: number) => formatNGN(value)} />
                            <Bar dataKey="value" fill="#e74c3c" radius={[0, 4, 4, 0]}>
                                {consumableData.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* 4. Equipment Utilization (Bar) */}
                <div className="h-[280px] flex flex-col border rounded-lg p-4 bg-gradient-to-br from-slate-50 to-white shadow-sm">
                    <h3 className="text-sm font-bold mb-2 text-slate-800 text-center">Equipment Utilization (%)</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={equipmentData}
                            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} style={{ fontSize: '10px' }} />
                            <YAxis />
                            <Tooltip formatter={(val: number) => `${val}%`} />
                            <Bar dataKey="utilization" fill="#8e44ad" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* 5. Top 10 Value Assets (Bar - Full Width) */}
                <div className="h-[260px] flex flex-col border rounded-lg p-4 bg-gradient-to-br from-slate-50 to-white shadow-sm col-span-2">
                    <h3 className="text-sm font-bold mb-2 text-slate-800 text-center">Top 10 High Value Assets (CapEx)</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={topAssetsData}
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" style={{ fontSize: '10px' }} />
                            <YAxis style={{ fontSize: '10px' }} />
                            <Tooltip formatter={(value: number) => formatNGN(value)} />
                            <Bar dataKey="value" fill="#2980b9" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Summary Footer */}
            <div className="mt-4 p-3 bg-slate-100 rounded text-center border border-slate-200">
                <p className="text-xs text-slate-600 font-medium">
                    Analysis Period: {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
                    <span className="mx-3 text-slate-300">|</span>
                    Total OpEx (Consumables): {formatNGN(consumableData.reduce((sum, c) => sum + c.value, 0))}
                    <span className="mx-3 text-slate-300">|</span>
                    Active Equipment: {equipmentData.length} units
                </p>
            </div>
        </div>
    );
};
