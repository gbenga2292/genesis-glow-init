import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { performanceMonitor, PerformanceReport } from '@/utils/performanceMonitor';
import { RefreshCw, TrendingUp, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const PerformanceAnalysisDashboard: React.FC = () => {
    const [report, setReport] = useState<PerformanceReport | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const generateReport = () => {
        setIsRefreshing(true);
        setTimeout(() => {
            const newReport = performanceMonitor.generateReport();
            setReport(newReport);
            setIsRefreshing(false);
        }, 100);
    };

    useEffect(() => {
        // Generate initial report after a delay to capture all metrics
        const timer = setTimeout(() => {
            generateReport();
        }, 2000);

        return () => clearTimeout(timer);
    }, []);

    const formatDuration = (ms: number) => {
        if (ms < 1000) return `${ms.toFixed(0)}ms`;
        return `${(ms / 1000).toFixed(2)}s`;
    };

    const formatBytes = (bytes: number) => {
        return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    };

    const getPerformanceGrade = (totalLoadTime: number): { grade: string; color: string; icon: React.ReactNode } => {
        if (totalLoadTime < 1000) {
            return { grade: 'Excellent', color: 'text-green-600', icon: <CheckCircle2 className="h-5 w-5 text-green-600" /> };
        } else if (totalLoadTime < 2000) {
            return { grade: 'Good', color: 'text-blue-600', icon: <CheckCircle2 className="h-5 w-5 text-blue-600" /> };
        } else if (totalLoadTime < 3000) {
            return { grade: 'Fair', color: 'text-yellow-600', icon: <AlertTriangle className="h-5 w-5 text-yellow-600" /> };
        } else {
            return { grade: 'Poor', color: 'text-red-600', icon: <AlertTriangle className="h-5 w-5 text-red-600" /> };
        }
    };

    if (!report) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Performance Analysis</CardTitle>
                    <CardDescription>Loading performance metrics...</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-8">
                        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    const performanceGrade = getPerformanceGrade(report.totalLoadTime);

    return (
        <div className="space-y-4">
            {/* Overall Performance Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                Performance Analysis
                                {performanceGrade.icon}
                            </CardTitle>
                            <CardDescription>Application data loading performance metrics</CardDescription>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={generateReport}
                            disabled={isRefreshing}
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                Total Load Time
                            </div>
                            <div className="text-3xl font-bold">{formatDuration(report.totalLoadTime)}</div>
                            <Badge variant={report.totalLoadTime < 3000 ? 'default' : 'destructive'}>
                                {performanceGrade.grade}
                            </Badge>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <TrendingUp className="h-4 w-4" />
                                Data Operations
                            </div>
                            <div className="text-3xl font-bold">{report.dataLoadingMetrics.length}</div>
                            <div className="text-sm text-muted-foreground">
                                {report.dataLoadingMetrics.filter(m => (m.duration || 0) > 1000).length} slow operations
                            </div>
                        </div>

                        {report.memoryUsage && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <AlertTriangle className="h-4 w-4" />
                                    Memory Usage
                                </div>
                                <div className="text-3xl font-bold">
                                    {((report.memoryUsage.usedJSHeapSize / report.memoryUsage.jsHeapSizeLimit) * 100).toFixed(1)}%
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    {formatBytes(report.memoryUsage.usedJSHeapSize)} / {formatBytes(report.memoryUsage.jsHeapSizeLimit)}
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Data Loading Metrics */}
            <Card>
                <CardHeader>
                    <CardTitle>Data Loading Operations</CardTitle>
                    <CardDescription>Individual data loading performance breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {report.dataLoadingMetrics.map((metric, index) => {
                            const duration = metric.duration || 0;
                            const isError = metric.metadata?.error;
                            const isSlow = duration > 1000;
                            const isWarning = duration > 500;

                            return (
                                <div
                                    key={index}
                                    className={`flex items-center justify-between p-3 rounded-lg border ${isError ? 'bg-red-50 border-red-200' :
                                            isSlow ? 'bg-yellow-50 border-yellow-200' :
                                                isWarning ? 'bg-orange-50 border-orange-200' :
                                                    'bg-green-50 border-green-200'
                                        }`}
                                >
                                    <div className="flex-1">
                                        <div className="font-medium">
                                            {metric.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                        </div>
                                        {metric.metadata?.count && (
                                            <div className="text-sm text-muted-foreground">
                                                {metric.metadata.count} records loaded
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={isError ? 'destructive' : isSlow ? 'destructive' : isWarning ? 'secondary' : 'default'}>
                                            {isError ? 'Error' : formatDuration(duration)}
                                        </Badge>
                                        {isSlow && <span className="text-xl">🐌</span>}
                                        {isWarning && !isSlow && <span className="text-xl">⚠️</span>}
                                        {!isSlow && !isWarning && !isError && <span className="text-xl">✅</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Recommendations */}
            {report.recommendations.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-yellow-600" />
                            Performance Recommendations
                        </CardTitle>
                        <CardDescription>Suggestions to improve application performance</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-3">
                            {report.recommendations.map((recommendation, index) => (
                                <li key={index} className="flex items-start gap-2">
                                    <span className="text-lg mt-0.5">
                                        {recommendation.startsWith('⚠️') ? '⚠️' :
                                            recommendation.startsWith('💡') ? '💡' :
                                                recommendation.startsWith('🐌') ? '🐌' : '•'}
                                    </span>
                                    <span className="flex-1">{recommendation.replace(/^[⚠️💡🐌]\s*/, '')}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            {/* Slowest Operations */}
            <Card>
                <CardHeader>
                    <CardTitle>Top 10 Slowest Operations</CardTitle>
                    <CardDescription>Operations that took the longest to complete</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {report.slowestOperations.slice(0, 10).map((metric, index) => (
                            <div key={index} className="flex items-center justify-between p-2 rounded border">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                                    <span className="font-medium">
                                        {metric.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    </span>
                                </div>
                                <Badge variant="outline">{formatDuration(metric.duration || 0)}</Badge>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
