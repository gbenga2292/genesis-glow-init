import React from 'react';
import { PerformanceAnalysisDashboard } from '@/components/PerformanceAnalysisDashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { performanceMonitor } from '@/utils/performanceMonitor';
import { Download, Trash2 } from 'lucide-react';

const PerformanceTestPage: React.FC = () => {
    const handleDownloadReport = () => {
        const report = performanceMonitor.generateReport();
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `performance-report-${new Date().toISOString()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleClearMetrics = () => {
        performanceMonitor.clear();
        window.location.reload();
    };

    const handlePrintReport = () => {
        performanceMonitor.printReport();
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Performance Testing</h1>
                    <p className="text-muted-foreground mt-1">
                        Monitor and analyze application performance metrics
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handlePrintReport}>
                        Print to Console
                    </Button>
                    <Button variant="outline" onClick={handleDownloadReport}>
                        <Download className="h-4 w-4 mr-2" />
                        Download Report
                    </Button>
                    <Button variant="destructive" onClick={handleClearMetrics}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear & Reload
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Performance Monitoring Guide</CardTitle>
                    <CardDescription>How to interpret and use these metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h3 className="font-semibold mb-2">Performance Grades:</h3>
                        <ul className="space-y-1 text-sm">
                            <li>✅ <strong>Excellent:</strong> Total load time &lt; 1 second</li>
                            <li>✅ <strong>Good:</strong> Total load time &lt; 2 seconds</li>
                            <li>⚠️ <strong>Fair:</strong> Total load time &lt; 3 seconds</li>
                            <li>🐌 <strong>Poor:</strong> Total load time ≥ 3 seconds</li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2">What to Look For:</h3>
                        <ul className="space-y-1 text-sm">
                            <li>• Operations taking over 1 second (marked with 🐌)</li>
                            <li>• High memory usage (&gt;80% of heap limit)</li>
                            <li>• Sequential operations that could be parallelized</li>
                            <li>• Large data sets that could benefit from pagination</li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2">Testing Tips:</h3>
                        <ul className="space-y-1 text-sm">
                            <li>• Reload the page to test initial load performance</li>
                            <li>• Check the browser console for detailed timing logs</li>
                            <li>• Compare performance with different data volumes</li>
                            <li>• Test on different network conditions (throttle in DevTools)</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>

            <PerformanceAnalysisDashboard />
        </div>
    );
};

export default PerformanceTestPage;
