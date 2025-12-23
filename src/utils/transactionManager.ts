/**
 * Transaction Manager
 * Provides transaction rollback capabilities for failed operations
 */

import { Asset } from "@/types/asset";
import { logger } from "@/lib/logger";

export interface TransactionStep {
    type: 'create' | 'update' | 'delete';
    entity: 'asset' | 'waybill' | 'site' | 'employee' | 'vehicle';
    id: string;
    previousData?: any;
    newData?: any;
}

export interface Transaction {
    id: string;
    steps: TransactionStep[];
    status: 'pending' | 'committed' | 'rolled_back' | 'failed';
    startTime: Date;
    endTime?: Date;
    error?: string;
}

class TransactionManager {
    private transactions: Map<string, Transaction> = new Map();
    private currentTransaction: Transaction | null = null;

    /**
     * Start a new transaction
     */
    startTransaction(description: string = 'Unnamed transaction'): string {
        const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const transaction: Transaction = {
            id: transactionId,
            steps: [],
            status: 'pending',
            startTime: new Date()
        };

        this.transactions.set(transactionId, transaction);
        this.currentTransaction = transaction;

        logger.info(`Transaction started: ${transactionId} - ${description}`);

        return transactionId;
    }

    /**
     * Record a step in the current transaction
     */
    recordStep(step: TransactionStep): void {
        if (!this.currentTransaction) {
            throw new Error('No active transaction');
        }

        this.currentTransaction.steps.push(step);
        logger.info(`Transaction step recorded: ${step.type} ${step.entity} ${step.id}`);
    }

    /**
     * Commit the current transaction
     */
    commitTransaction(transactionId: string): void {
        const transaction = this.transactions.get(transactionId);

        if (!transaction) {
            throw new Error(`Transaction ${transactionId} not found`);
        }

        transaction.status = 'committed';
        transaction.endTime = new Date();
        this.currentTransaction = null;

        logger.info(`Transaction committed: ${transactionId} (${transaction.steps.length} steps)`);
    }

    /**
     * Rollback a transaction
     */
    async rollbackTransaction(
        transactionId: string,
        error?: string
    ): Promise<{ success: boolean; stepsRolledBack: number; errors: string[] }> {
        const transaction = this.transactions.get(transactionId);

        if (!transaction) {
            throw new Error(`Transaction ${transactionId} not found`);
        }

        logger.warn(`Rolling back transaction: ${transactionId}`);

        const errors: string[] = [];
        let stepsRolledBack = 0;

        // Rollback steps in reverse order
        for (let i = transaction.steps.length - 1; i >= 0; i--) {
            const step = transaction.steps[i];

            try {
                await this.rollbackStep(step);
                stepsRolledBack++;
            } catch (err) {
                const errorMsg = `Failed to rollback step ${i}: ${err instanceof Error ? err.message : 'Unknown error'}`;
                errors.push(errorMsg);
                logger.error(errorMsg, err);
            }
        }

        transaction.status = errors.length === 0 ? 'rolled_back' : 'failed';
        transaction.endTime = new Date();
        transaction.error = error || errors.join('; ');
        this.currentTransaction = null;

        return {
            success: errors.length === 0,
            stepsRolledBack,
            errors
        };
    }

    /**
     * Rollback a single step
     */
    private async rollbackStep(step: TransactionStep): Promise<void> {
        if (!window.electronAPI || !window.electronAPI.db) {
            throw new Error('Database not available');
        }

        switch (step.type) {
            case 'create':
                // Delete the created entity
                await this.deleteEntity(step.entity, step.id);
                break;

            case 'update':
                // Restore previous data
                if (!step.previousData) {
                    throw new Error('No previous data to restore');
                }
                await this.updateEntity(step.entity, step.id, step.previousData);
                break;

            case 'delete':
                // Recreate the deleted entity
                if (!step.previousData) {
                    throw new Error('No previous data to restore');
                }
                await this.createEntity(step.entity, step.previousData);
                break;
        }
    }

    /**
     * Helper: Delete entity
     */
    private async deleteEntity(entity: string, id: string): Promise<void> {
        switch (entity) {
            case 'asset':
                await window.electronAPI.db.deleteAsset(id);
                break;
            case 'waybill':
                await window.electronAPI.db.deleteWaybill(id);
                break;
            case 'site':
                await window.electronAPI.db.deleteSite(id);
                break;
            case 'employee':
                await window.electronAPI.db.deleteEmployee(id);
                break;
            case 'vehicle':
                await window.electronAPI.db.deleteVehicle(id);
                break;
            default:
                throw new Error(`Unknown entity type: ${entity}`);
        }
    }

    /**
     * Helper: Update entity
     */
    private async updateEntity(entity: string, id: string, data: any): Promise<void> {
        switch (entity) {
            case 'asset':
                await window.electronAPI.db.updateAsset(id, data);
                break;
            case 'waybill':
                await window.electronAPI.db.updateWaybill(id, data);
                break;
            case 'site':
                await window.electronAPI.db.updateSite(id, data);
                break;
            case 'employee':
                await window.electronAPI.db.updateEmployee(id, data);
                break;
            case 'vehicle':
                await window.electronAPI.db.updateVehicle(id, data);
                break;
            default:
                throw new Error(`Unknown entity type: ${entity}`);
        }
    }

    /**
     * Helper: Create entity
     */
    private async createEntity(entity: string, data: any): Promise<void> {
        switch (entity) {
            case 'asset':
                await window.electronAPI.db.addAsset(data);
                break;
            case 'waybill':
                await window.electronAPI.db.createWaybill(data);
                break;
            case 'site':
                await window.electronAPI.db.createSite(data);
                break;
            case 'employee':
                await window.electronAPI.db.createEmployee(data);
                break;
            case 'vehicle':
                await window.electronAPI.db.createVehicle(data);
                break;
            default:
                throw new Error(`Unknown entity type: ${entity}`);
        }
    }

    /**
     * Get transaction details
     */
    getTransaction(transactionId: string): Transaction | undefined {
        return this.transactions.get(transactionId);
    }

    /**
     * Get all transactions
     */
    getAllTransactions(): Transaction[] {
        return Array.from(this.transactions.values());
    }

    /**
     * Clear old transactions (keep last 100)
     */
    cleanup(): void {
        const transactions = this.getAllTransactions();

        if (transactions.length > 100) {
            // Sort by start time
            transactions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

            // Keep only the 100 most recent
            const toKeep = transactions.slice(0, 100);
            this.transactions.clear();
            toKeep.forEach(txn => this.transactions.set(txn.id, txn));

            logger.info(`Cleaned up old transactions. Kept ${toKeep.length} most recent.`);
        }
    }
}

// Export singleton instance
export const transactionManager = new TransactionManager();

/**
 * Higher-order function to wrap operations in a transaction
 */
export async function withTransaction<T>(
    description: string,
    operation: (recordStep: (step: TransactionStep) => void) => Promise<T>
): Promise<T> {
    const transactionId = transactionManager.startTransaction(description);

    try {
        const result = await operation((step) => transactionManager.recordStep(step));
        transactionManager.commitTransaction(transactionId);
        return result;
    } catch (error) {
        logger.error(`Transaction failed: ${description}`, error);

        const rollbackResult = await transactionManager.rollbackTransaction(
            transactionId,
            error instanceof Error ? error.message : 'Unknown error'
        );

        if (!rollbackResult.success) {
            logger.error(`Rollback had errors: ${rollbackResult.errors.join(', ')}`);
        }

        throw error;
    }
}
