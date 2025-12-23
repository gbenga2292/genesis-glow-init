import { useMemo } from 'react';
import {
    PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Asset, EquipmentLog } from '@/types/asset';

interface AuditChartsProps {
    assets: Asset[];
    equipmentLogs: EquipmentLog[];
}

const COLORS = ['#3498db', '#2ecc71', '#f39c12', '#e74c3c', '#9b59b6', '#1abc9c', '#34495e'];

export const AuditCharts = ({ assets, equipmentLogs }: AuditChartsProps) => {
    // 1. Asset Value Distribution by Category (Pie)
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

    // 2. Asset Condition Status (Pie)
    const statusData = useMemo(() => {
        const statusCounts = { active: 0, damaged: 0, missing: 0, maintenance: 0 };
        assets.forEach(a => {
            const s = a.status || 'active';
            if (s in statusCounts) statusCounts[s as keyof typeof statusCounts]++;
        });
        return Object.entries(statusCounts)
            .filter(([_, value]) => value > 0)
            .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
    }, [assets]);

    // 3. Top 10 Most Valuable Assets (Bar)
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

    // 4. Equipment Utilization Rate (Bar - Top 8)
    const equipmentData = useMemo(() => {
        const usage = new Map<string, number>();
        equipmentLogs.forEach(log => {
            if (log.active) usage.set(log.equipmentName, (usage.get(log.equipmentName) || 0) + 1);
        });
        return Array.from(usage.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([name, days]) => ({
                name: name.length > 18 ? name.substring(0, 18) + '...' : name,
                days,
                utilization: Math.round((days / 365) * 100)
            }));
    }, [equipmentLogs]);

    // 5. Asset Type Distribution (Pie)
    const typeData = useMemo(() => {
        const typeMap = new Map<string, number>();
        assets.forEach(a => {
            typeMap.set(a.type, (typeMap.get(a.type) || 0) + 1);
        });
        return Array.from(typeMap.entries())
            .map(([name, value]) => ({
                name: name.charAt(0).toUpperCase() + name.slice(1),
                value
            }));
    }, [assets]);

    return (
        <div className="w-[900px] bg-white p-6" id="audit-charts-container">
            <div className="grid grid-cols-2 gap-6">
                {/* Chart 1: Asset Value by Category */}
                <div className="h-[280px] flex flex-col border rounded-lg p-4 bg-gradient-to-br from-blue-50 to-white">
                    <h3 className="text-sm font-bold mb-2 text-slate-800 text-center">Asset Value Distribution by Category</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={categoryValueData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                outerRadius={70}
                                fill="#8884d8"
                                dataKey="value"
                                isAnimationActive={false}
                            >
                                {categoryValueData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => `NGN ${value.toLocaleString()}`} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Chart 2: Asset Health Status */}
                <div className="h-[280px] flex flex-col border rounded-lg p-4 bg-gradient-to-br from-green-50 to-white">
                    <h3 className="text-sm font-bold mb-2 text-slate-800 text-center">Asset Health Status</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={statusData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={70}
                                fill="#8884d8"
                                dataKey="value"
                                isAnimationActive={false}
                            >
                                {statusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Chart 3: Top 10 Most Valuable Assets */}
                <div className="h-[280px] flex flex-col border rounded-lg p-4 bg-gradient-to-br from-orange-50 to-white">
                    <h3 className="text-sm font-bold mb-2 text-slate-800 text-center">Top 10 Most Valuable Assets</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={topAssetsData}
                            layout="vertical"
                            margin={{ top: 5, right: 20, left: 80, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="name" width={75} style={{ fontSize: '9px' }} />
                            <Tooltip formatter={(value: number) => `NGN ${value.toLocaleString()}`} />
                            <Bar dataKey="value" fill="#f39c12" isAnimationActive={false} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Chart 4: Equipment Utilization */}
                <div className="h-[280px] flex flex-col border rounded-lg p-4 bg-gradient-to-br from-purple-50 to-white">
                    <h3 className="text-sm font-bold mb-2 text-slate-800 text-center">Equipment Utilization Rate (%)</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={equipmentData}
                            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} style={{ fontSize: '9px' }} />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="utilization" name="Utilization %" fill="#9b59b6" isAnimationActive={false} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Chart 5: Asset Type Distribution */}
                <div className="h-[280px] flex flex-col border rounded-lg p-4 bg-gradient-to-br from-teal-50 to-white col-span-2">
                    <h3 className="text-sm font-bold mb-2 text-slate-800 text-center">Asset Type Distribution</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={typeData}
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="value" name="Count" fill="#1abc9c" isAnimationActive={false}>
                                {typeData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Summary Footer */}
            <div className="mt-4 p-3 bg-slate-100 rounded text-center">
                <p className="text-xs text-slate-600">
                    <strong>Total Assets:</strong> {assets.length} |
                    <strong className="ml-3">Total Value:</strong> NGN {assets.reduce((sum, a) => sum + (a.cost * a.quantity), 0).toLocaleString()} |
                    <strong className="ml-3">Active Equipment:</strong> {equipmentData.length}
                </p>
            </div>
        </div>
    );
};
