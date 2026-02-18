import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface PermissionsCardProps {
  isLoading?: boolean;
}

const ROLE_PERMISSIONS: Record<string, {
  label: string;
  color: string;
  permissions: { name: string; allowed: boolean }[];
}> = {
  admin: {
    label: 'Administrator',
    color: 'from-red-600 to-pink-600',
    permissions: [
      { name: 'Create Users', allowed: true },
      { name: 'Delete Users', allowed: true },
      { name: 'Edit Company Settings', allowed: true },
      { name: 'Access All Reports', allowed: true },
      { name: 'Manage Permissions', allowed: true },
      { name: 'View Audit Logs', allowed: true },
      { name: 'Reset Passwords', allowed: true },
      { name: 'Export Data', allowed: true },
    ],
  },
  manager: {
    label: 'Manager',
    color: 'from-blue-600 to-cyan-600',
    permissions: [
      { name: 'Create Waybills', allowed: true },
      { name: 'Assign Assets', allowed: true },
      { name: 'View Reports', allowed: true },
      { name: 'Manage Team Members', allowed: true },
      { name: 'Delete Waybills', allowed: false },
      { name: 'Edit Company Settings', allowed: false },
      { name: 'Manage Global Users', allowed: false },
    ],
  },
  supervisor: {
    label: 'Supervisor',
    color: 'from-purple-600 to-indigo-600',
    permissions: [
      { name: 'Create Waybills', allowed: true },
      { name: 'View Reports', allowed: true },
      { name: 'Assign Assets', allowed: true },
      { name: 'Approve Returns', allowed: true },
      { name: 'Delete Waybills', allowed: false },
      { name: 'Manage Users', allowed: false },
      { name: 'Edit Company Settings', allowed: false },
    ],
  },
  staff: {
    label: 'Staff',
    color: 'from-green-600 to-emerald-600',
    permissions: [
      { name: 'Create Waybills', allowed: true },
      { name: 'View Own Reports', allowed: true },
      { name: 'Submit Returns', allowed: true },
      { name: 'View Assets', allowed: true },
      { name: 'Assign Assets', allowed: false },
      { name: 'Delete Records', allowed: false },
      { name: 'Manage Users', allowed: false },
    ],
  },
};

export const PermissionsCard: React.FC<PermissionsCardProps> = ({ isLoading = false }) => {
  const { currentUser } = useAuth();
  const roleInfo = ROLE_PERMISSIONS[currentUser?.role as string] || ROLE_PERMISSIONS.staff;

  return (
    <Card className="relative overflow-hidden backdrop-blur-sm border-white/10 hover:shadow-lg transition-all duration-300">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent" />

      <CardHeader className="relative z-10">
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-indigo-600" />
          Role & Permissions
        </CardTitle>
        <CardDescription>
          Here's what you can do in the system
        </CardDescription>
      </CardHeader>

      <CardContent className="relative z-10 space-y-6">
        {/* Role Badge */}
        <div className="p-4 bg-gradient-to-br from-indigo-500/10 via-transparent to-transparent rounded-lg border border-indigo-200/30 dark:border-indigo-800/30">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${roleInfo.color} flex items-center justify-center shadow-lg`}>
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                Your Role
              </p>
              <p className="text-xl font-bold">{roleInfo.label}</p>
            </div>
          </div>
        </div>

        {/* Permissions Grid */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Capabilities</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {roleInfo.permissions.map((perm, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 bg-background/40 rounded-lg border border-border/50 group hover:border-border transition-colors"
              >
                {perm.allowed ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 group-hover:scale-110 transition-transform" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600/40 flex-shrink-0" />
                )}
                <span className={`text-sm font-medium ${perm.allowed ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
                  {perm.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="pt-4 border-t border-border/50 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Legend
          </p>
          <div className="flex items-center gap-2 text-xs">
            <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
            <span className="text-muted-foreground">You have access</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <XCircle className="h-4 w-4 text-red-600/40 flex-shrink-0" />
            <span className="text-muted-foreground">You don't have access</span>
          </div>
        </div>

        {/* Contact Admin */}
        <div className="p-4 bg-blue-500/5 rounded-lg border border-blue-200/30 dark:border-blue-800/30">
          <p className="text-sm text-blue-900 dark:text-blue-200">
            Need more permissions? <span className="font-semibold">Contact your administrator</span> to request role upgrades.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PermissionsCard;
