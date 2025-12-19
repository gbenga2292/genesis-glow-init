
/**
 * Centralized asset calculation logic.
 * This ensures consistency across the application for critical business logic.
 */

// Calculate available quantity based on total quantity and deductions
export const calculateAvailableQuantity = (
    totalQuantity: number,
    reservedQuantity: number = 0,
    damagedCount: number = 0,
    missingCount: number = 0,
    usedCount: number = 0
): number => {
    // Ensure all inputs are numbers and default to 0 if undefined/null
    const total = Number(totalQuantity) || 0;
    const reserved = Number(reservedQuantity) || 0;
    const damaged = Number(damagedCount) || 0;
    const missing = Number(missingCount) || 0;
    const used = Number(usedCount) || 0;

    // Calculation: Available = Total - Reserved - Damaged - Missing - Used
    // Note: Reserved quantity typically includes items deployed to sites (siteQuantities)
    // so we do NOT subtract siteQuantities separately.
    const available = total - reserved - damaged - missing - used;

    // Return 0 if calculation results in negative
    return Math.max(0, available);
};

// Calculate stock status (In Stock, Low Stock, Out of Stock)
// 0 = Out of Stock, 1 = Low Stock, 2 = In Stock
export const calculateStockStatus = (quantity: number, lowStockThreshold: number = 10): 0 | 1 | 2 => {
    const qty = Number(quantity) || 0;
    if (qty <= 0) return 0;
    if (qty < lowStockThreshold) return 1;
    return 2;
};
