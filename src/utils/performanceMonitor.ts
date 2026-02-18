/**
 * Performance Monitoring Utility
 * Tracks data loading times, memory usage, and render performance
 */

export interface PerformanceMetric {
    name: string;
    startTime: number;
    endTime?: number;
    duration?: number;
    metadata?: Record<string, any>;
}

export interface PerformanceReport {
    totalLoadTime: number;
    dataLoadingMetrics: PerformanceMetric[];
    slowestOperations: PerformanceMetric[];
    memoryUsage?: {
        jsHeapSizeLimit: number;
        totalJSHeapSize: number;
        usedJSHeapSize: number;
    };
    recommendations: string[];
}

class PerformanceMonitor {
    private metrics: Map<string, PerformanceMetric> = new Map();
    private completedMetrics: PerformanceMetric[] = [];
    private enabled: boolean = true;

    constructor() {
        // Enable performance monitoring in development
        this.enabled = import.meta.env.DEV || localStorage.getItem('enablePerformanceMonitoring') === 'true';
    }

    /**
     * Start tracking a performance metric
     */
    start(name: string, metadata?: Record<string, any>): void {
        if (!this.enabled) return;

        const metric: PerformanceMetric = {
            name,
            startTime: performance.now(),
            metadata
        };

        this.metrics.set(name, metric);
        console.log(`⏱️ [Performance] Started: ${name}`, metadata);
    }

    /**
     * End tracking a performance metric
     */
    end(name: string, metadata?: Record<string, any>): number | undefined {
        if (!this.enabled) return;

        const metric = this.metrics.get(name);
        if (!metric) {
            console.warn(`⚠️ [Performance] No start time found for: ${name}`);
            return;
        }

        metric.endTime = performance.now();
        metric.duration = metric.endTime - metric.startTime;

        if (metadata) {
            metric.metadata = { ...metric.metadata, ...metadata };
        }

        this.completedMetrics.push(metric);
        this.metrics.delete(name);

        const durationMs = metric.duration.toFixed(2);
        const emoji = metric.duration > 1000 ? '🐌' : metric.duration > 500 ? '⚠️' : '✅';
        console.log(`${emoji} [Performance] Completed: ${name} - ${durationMs}ms`, metric.metadata);

        return metric.duration;
    }

    /**
     * Mark a specific point in time
     */
    mark(name: string): void {
        if (!this.enabled) return;
        performance.mark(name);
    }

    /**
     * Measure between two marks
     */
    measure(name: string, startMark: string, endMark: string): number | undefined {
        if (!this.enabled) return;

        try {
            performance.measure(name, startMark, endMark);
            const measure = performance.getEntriesByName(name, 'measure')[0];
            console.log(`📊 [Performance] Measure: ${name} - ${measure.duration.toFixed(2)}ms`);
            return measure.duration;
        } catch (error) {
            console.warn(`⚠️ [Performance] Failed to measure ${name}:`, error);
        }
    }

    /**
     * Get memory usage information
     */
    getMemoryUsage(): PerformanceReport['memoryUsage'] | undefined {
        if (!this.enabled) return;

        if ('memory' in performance) {
            const memory = (performance as any).memory;
            return {
                jsHeapSizeLimit: memory.jsHeapSizeLimit,
                totalJSHeapSize: memory.totalJSHeapSize,
                usedJSHeapSize: memory.usedJSHeapSize
            };
        }
    }

    /**
     * Generate a comprehensive performance report
     */
    generateReport(): PerformanceReport {
        // Calculate true total load time (wall-clock time)
        // Find the earliest start time and latest end time of all loading operations
        const loadingMetrics = this.completedMetrics.filter(m => m.name.includes('load'));
        let totalLoadTime = 0;

        if (loadingMetrics.length > 0) {
            const minStartTime = Math.min(...loadingMetrics.map(m => m.startTime));
            const maxEndTime = Math.max(...loadingMetrics.map(m => m.endTime || m.startTime));
            totalLoadTime = maxEndTime - minStartTime;
        }

        const dataLoadingMetrics = this.completedMetrics
            .filter(m => m.name.includes('load') || m.name.includes('fetch'))
            .sort((a, b) => (b.duration || 0) - (a.duration || 0));

        const slowestOperations = [...this.completedMetrics]
            .sort((a, b) => (b.duration || 0) - (a.duration || 0))
            .slice(0, 10);

        const recommendations: string[] = [];

        // Analyze and provide recommendations
        const slowLoads = dataLoadingMetrics.filter(m => (m.duration || 0) > 1000);
        if (slowLoads.length > 0) {
            recommendations.push(
                `⚠️ ${slowLoads.length} data loading operation(s) took over 1 second. Consider implementing pagination or lazy loading.`
            );
        }

        // Improved sequential detection logic
        // Check if we have many non-overlapping operations
        const sortedByStart = [...loadingMetrics]
            .filter(m => !m.name.includes('total-load')) // Exclude the wrapper metric
            .sort((a, b) => a.startTime - b.startTime);

        let sequentialCount = 0;
        for (let i = 0; i < sortedByStart.length - 1; i++) {
            const current = sortedByStart[i];
            const next = sortedByStart[i + 1];
            // If the next one starts AFTER the current one ends, they are sequential
            if (next.startTime >= (current.endTime || Infinity)) {
                sequentialCount++;
            }
        }

        if (sequentialCount > 4) { // Allow some sequential ops, but warn if too many
            recommendations.push(
                `💡 ${sequentialCount} sequential execution chains detected. Consider using Promise.all() for better parallelism.`
            );
        }

        if (totalLoadTime > 3000) {
            recommendations.push(
                `🐌 Total data loading time is ${(totalLoadTime / 1000).toFixed(2)}s. This is above the recommended 3s threshold.`
            );
            recommendations.push(
                `💡 Consider implementing: 1) Data caching, 2) Incremental loading, 3) Background data refresh`
            );
        }

        const memoryUsage = this.getMemoryUsage();
        if (memoryUsage) {
            const usagePercent = (memoryUsage.usedJSHeapSize / memoryUsage.jsHeapSizeLimit) * 100;
            if (usagePercent > 80) {
                recommendations.push(
                    `⚠️ Memory usage is at ${usagePercent.toFixed(1)}%. Consider optimizing data structures or implementing data virtualization.`
                );
            }
        }

        return {
            totalLoadTime,
            dataLoadingMetrics,
            slowestOperations,
            memoryUsage,
            recommendations
        };
    }

    /**
     * Print a formatted report to console
     */
    printReport(): void {
        if (!this.enabled) return;

        const report = this.generateReport();

        console.group('📊 Performance Report');
        console.log(`⏱️ Total Load Time: ${(report.totalLoadTime / 1000).toFixed(2)}s`);

        console.group('📈 Data Loading Metrics');
        report.dataLoadingMetrics.forEach(metric => {
            const duration = (metric.duration || 0).toFixed(2);
            const emoji = (metric.duration || 0) > 1000 ? '🐌' : (metric.duration || 0) > 500 ? '⚠️' : '✅';
            console.log(`${emoji} ${metric.name}: ${duration}ms`, metric.metadata);
        });
        console.groupEnd();

        console.group('🐌 Slowest Operations (Top 10)');
        report.slowestOperations.forEach((metric, index) => {
            const duration = (metric.duration || 0).toFixed(2);
            console.log(`${index + 1}. ${metric.name}: ${duration}ms`);
        });
        console.groupEnd();

        if (report.memoryUsage) {
            console.group('💾 Memory Usage');
            const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(2);
            console.log(`Used: ${mb(report.memoryUsage.usedJSHeapSize)} MB`);
            console.log(`Total: ${mb(report.memoryUsage.totalJSHeapSize)} MB`);
            console.log(`Limit: ${mb(report.memoryUsage.jsHeapSizeLimit)} MB`);
            console.log(`Usage: ${((report.memoryUsage.usedJSHeapSize / report.memoryUsage.jsHeapSizeLimit) * 100).toFixed(1)}%`);
            console.groupEnd();
        }

        if (report.recommendations.length > 0) {
            console.group('💡 Recommendations');
            report.recommendations.forEach(rec => console.log(rec));
            console.groupEnd();
        }

        console.groupEnd();
    }

    /**
     * Clear all metrics
     */
    clear(): void {
        this.metrics.clear();
        this.completedMetrics = [];
        performance.clearMarks();
        performance.clearMeasures();
    }

    /**
     * Get all completed metrics
     */
    getMetrics(): PerformanceMetric[] {
        return [...this.completedMetrics];
    }

    /**
     * Enable or disable monitoring
     */
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        localStorage.setItem('enablePerformanceMonitoring', enabled.toString());
    }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Make it available globally for debugging
if (typeof window !== 'undefined') {
    (window as any).performanceMonitor = performanceMonitor;
}
