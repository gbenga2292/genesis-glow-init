import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Monitor, Bell, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { sendNotification } from '@/utils/notifications';
import { ThemeSelector } from '@/components/ThemeSelector';

interface PreferencesCardProps {
  isLoading?: boolean;
}

export const PreferencesCard: React.FC<PreferencesCardProps> = ({ isLoading = false }) => {
  const { currentUser, updateUser } = useAuth();

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    inAppNotifications: true,
    lowStockAlerts: true,
    waybillUpdates: true,
    weeklyReport: false,
  });

  // Load preferences from currentUser
  React.useEffect(() => {
    if (currentUser?.preferences) {
      setPreferences(prev => ({
        ...prev,
        ...currentUser.preferences
      }));
    } else {
      // Try to load from legacy localStorage if DB is empty
      const local = localStorage.getItem('user_preferences');
      if (local) {
        try {
          setPreferences(JSON.parse(local));
        } catch (e) { }
      }
    }
  }, [currentUser]);

  const handlePreferenceChange = (key: keyof typeof preferences, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    // Optimistic toast, or wait for save?
    // The UI shows a "Save Preferences" button, so we just update state.
  };

  const savePreferences = async () => {
    if (!currentUser) return;

    try {
      // Save to Local Storage (Backup/Fast Load)
      localStorage.setItem('user_preferences', JSON.stringify(preferences));

      // Save to Backend
      const result = await updateUser(currentUser.id, {
        preferences: preferences
      });

      if (result.success) {
        sendNotification({
          title: 'Preferences Saved',
          body: 'Your notification preferences have been updated.',
          type: 'success'
        });
      } else {
        toast.error('Failed to save to profile: ' + result.message);
      }
    } catch (e) {
      toast.error('Failed to save preferences');
    }
  };

  return (
    <Card className="relative overflow-hidden backdrop-blur-sm border-white/10 hover:shadow-lg transition-all duration-300">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-transparent" />

      <CardHeader className="relative z-10">
        <CardTitle className="flex items-center gap-2">
          <Monitor className="h-5 w-5 text-green-600" />
          Preferences & Settings
        </CardTitle>
        <CardDescription>
          Customize your experience and notification preferences
        </CardDescription>
      </CardHeader>

      <CardContent className="relative z-10 space-y-6">
        {/* Appearance Section */}
        <div className="space-y-4 pb-6 border-b border-border/50">
          <div>
            <h4 className="font-semibold mb-3">Appearance</h4>
            <div className="p-3 bg-background/40 rounded-lg border border-border/50">
              <ThemeSelector />
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="space-y-4">
          <h4 className="font-semibold">Notifications</h4>

          <div className="flex items-center justify-between p-3 bg-background/40 rounded-lg border border-border/50 gap-4">
            <div className="flex items-center gap-3 flex-1">
              <Mail className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Email Notifications</p>
                <p className="text-xs text-muted-foreground mr-2">
                  Receive important updates via email
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.emailNotifications}
              onCheckedChange={(value) => handlePreferenceChange('emailNotifications', value)}
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-background/40 rounded-lg border border-border/50 gap-4">
            <div className="flex items-center gap-3 flex-1">
              <Bell className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">In-App Notifications</p>
                <p className="text-xs text-muted-foreground mr-2">
                  Show alerts within the application
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.inAppNotifications}
              onCheckedChange={(value) => handlePreferenceChange('inAppNotifications', value)}
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-background/40 rounded-lg border border-border/50 gap-4">
            <div className="flex items-center gap-3 flex-1">
              <Bell className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Low Stock Alerts</p>
                <p className="text-xs text-muted-foreground mr-2">
                  Notify when inventory is running low
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.lowStockAlerts}
              onCheckedChange={(value) => handlePreferenceChange('lowStockAlerts', value)}
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-background/40 rounded-lg border border-border/50 gap-4">
            <div className="flex items-center gap-3 flex-1">
              <Bell className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Waybill Status Updates</p>
                <p className="text-xs text-muted-foreground mr-2">
                  Get notified about waybill changes
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.waybillUpdates}
              onCheckedChange={(value) => handlePreferenceChange('waybillUpdates', value)}
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-background/40 rounded-lg border border-border/50 gap-4">
            <div className="flex items-center gap-3 flex-1">
              <Mail className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Weekly Report</p>
                <p className="text-xs text-muted-foreground mr-2">
                  Receive weekly inventory reports
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.weeklyReport}
              onCheckedChange={(value) => handlePreferenceChange('weeklyReport', value)}
              disabled={isLoading}
            />
          </div>
        </div>

        <Button
          className="w-full bg-green-600 hover:bg-green-700"
          disabled={isLoading}
          onClick={savePreferences}
        >
          Save Preferences
        </Button>
      </CardContent>
    </Card>
  );
};

export default PreferencesCard;
