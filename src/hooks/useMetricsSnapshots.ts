import { useEffect } from "react";
import { format } from "date-fns";
import { dataService } from "@/services/dataService";

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
        // Check if today's snapshot already exists
        const existing = await dataService.metrics.getTodaySnapshot();

        // If no snapshot exists for today, create one
        if (!existing) {
          await dataService.metrics.createSnapshot({
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
    const data = await dataService.metrics.getHistory(days);
    return data || [];
  } catch (error) {
    console.error("Error fetching metrics history:", error);
    return [];
  }
};
