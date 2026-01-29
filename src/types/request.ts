export interface RequestItem {
    id?: string;
    name: string; // Text input or selected asset name
    quantity: number;
    notes?: string;
    assetId?: string; // Optional, if linked to an inventory item
}

export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'fulfilled' | 'partial';

export interface SiteRequest {
    id: string;
    requesterId: string;
    requesterName: string;
    siteId?: string;
    siteName?: string;
    items: RequestItem[];
    status: RequestStatus;
    priority: 'normal' | 'urgent';
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
    approvedBy?: string;
    approvedAt?: Date;
    waybillId?: string; // Linked waybill if converted
}
