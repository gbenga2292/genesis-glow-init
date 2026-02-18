import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { KeyRound, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase as supabaseClient } from '@/integrations/supabase/client';
import bcrypt from 'bcryptjs';

const supabase = supabaseClient as any;

interface PinSetupCardProps {
  isLoading?: boolean;
}

export const PinSetupCard: React.FC<PinSetupCardProps> = ({ isLoading = false }) => {
  const { currentUser } = useAuth();
  const [hasPinSet, setHasPinSet] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');

  useEffect(() => {
    checkPinStatus();
  }, [currentUser?.id]);

  const checkPinStatus = async () => {
    if (!currentUser?.id) return;
    try {
      const { data } = await supabase
        .from('users')
        .select('pin_hash')
        .eq('id', currentUser.id)
        .single();
      setHasPinSet(!!data?.pin_hash);
    } catch {
      // ignore
    }
  };

  const handleSetPin = async () => {
    if (step === 'enter') {
      if (pin.length !== 4) {
        toast.error('PIN must be exactly 4 digits');
        return;
      }
      setStep('confirm');
      return;
    }

    // Confirm step
    if (pin !== confirmPin) {
      toast.error('PINs do not match');
      setConfirmPin('');
      return;
    }

    setIsSaving(true);
    try {
      const pinHash = await bcrypt.hash(pin, 10);
      const { error } = await supabase
        .from('users')
        .update({ pin_hash: pinHash })
        .eq('id', currentUser?.id);

      if (error) throw error;

      // Update local cache so offline PIN works immediately
      if (currentUser?.id) {
        localStorage.setItem(`pin_hash_${currentUser.id}`, pinHash);
        localStorage.setItem(`pin_status_${currentUser.id}`, 'enabled');
      }

      toast.success('PIN set successfully! App will require PIN on reopen.');
      setHasPinSet(true);
      resetDialog();
    } catch (error) {
      toast.error('Failed to set PIN');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemovePin = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ pin_hash: null })
        .eq('id', currentUser?.id);

      if (error) throw error;

      // Update local cache
      if (currentUser?.id) {
        localStorage.removeItem(`pin_hash_${currentUser.id}`);
        localStorage.setItem(`pin_status_${currentUser.id}`, 'disabled');
      }

      toast.success('PIN removed');
      setHasPinSet(false);
      setIsRemoveDialogOpen(false);
    } catch {
      toast.error('Failed to remove PIN');
    } finally {
      setIsSaving(false);
    }
  };

  const resetDialog = () => {
    setIsDialogOpen(false);
    setPin('');
    setConfirmPin('');
    setStep('enter');
  };

  return (
    <>
      <div className="flex items-center justify-between p-4 bg-emerald-500/5 rounded-lg border border-emerald-200/30 dark:border-emerald-800/30 gap-4">
        <div className="flex items-start gap-3 flex-1">
          <KeyRound className="h-5 w-5 text-emerald-600 mt-1 flex-shrink-0" />
          <div>
            <h4 className="font-semibold">App Lock PIN</h4>
            <p className="text-sm text-muted-foreground">
              {hasPinSet
                ? 'PIN is active — app will lock on reopen'
                : 'Set a 4-digit PIN to lock the app when reopened'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {hasPinSet ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDialogOpen(true)}
                disabled={isSaving || isLoading}
              >
                Change
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsRemoveDialogOpen(true)}
                disabled={isSaving || isLoading}
                className="text-destructive hover:text-destructive"
              >
                Remove
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDialogOpen(true)}
              disabled={isSaving || isLoading}
            >
              Set PIN
            </Button>
          )}
        </div>
      </div>

      {/* Set/Change PIN Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetDialog(); }}>
        <DialogContent className="sm:max-w-sm" showCloseLeft>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 ml-6">
              <KeyRound className="h-5 w-5 text-emerald-600" />
              {hasPinSet ? 'Change PIN' : 'Set Up PIN'}
            </DialogTitle>
            <DialogDescription>
              {step === 'enter'
                ? 'Enter a 4-digit PIN to lock your app'
                : 'Re-enter your PIN to confirm'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {step === 'enter' ? (
              <div className="space-y-2">
                <Label htmlFor="pin-input">Enter 4-digit PIN</Label>
                <Input
                  id="pin-input"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  className="text-center text-2xl tracking-[1em] font-mono"
                  autoFocus
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="confirm-pin-input">Confirm PIN</Label>
                <Input
                  id="confirm-pin-input"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  className="text-center text-2xl tracking-[1em] font-mono"
                  autoFocus
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetDialog} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleSetPin}
              disabled={isSaving || (step === 'enter' ? pin.length !== 4 : confirmPin.length !== 4)}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isSaving ? 'Saving...' : step === 'enter' ? 'Next' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove PIN Dialog */}
      <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <DialogContent className="sm:max-w-sm" showCloseLeft>
          <DialogHeader>
            <DialogTitle className="ml-6">Remove PIN?</DialogTitle>
            <DialogDescription>
              Your app will no longer require a PIN when reopened.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRemoveDialogOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemovePin}
              disabled={isSaving}
            >
              {isSaving ? 'Removing...' : 'Remove PIN'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
