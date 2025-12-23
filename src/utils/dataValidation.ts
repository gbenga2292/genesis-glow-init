/**
 * Data Validation Utilities
 * Provides comprehensive validation for all data inputs to prevent data integrity issues
 */

import { Asset, Waybill, Site, Employee, Vehicle } from "@/types/asset";

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * Validate Asset Data
 */
export const validateAsset = (
    asset: Partial<Asset>,
    existingAssets: Asset[] = [],
    isEdit: boolean = false
): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!asset.name || asset.name.trim() === '') {
        errors.push('Asset name is required');
    }

    if (!asset.unitOfMeasurement || asset.unitOfMeasurement.trim() === '') {
        errors.push('Unit of measurement is required');
    }

    if (!asset.category) {
        errors.push('Category is required');
    }

    if (!asset.type) {
        errors.push('Type is required');
    }

    // Duplicate name check (case-insensitive)
    if (asset.name) {
        const duplicate = existingAssets.find(
            a => a.name.toLowerCase() === asset.name!.toLowerCase() &&
                (!isEdit || a.id !== asset.id)
        );
        if (duplicate) {
            errors.push(`Asset name "${asset.name}" already exists (ID: ${duplicate.id})`);
        }
    }

    // Quantity validation
    if (asset.quantity !== undefined) {
        if (asset.quantity < 0) {
            errors.push('Quantity cannot be negative');
        }
        if (!Number.isInteger(asset.quantity)) {
            errors.push('Quantity must be a whole number');
        }
    }

    // Stock level validation
    if (asset.lowStockLevel !== undefined && asset.lowStockLevel < 0) {
        errors.push('Low stock level cannot be negative');
    }

    if (asset.criticalStockLevel !== undefined && asset.criticalStockLevel < 0) {
        errors.push('Critical stock level cannot be negative');
    }

    // Logical validation: critical should be less than low stock
    if (asset.criticalStockLevel !== undefined && asset.lowStockLevel !== undefined) {
        if (asset.criticalStockLevel > asset.lowStockLevel) {
            warnings.push('Critical stock level should be less than low stock level');
        }
    }

    // Reserved quantity validation
    if (asset.reservedQuantity !== undefined) {
        if (asset.reservedQuantity < 0) {
            errors.push('Reserved quantity cannot be negative');
        }
        if (asset.quantity !== undefined && asset.reservedQuantity > asset.quantity) {
            errors.push('Reserved quantity cannot exceed total quantity');
        }
    }

    // Damaged/Missing/Used count validation
    if (asset.damagedCount !== undefined && asset.damagedCount < 0) {
        errors.push('Damaged count cannot be negative');
    }

    if (asset.missingCount !== undefined && asset.missingCount < 0) {
        errors.push('Missing count cannot be negative');
    }

    if (asset.usedCount !== undefined && asset.usedCount < 0) {
        errors.push('Used count cannot be negative');
    }

    // Total integrity check
    if (asset.quantity !== undefined) {
        const totalAccounted =
            (asset.reservedQuantity || 0) +
            (asset.damagedCount || 0) +
            (asset.missingCount || 0) +
            (asset.usedCount || 0);

        if (totalAccounted > asset.quantity) {
            errors.push(`Total accounted items (${totalAccounted}) exceeds quantity (${asset.quantity})`);
        }
    }

    // Cost validation
    if (asset.cost !== undefined && asset.cost < 0) {
        errors.push('Cost cannot be negative');
    }

    // Equipment-specific validation
    if (asset.type === 'equipment') {
        if (asset.fuelCapacity !== undefined && asset.fuelCapacity < 0) {
            errors.push('Fuel capacity cannot be negative');
        }
        if (asset.fuelConsumptionRate !== undefined && asset.fuelConsumptionRate < 0) {
            errors.push('Fuel consumption rate cannot be negative');
        }
        if (asset.electricityConsumption !== undefined && asset.electricityConsumption < 0) {
            errors.push('Electricity consumption cannot be negative');
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
};

/**
 * Validate Waybill Data
 */
export const validateWaybill = (
    waybill: Partial<Waybill>,
    existingWaybills: Waybill[] = [],
    assets: Asset[] = []
): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!waybill.siteId) {
        errors.push('Site is required');
    }

    if (!waybill.driverName || waybill.driverName.trim() === '') {
        errors.push('Driver name is required');
    }

    if (!waybill.vehicle || waybill.vehicle.trim() === '') {
        errors.push('Vehicle is required');
    }

    if (!waybill.purpose || waybill.purpose.trim() === '') {
        errors.push('Purpose is required');
    }

    if (!waybill.items || waybill.items.length === 0) {
        errors.push('At least one item is required');
    }

    // Duplicate ID check (for manual IDs)
    if (waybill.id) {
        const duplicate = existingWaybills.find(w => w.id === waybill.id);
        if (duplicate) {
            errors.push(`Waybill ID "${waybill.id}" already exists`);
        }
    }

    // Items validation
    if (waybill.items) {
        waybill.items.forEach((item, index) => {
            if (!item.assetId) {
                errors.push(`Item ${index + 1}: Asset is required`);
            }

            if (!item.quantity || item.quantity <= 0) {
                errors.push(`Item ${index + 1}: Quantity must be greater than 0`);
            }

            // Check if asset exists and has sufficient quantity
            const asset = assets.find(a => a.id === item.assetId);
            if (asset) {
                const availableQty = asset.availableQuantity || 0;
                if (item.quantity > availableQty) {
                    errors.push(
                        `Item ${index + 1} (${item.assetName}): Requested ${item.quantity} but only ${availableQty} available`
                    );
                }
            } else {
                errors.push(`Item ${index + 1}: Asset not found`);
            }
        });

        // Check for duplicate items in same waybill
        const assetIds = waybill.items.map(i => i.assetId);
        const duplicates = assetIds.filter((id, index) => assetIds.indexOf(id) !== index);
        if (duplicates.length > 0) {
            warnings.push('Waybill contains duplicate items');
        }
    }

    // Date validation
    if (waybill.issueDate && waybill.expectedReturnDate) {
        if (waybill.expectedReturnDate < waybill.issueDate) {
            errors.push('Expected return date cannot be before issue date');
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
};

/**
 * Validate Site Data
 */
export const validateSite = (
    site: Partial<Site>,
    existingSites: Site[] = [],
    isEdit: boolean = false
): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!site.name || site.name.trim() === '') {
        errors.push('Site name is required');
    }

    if (!site.location || site.location.trim() === '') {
        errors.push('Location is required');
    }

    // Duplicate name check
    if (site.name) {
        const duplicate = existingSites.find(
            s => s.name.toLowerCase() === site.name!.toLowerCase() &&
                (!isEdit || s.id !== site.id)
        );
        if (duplicate) {
            errors.push(`Site name "${site.name}" already exists`);
        }
    }

    // Phone validation (basic)
    if (site.phone && site.phone.trim() !== '') {
        const phoneRegex = /^[\d\s\-\+\(\)]+$/;
        if (!phoneRegex.test(site.phone)) {
            errors.push('Phone number contains invalid characters');
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
};

/**
 * Validate Employee Data
 */
export const validateEmployee = (
    employee: Partial<Employee>,
    existingEmployees: Employee[] = [],
    isEdit: boolean = false
): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!employee.name || employee.name.trim() === '') {
        errors.push('Employee name is required');
    }

    if (!employee.role || employee.role.trim() === '') {
        errors.push('Role is required');
    }

    // Duplicate name check
    if (employee.name) {
        const duplicate = existingEmployees.find(
            e => e.name.toLowerCase() === employee.name!.toLowerCase() &&
                (!isEdit || e.id !== employee.id)
        );
        if (duplicate) {
            warnings.push(`Employee name "${employee.name}" already exists`);
        }
    }

    // Email validation
    if (employee.email && employee.email.trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(employee.email)) {
            errors.push('Invalid email format');
        }
    }

    // Phone validation
    if (employee.phone && employee.phone.trim() !== '') {
        const phoneRegex = /^[\d\s\-\+\(\)]+$/;
        if (!phoneRegex.test(employee.phone)) {
            errors.push('Phone number contains invalid characters');
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
};

/**
 * Validate Vehicle Data
 */
export const validateVehicle = (
    vehicle: Partial<Vehicle>,
    existingVehicles: Vehicle[] = [],
    isEdit: boolean = false
): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!vehicle.name || vehicle.name.trim() === '') {
        errors.push('Vehicle name is required');
    }

    // Duplicate name check
    if (vehicle.name) {
        const duplicate = existingVehicles.find(
            v => v.name.toLowerCase() === vehicle.name!.toLowerCase() &&
                (!isEdit || v.id !== vehicle.id)
        );
        if (duplicate) {
            warnings.push(`Vehicle name "${vehicle.name}" already exists`);
        }
    }

    // Registration number validation
    if (vehicle.registration_number) {
        const duplicate = existingVehicles.find(
            v => v.registration_number?.toLowerCase() === vehicle.registration_number!.toLowerCase() &&
                (!isEdit || v.id !== vehicle.id)
        );
        if (duplicate) {
            errors.push(`Registration number "${vehicle.registration_number}" already exists`);
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
};

/**
 * Validate inventory calculations
 */
export const validateInventoryCalculation = (asset: Asset): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    const {
        quantity,
        reservedQuantity = 0,
        damagedCount = 0,
        missingCount = 0,
        usedCount = 0,
        availableQuantity = 0,
        siteQuantities = {}
    } = asset;

    // Calculate expected available quantity
    const siteTotal = Object.values(siteQuantities).reduce((sum, qty) => sum + qty, 0);
    const expectedAvailable = quantity - reservedQuantity - siteTotal - damagedCount - missingCount - usedCount;

    // Check if calculated matches stored
    if (Math.abs(availableQuantity - expectedAvailable) > 0.01) {
        errors.push(
            `Inventory mismatch for ${asset.name}: ` +
            `Expected ${expectedAvailable} available, but stored value is ${availableQuantity}`
        );
    }

    // Check for negative available
    if (expectedAvailable < 0) {
        errors.push(
            `Negative inventory for ${asset.name}: ` +
            `Total allocated (${quantity - expectedAvailable}) exceeds quantity (${quantity})`
        );
    }

    // Warn if all quantity is accounted for in problematic states
    const problematicCount = damagedCount + missingCount;
    if (problematicCount >= quantity) {
        warnings.push(`All units of ${asset.name} are damaged or missing`);
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
};
