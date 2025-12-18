import { useEffect } from "react";
import { format } from "date-fns";

interface MetricsSnapshot {
  id?: number;
  snapshot_date: string;
  total_assets: number;
  total_quantity: number;
  outstanding_waybills: number;
  outstanding_checkouts: number;
  out_of_stock: number;
  low_stock: number;
}

interface CurrentMetrics {
  totalAssets: number;
  totalQuantity: number;
  outstandingWaybills: number;
  outstandingCheckouts: number;
  outOfStockCount: number;
  lowStockCount: number;
}

export const useMetricsSnapshots = (currentMetrics: CurrentMetrics) => {
  useEffect(() => {
    const createTodaySnapshot = async () => {
      try {
        if (!window.electronAPI || !window.electronAPI.db) {
          console.warn('Database not available for metrics snapshot');
          return;
        }

        // Check if today's snapshot already exists
        const existing = await window.electronAPI.db.getTodayMetricsSnapshot();

        // If no snapshot exists for today, create one
        if (!existing) {
          await window.electronAPI.db.createMetricsSnapshot({
            total_assets: currentMetrics.totalAssets,
            total_quantity: currentMetrics.totalQuantity,
            outstanding_waybills: currentMetrics.outstandingWaybills,
            outstanding_checkouts: currentMetrics.outstandingCheckouts,
            out_of_stock: currentMetrics.outOfStockCount,
            low_stock: currentMetrics.lowStockCount,
          });
        }
      } catch (error) {
        console.error("Error creating metrics snapshot:", error);
      }
    };

    createTodaySnapshot();
  }, [currentMetrics]);
};

export const getMetricsHistory = async (days: number = 7): Promise<MetricsSnapshot[]> => {
  try {
    if (!window.electronAPI || !window.electronAPI.db) {
      console.warn('Database not available for metrics history');
      return [];
    }

    const data = await window.electronAPI.db.getMetricsSnapshots(days);
    return data || [];
  } catch (error) {
    console.error("Error fetching metrics history:", error);
    return [];
  }
};
