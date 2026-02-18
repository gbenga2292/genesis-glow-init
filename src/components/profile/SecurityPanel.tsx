import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Lock, Shield, Smartphone, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { generateSecret, verifyToken, generateOtpAuthUrl } from '@/lib/totp';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { PinSetupCard } from './PinSetupCard';
import QRCode from 'qrcode';

interface SecurityPanelProps {
  onPasswordChange?: (data: { currentPassword: string; newPassword: string }) => Promise<void>;
  isLoading?: boolean;
}

export const SecurityPanel: React.FC<SecurityPanelProps> = ({ onPasswordChange, isLoading = false }) => {
  const { currentUser, updateUser } = useAuth();
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isMFAEnabled, setIsMFAEnabled] = useState(currentUser?.mfa_enabled || false);
  const [isMFASetupOpen, setIsMFASetupOpen] = useState(false);
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (currentUser) {
      setIsMFAEnabled(!!currentUser.mfa_enabled);
    }
  }, [currentUser]);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handlePasswordChange = async () => {
    if (!passwordForm.currentPassword.trim()) {
      toast.error('Current password is required');
      return;
    }

    if (!passwordForm.newPassword.trim()) {
      toast.error('New password is required');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setIsSaving(true);
    try {
      if (onPasswordChange) {
        await onPasswordChange({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        });
      } else {
        await updateUser(currentUser?.id || '', {
          password: passwordForm.newPassword,
        });
      }
      toast.success('Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setIsPasswordDialogOpen(false);
    } catch (error) {
      toast.error('Failed to change password');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMFAToggle = async (checked: boolean) => {
    if (checked) {
      // Start Setup Flow
      const secret = generateSecret();
      setMfaSecret(secret);

      const otpAuthUrl = generateOtpAuthUrl(secret, currentUser?.username || 'User', 'DCEL Asset Manager');
      try {
        const url = await QRCode.toDataURL(otpAuthUrl);
        setQrCodeUrl(url);
      } catch (err) {
        console.error('Error generating QR code', err);
        setQrCodeUrl('');
      }

      setMfaCode('');
      setIsMFASetupOpen(true);
    } else {
      // Disable MFA (Ask for confirmation?)
      if (confirm('Are you sure you want to disable Multi-Factor Authentication?')) {
        setIsSaving(true);
        try {
          await updateUser(currentUser?.id || '', { mfa_enabled: false, mfa_secret: null });
          setIsMFAEnabled(false);
          toast.success('Multi-Factor Authentication disabled');
        } catch (error) {
          toast.error('Failed to disable MFA');
        } finally {
          setIsSaving(false);
        }
      }
    }
  };

  const handleVerifyAndEnableMFA = async () => {
    if (!mfaCode || mfaCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    const isValid = await verifyToken(mfaCode, mfaSecret);
    if (!isValid) {
      toast.error('Invalid code. Please try again.');
      return;
    }

    setIsSaving(true);
    try {
      await updateUser(currentUser?.id || '', { mfa_enabled: true, mfa_secret: mfaSecret });
      setIsMFAEnabled(true);
      setIsMFASetupOpen(false);
      toast.success('Multi-Factor Authentication enabled successfully');
    } catch (error) {
      toast.error('Failed to enable MFA');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Card className="relative overflow-hidden backdrop-blur-sm border-white/10 hover:shadow-lg transition-all duration-300">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-transparent" />

        <CardHeader className="relative z-10">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-600" />
            Security & Protection
          </CardTitle>
          <CardDescription>
            Manage your account security and authentication methods
          </CardDescription>
        </CardHeader>

        <CardContent className="relative z-10 space-y-6">
          {/* Password Section */}
          <div className="space-y-4 pb-6 border-b border-border/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <Lock className="h-5 w-5 text-red-600 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold">Password</h4>
                  <p className="text-sm text-muted-foreground">
                    Last changed over 90 days ago. Consider updating your password regularly.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setIsPasswordDialogOpen(true)}
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                disabled={isSaving || isLoading}
              >
                Change
              </Button>
            </div>
          </div>

          {/* PIN Lock Section */}
          <PinSetupCard isLoading={isLoading} />

          {/* MFA Section */}
          <div className="flex items-center justify-between p-4 bg-indigo-500/5 rounded-lg border border-indigo-200/30 dark:border-indigo-800/30 gap-4">
            <div className="flex items-start gap-3 flex-1">
              <Smartphone className="h-5 w-5 text-indigo-600 mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-semibold">Multi-Factor Authentication</h4>
                <p className="text-sm text-muted-foreground mr-2">
                  Add an extra layer of security to your account
                </p>
              </div>
            </div>
            <Switch
              checked={isMFAEnabled}
              onCheckedChange={handleMFAToggle}
              disabled={isSaving || isLoading}
            />
          </div>

          {/* Security Alert */}
          <div className="flex gap-3 p-4 bg-amber-500/10 rounded-lg border border-amber-200/30 dark:border-amber-800/30">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-900 dark:text-amber-200">
                Security Recommendation
              </p>
              <p className="text-amber-800 dark:text-amber-300 mt-1">
                Keep your password strong and unique. Never share your password with anyone.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Password Change Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md" showCloseLeft>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 ml-6">
              <Lock className="h-5 w-5 text-red-600" />
              Change Password
            </DialogTitle>
            <DialogDescription>
              Enter your current password and then choose a new, secure password
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Current Password */}
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                placeholder="Enter your current password"
                disabled={isSaving}
              />
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                placeholder="Enter your new password"
                disabled={isSaving}
              />
              {passwordForm.newPassword && (
                <PasswordStrengthMeter password={passwordForm.newPassword} />
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Confirm your new password"
                disabled={isSaving}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPasswordDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePasswordChange}
              disabled={isSaving || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSaving ? 'Changing...' : 'Change Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MFA Setup Dialog */}
      <Dialog open={isMFASetupOpen} onOpenChange={setIsMFASetupOpen}>
        <DialogContent className="sm:max-w-md" showCloseLeft>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 ml-6">
              <Smartphone className="h-5 w-5 text-indigo-600" />
              Setup Multi-Factor Authentication
            </DialogTitle>
            <DialogDescription>
              Scan the code with your authenticator app (like Google Authenticator) or enter the secret key manually.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="flex flex-col items-center justify-center space-y-4">
              {qrCodeUrl && (
                <div className="bg-white p-2 rounded-lg border border-border">
                  <img src={qrCodeUrl} alt="MFA QR Code" className="w-48 h-48" />
                </div>
              )}
              <div className="bg-muted p-4 rounded-md text-center w-full">
                <p className="text-xs text-muted-foreground mb-2">Secret Key (if you can't scan)</p>
                <code className="text-sm font-mono font-bold tracking-wider select-all break-all">
                  {mfaSecret}
                </code>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mfa-code">Verification Code</Label>
              <Input
                id="mfa-code"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                placeholder="000000"
                className="text-center text-2xl tracking-widest"
                maxLength={6}
              />
              <p className="text-xs text-muted-foreground text-center">
                Enter the 6-digit code from your app to verify setup.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsMFASetupOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleVerifyAndEnableMFA}
              disabled={isSaving || mfaCode.length !== 6}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {isSaving ? 'Verifying...' : 'Verify & Enable'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SecurityPanel;
