import React, { useState } from 'react';
import { logger } from '@/lib/logger';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { dataService } from '@/services/dataService';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState<'error' | 'success'>('error');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        setIsLoading(true);

        try {
            const result = await dataService.auth.resetPasswordForEmail(email);

            if (result.success) {
                setMessageType('success');
                setMessage(result.message || 'Check your email for the password reset link.');
                setIsSuccess(true);
            } else {
                setMessageType('error');
                setMessage(result.message || 'Failed to send reset link');
            }
        } catch (error) {
            logger.error('Forgot password failed', error);
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
                        Reset Password
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isSuccess ? (
                        <div className="space-y-6 text-center">
                            <div className="p-4 bg-green-50 text-green-700 rounded-md border border-green-200">
                                <p className="font-medium">{message}</p>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Follow the instructions in the email to reset your password.
                            </p>
                            <Button asChild className="w-full">
                                <Link to="/login">Back to Login</Link>
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="text-sm text-center text-muted-foreground mb-4">
                                Enter your email address and we'll send you a link to reset your password.
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@dewaterconstruct.com"
                                    required
                                />
                            </div>

                            {message && (
                                <Alert variant={messageType === 'error' ? 'destructive' : 'default'}>
                                    <AlertDescription>{message}</AlertDescription>
                                </Alert>
                            )}

                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? 'Sending Link...' : 'Send Reset Link'}
                            </Button>

                            <div className="text-center text-sm text-muted-foreground pt-2">
                                <Link to="/login" className="text-primary hover:underline font-medium">
                                    Back to Login
                                </Link>
                            </div>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default ForgotPassword;
