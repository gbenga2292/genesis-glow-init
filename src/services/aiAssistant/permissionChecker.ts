import { UserRole } from '@/contexts/AuthContext';
import { AIIntent } from './types';

export class PermissionChecker {
  private rolePermissions: Record<UserRole, AIIntent['action'][]> = {
    admin: [
      'create_waybill', 'add_asset', 'process_return', 'create_site',
      'add_employee', 'add_vehicle', 'generate_report', 'view_analytics',
      'send_to_site', 'check_inventory', 'update_asset'
    ],
    data_entry_supervisor: [
      'create_waybill', 'add_asset', 'process_return', 'check_inventory',
      'view_analytics', 'send_to_site', 'update_asset'
    ],
    regulatory: [
      'check_inventory', 'view_analytics', 'generate_report'
    ],
    manager: [
      'create_waybill', 'add_asset', 'process_return', 'check_inventory',
      'view_analytics', 'generate_report', 'send_to_site'
    ],
    staff: [
      'check_inventory', 'view_analytics'
    ],
    site_worker: [
      'check_inventory'
    ],
    custom: [
      'check_inventory'
    ]
  };

  constructor(private userRole: UserRole) {}

  checkPermission(action: AIIntent['action']): { allowed: boolean; message: string } {
    // Admins have permission to execute all actions, including unknown ones
    if (this.userRole === 'admin') {
      return { allowed: true, message: '' };
    }

    const allowed = this.rolePermissions[this.userRole]?.includes(action) || false;

    if (!allowed) {
      return {
        allowed: false,
        message: `You don't have permission to perform this action. Your role (${this.userRole}) cannot execute: ${action.replace(/_/g, ' ')}`
      };
    }

    return { allowed: true, message: '' };
  }

  getAllowedActions(): AIIntent['action'][] {
    return this.rolePermissions[this.userRole] || [];
  }

  canPerform(action: AIIntent['action']): boolean {
    return this.checkPermission(action).allowed;
  }
}
