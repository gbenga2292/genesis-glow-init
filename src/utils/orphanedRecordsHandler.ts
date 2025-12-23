/**
 * Orphaned Records Handler
 * Prevents and handles orphaned records when deleting parent entities
 */

import { Asset, Site, Waybill } from "@/types/asset";
import { logger } from "@/lib/logger";

export interface OrphanCheckResult {
    hasOrphans: boolean;
    orphanedAssets: Asset[];
    orphanedWaybills: Waybill[];
    canDelete: boolean;
    warnings: string[];
    suggestions: string[];
}

/**
 * Check for orphaned records before deleting a site
 */
export async function checkSiteDeletion(
    siteId: string,
    assets: Asset[],
    waybills: Waybill[]
): Promise<OrphanCheckResult> {
    const orphanedAssets = assets.filter(asset => asset.siteId === siteId);
    const orphanedWaybills = waybills.filter(
        wb => wb.siteId === siteId || wb.returnToSiteId === siteId
    );

    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (orphanedAssets.length > 0) {
        warnings.push(
            `${orphanedAssets.length} asset(s) are currently allocated to this site`
        );
        suggestions.push(
            'Move assets to another site or set them to "Office" location before deleting'
        );
    }

    if (orphanedWaybills.length > 0) {
        warnings.push(
            `${orphanedWaybills.length} waybill(s) reference this site`
        );
        suggestions.push(
            'Complete or cancel waybills before deleting the site'
        );
    }

    // Check for site quantities in assets
    const assetsWithSiteQuantities = assets.filter(asset => {
        const siteQty = asset.siteQuantities?.[siteId];
        return siteQty && siteQty > 0;
    });

    if (assetsWithSiteQuantities.length > 0) {
        warnings.push(
            `${assetsWithSiteQuantities.length} asset(s) have inventory at this site`
        );
        suggestions.push(
            'Return all inventory from this site before deleting'
        );
    }

    return {
        hasOrphans: orphanedAssets.length > 0 || orphanedWaybills.length > 0 || assetsWithSiteQuantities.length > 0,
        orphanedAssets,
        orphanedWaybills,
        canDelete: orphanedAssets.length === 0 && orphanedWaybills.length === 0 && assetsWithSiteQuantities.length === 0,
        warnings,
        suggestions
    };
}

/**
 * Handle orphaned assets when deleting a site
 */
export async function handleOrphanedAssets(
    siteId: string,
    assets: Asset[],
    action: 'move_to_office' | 'deactivate' | 'cancel' = 'cancel'
): Promise<{ success: boolean; updatedAssets: Asset[]; errors: string[] }> {
    const orphanedAssets = assets.filter(asset => asset.siteId === siteId);
    const updatedAssets: Asset[] = [];
    const errors: string[] = [];

    if (action === 'cancel') {
        return {
            success: false,
            updatedAssets: [],
            errors: ['Operation cancelled by user']
        };
    }

    for (const asset of orphanedAssets) {
        try {
            let updatedAsset: Asset;

            if (action === 'move_to_office') {
                // Move asset to office (remove siteId, set location)
                updatedAsset = {
                    ...asset,
                    siteId: undefined,
                    location: 'Office',
                    updatedAt: new Date()
                };
            } else if (action === 'deactivate') {
                // Deactivate the asset
                updatedAsset = {
                    ...asset,
                    status: 'maintenance',
                    siteId: undefined,
                    location: 'Office - Deactivated',
                    updatedAt: new Date()
                };
            } else {
                throw new Error(`Unknown action: ${action}`);
            }

            // Update in database
            if (window.electronAPI && window.electronAPI.db) {
                await window.electronAPI.db.updateAsset(asset.id, updatedAsset);
                updatedAssets.push(updatedAsset);
                logger.info(`Handled orphaned asset: ${asset.name} (${action})`);
            }
        } catch (error) {
            const errorMsg = `Failed to handle asset ${asset.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
            errors.push(errorMsg);
            logger.error(errorMsg, error);
        }
    }

    return {
        success: errors.length === 0,
        updatedAssets,
        errors
    };
}

/**
 * Clean up site quantities when deleting a site
 */
export async function cleanupSiteQuantities(
    siteId: string,
    assets: Asset[]
): Promise<{ success: boolean; updatedAssets: Asset[]; errors: string[] }> {
    const affectedAssets = assets.filter(asset => {
        const siteQty = asset.siteQuantities?.[siteId];
        return siteQty && siteQty > 0;
    });

    const updatedAssets: Asset[] = [];
    const errors: string[] = [];

    for (const asset of affectedAssets) {
        try {
            const siteQty = asset.siteQuantities?.[siteId] || 0;

            // Remove site from siteQuantities
            const newSiteQuantities = { ...asset.siteQuantities };
            delete newSiteQuantities[siteId];

            // Return quantity to available
            const updatedAsset: Asset = {
                ...asset,
                siteQuantities: newSiteQuantities,
                availableQuantity: (asset.availableQuantity || 0) + siteQty,
                updatedAt: new Date()
            };

            // Update in database
            if (window.electronAPI && window.electronAPI.db) {
                await window.electronAPI.db.updateAsset(asset.id, updatedAsset);
                updatedAssets.push(updatedAsset);
                logger.info(`Cleaned up site quantities for: ${asset.name} (returned ${siteQty} units)`);
            }
        } catch (error) {
            const errorMsg = `Failed to cleanup quantities for ${asset.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
            errors.push(errorMsg);
            logger.error(errorMsg, error);
        }
    }

    return {
        success: errors.length === 0,
        updatedAssets,
        errors
    };
}

/**
 * Check for orphaned records before deleting an asset
 */
export async function checkAssetDeletion(
    assetId: string,
    waybills: Waybill[]
): Promise<OrphanCheckResult> {
    const orphanedWaybills = waybills.filter(wb =>
        wb.items.some(item => item.assetId === assetId && item.status === 'outstanding')
    );

    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (orphanedWaybills.length > 0) {
        warnings.push(
            `${orphanedWaybills.length} waybill(s) have outstanding items for this asset`
        );
        suggestions.push(
            'Complete or cancel waybills before deleting the asset'
        );
    }

    return {
        hasOrphans: orphanedWaybills.length > 0,
        orphanedAssets: [],
        orphanedWaybills,
        canDelete: orphanedWaybills.length === 0,
        warnings,
        suggestions
    };
}

/**
 * Comprehensive orphan check for any entity
 */
export async function checkOrphans(
    entityType: 'site' | 'asset' | 'employee',
    entityId: string,
    context: {
        assets?: Asset[];
        waybills?: Waybill[];
        quickCheckouts?: any[];
    }
): Promise<OrphanCheckResult> {
    switch (entityType) {
        case 'site':
            return checkSiteDeletion(
                entityId,
                context.assets || [],
                context.waybills || []
            );

        case 'asset':
            return checkAssetDeletion(
                entityId,
                context.waybills || []
            );

        case 'employee':
            // Check for outstanding checkouts
            const orphanedCheckouts = (context.quickCheckouts || []).filter(
                qc => qc.employee === entityId && qc.status === 'outstanding'
            );

            return {
                hasOrphans: orphanedCheckouts.length > 0,
                orphanedAssets: [],
                orphanedWaybills: [],
                canDelete: orphanedCheckouts.length === 0,
                warnings: orphanedCheckouts.length > 0
                    ? [`Employee has ${orphanedCheckouts.length} outstanding checkout(s)`]
                    : [],
                suggestions: orphanedCheckouts.length > 0
                    ? ['Complete all checkouts before deleting employee']
                    : []
            };

        default:
            return {
                hasOrphans: false,
                orphanedAssets: [],
                orphanedWaybills: [],
                canDelete: true,
                warnings: [],
                suggestions: []
            };
    }
}
