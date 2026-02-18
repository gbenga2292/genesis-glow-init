import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Copy, Check, Mail, Loader2, AlertCircle } from 'lucide-react';

export interface InviteFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInviteSent?: (email: string) => void;
}

export const InviteFlow: React.FC<InviteFlowProps> = ({
  open,
  onOpenChange,
  onInviteSent
}) => {
  const { generateInviteLink, sendInviteEmail } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [step, setStep] = useState<'form' | 'link'>('form');

  const handleGenerateLink = async () => {
    if (!email.trim() || !userName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all fields',
        variant: 'destructive'
      });
      return;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      // Generate invite link (placeholder - will be implemented in dataService)
      const baseUrl = window.location.origin + window.location.pathname;
      const linkToken = btoa(JSON.stringify({ email, timestamp: Date.now() }));
      const link = `${baseUrl}#/auth/accept-invite?token=${linkToken}`;

      setInviteLink(link);
      setStep('link');

      // In production, this would send the email via backend
      await sendInviteEmail(email, userName, link);

      toast({
        title: 'Invite Generated',
        description: `Invite link created for ${email}`
      });

      onInviteSent?.(email);
    } catch (error) {
      console.error('Failed to generate invite:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate invite link',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink).then(() => {
      setIsCopied(true);
      toast({
        title: 'Copied',
        description: 'Invite link copied to clipboard'
      });
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const handleReset = () => {
    setEmail('');
    setUserName('');
    setInviteLink('');
    setStep('form');
  };

  const handleClose = () => {
    handleReset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send User Invite
          </DialogTitle>
          <DialogDescription>
            {step === 'form'
              ? 'Create and send an invite to a new user'
              : 'Share this invite link with the new user'}
          </DialogDescription>
        </DialogHeader>

        {step === 'form' ? (
          <div className="space-y-4">
            <Alert className="border-blue-200 bg-blue-50">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-800 ml-2">
                The user will receive an invite link to set their own password. This is more secure than you setting it for them.
              </AlertDescription>
            </Alert>

            {/* User Name */}
            <div className="space-y-2">
              <Label htmlFor="user-name" className="text-sm">User Name *</Label>
              <Input
                id="user-name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="John Doe"
                disabled={isLoading}
              />
            </div>

            {/* Email Address */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                disabled={isLoading}
              />
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerateLink}
                disabled={isLoading}
                className="gap-2"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Generate Invite
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <Check className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-sm text-green-800 ml-2">
                Invite link created! Copy the link below and send it to the user.
              </AlertDescription>
            </Alert>

            {/* Invite Link Display */}
            <div className="space-y-2">
              <Label className="text-sm">Invite Link</Label>
              <div className="flex gap-2">
                <Input
                  value={inviteLink}
                  readOnly
                  className="text-xs"
                  style={{ wordBreak: 'break-all' }}
                />
                <Button
                  size="icon"
                  onClick={handleCopyLink}
                  className="flex-shrink-0"
                >
                  {isCopied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Link expires in 7 days
              </p>
            </div>

            {/* Email Notification */}
            <Alert className="border-amber-200 bg-amber-50">
              <Mail className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm text-amber-800 ml-2">
                An email has been sent to <strong>{email}</strong> with this link.
              </AlertDescription>
            </Alert>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleReset}
              >
                Send Another
              </Button>
              <Button
                onClick={handleClose}
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InviteFlow;
