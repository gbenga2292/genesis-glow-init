/**
 * Transform site request from database format to frontend format
 */
export function transformRequestFromDB(dbRequest: any): any {
    return {
        ...dbRequest,
        id: String(dbRequest.id),
        requesterId: String(dbRequest.requestor_id),
        requesterName: dbRequest.requestor_name,
        siteId: dbRequest.site_id ? String(dbRequest.site_id) : undefined,
        siteName: dbRequest.site_name, // Joined field or stored directly
        items: typeof dbRequest.items === 'string' ? JSON.parse(dbRequest.items) : dbRequest.items || [],
        status: dbRequest.status,
        priority: dbRequest.priority || 'normal',
        notes: dbRequest.notes,
        createdAt: new Date(dbRequest.created_at),
        updatedAt: new Date(dbRequest.updated_at),
        approvedBy: dbRequest.approved_by,
        approvedAt: dbRequest.approved_at ? new Date(dbRequest.approved_at) : undefined,
        waybillId: dbRequest.waybill_id ? String(dbRequest.waybill_id) : undefined,
    };
}

/**
 * Transform site request from frontend format to database format
 */
export function transformRequestToDB(request: any): any {
    return {
        id: request.id,
        requestor_id: request.requesterId,
        requestor_name: request.requesterName,
        site_id: request.siteId,
        items: JSON.stringify(request.items || []),
        status: request.status,
        priority: request.priority,
        notes: request.notes,
        approved_by: request.approvedBy,
        approved_at: request.approvedAt instanceof Date ? request.approvedAt.toISOString() : request.approvedAt,
        waybill_id: request.waybillId,
        created_at: request.createdAt instanceof Date ? request.createdAt.toISOString() : request.createdAt,
        updated_at: request.updatedAt instanceof Date ? request.updatedAt.toISOString() : request.updatedAt,
    };
}
