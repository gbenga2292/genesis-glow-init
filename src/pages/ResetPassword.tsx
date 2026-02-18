import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { dataService } from '@/services/dataService';
import { useAuth } from '@/contexts/AuthContext';

const ResetPassword = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState<'error' | 'success'>('error');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // Check if we have a session (password reset flow logs user in)
    // Actually, Supabase email link redirects to app with #access_token=...
    // The AuthProvider should pick this up and set isAuthenticated = true.
    // BUT for updatePassword to work, we must be authenticated.

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        setIsLoading(true);

        if (password !== confirmPassword) {
            setMessageType('error');
            setMessage('Passwords do not match');
            setIsLoading(false);
            return;
        }

        if (password.length < 6) {
            setMessageType('error');
            setMessage('Password must be at least 6 characters long');
            setIsLoading(false);
            return;
        }

        try {
            const result = await dataService.auth.updatePassword(password);

            if (result.success) {
                setMessageType('success');
                setMessage('Password updated successfully! You can now login with your new password.');
                setIsSuccess(true);
                setTimeout(() => navigate('/login'), 3000);
            } else {
                setMessageType('error');
                setMessage(result.message || 'Failed to update password');
            }
        } catch (error) {
            logger.error('Reset password failed', error);
            setMessageType('error');
            setMessage('An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md shadow-medium">
                <CardHeader className="text-center space-y-4">
                    <div className="mx-auto w-32 h-10 rounded-xl flex items-center justify-center">
                        <img src="./logo.png" alt="Logo" className="w-full h-full object-contain" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-foreground">
                        Set New Password
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isSuccess ? (
                        <div className="space-y-6 text-center">
                            <div className="p-4 bg-green-50 text-green-700 rounded-md border border-green-200">
                                <p className="font-medium">{message}</p>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Redirecting to login...
                            </p>
                            <Button asChild className="w-full">
                                <Link to="/login">Go to Login</Link>
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="text-sm text-center text-muted-foreground mb-4">
                                Please enter your new password below.
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">New Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    required
                                    autoFocus
                                    minLength={6}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm new password"
                                    required
                                    minLength={6}
                                />
                            </div>

                            {message && (
                                <Alert variant={messageType === 'error' ? 'destructive' : 'default'}>
                                    <AlertDescription>{message}</AlertDescription>
                                </Alert>
                            )}

                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? 'Updating...' : 'Update Password'}
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default ResetPassword;
