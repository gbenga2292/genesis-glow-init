import React, { useState } from 'react';
import { logger } from '@/lib/logger';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Check, X, ShieldAlert } from 'lucide-react';

const INVITE_SECRET = 'dcel-inv-2024';

const SignUp = () => {
    const { isAuthenticated, registerUser } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const inviteCode = searchParams.get('invite');

    // Validate invite code
    const isValidInvite = inviteCode === INVITE_SECRET;

    const [formData, setFormData] = useState({
        name: '',
        displayUsername: '',
        username: '',
        password: '',
        confirmPassword: ''
    });
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState<'error' | 'success'>('error');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const [validations, setValidations] = useState({
        minLength: false,
        hasUpper: false,
        hasLower: false,
        hasNumber: false,
        hasSpecial: false,
    });
    const [isValidPassword, setIsValidPassword] = useState(false);

    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    // Show access denied if no valid invite
    if (!isValidInvite) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <Card className="w-full max-w-md shadow-medium">
                    <CardHeader className="text-center space-y-4">
                        <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
                            <ShieldAlert className="h-7 w-7 text-destructive" />
                        </div>
                        <CardTitle className="text-xl font-bold text-foreground">
                            Invite Required
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-4">
                        <p className="text-muted-foreground text-sm">
                            Registration is by invitation only. Please contact your administrator to receive an invite link.
                        </p>
                        <Button onClick={() => navigate('/login')} variant="outline" className="w-full">
                            Back to Login
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const checkPassword = (pass: string) => {
        const checks = {
            minLength: pass.length >= 8,
            hasUpper: /[A-Z]/.test(pass),
            hasLower: /[a-z]/.test(pass),
            hasNumber: /[0-9]/.test(pass),
            hasSpecial: /[^A-Za-z0-9]/.test(pass),
        };
        setValidations(checks);
        return Object.values(checks).every(Boolean);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));

        if (id === 'password') {
            const isValid = checkPassword(value);
            setIsValidPassword(isValid);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        setIsLoading(true);

        if (!isValidPassword) {
            setMessageType('error');
            setMessage('Please meet all password requirements');
            setIsLoading(false);
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setMessageType('error');
            setMessage('Passwords do not match');
            setIsLoading(false);
            return;
        }

        if (!formData.username.trim().endsWith('@dewaterconstruct.com')) {
            setMessageType('error');
            setMessage('Registration restricted to @dewaterconstruct.com emails only');
            setIsLoading(false);
            return;
        }

        try {
            const result = await registerUser({
                name: formData.name,
                displayUsername: formData.displayUsername,
                username: formData.username.trim(),
                password: formData.password,
                role: 'site_worker'
            });

            if (result.success) {
                setMessageType('success');
                setMessage(result.message || 'Account created successfully! Please check your email to verify your account before logging in.');
                setIsSuccess(true);
            } else {
                setMessageType('error');
                setMessage(result.message || 'Failed to create account');
            }
        } catch (error) {
            logger.error('Registration failed', error);
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
                        Sign Up
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isSuccess ? (
                        <div className="space-y-6 text-center">
                            <div className="p-4 bg-green-50 text-green-700 rounded-md border border-green-200">
                                <p className="font-medium">{message}</p>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Once you have verified your email, you can proceed to login.
                            </p>
                            <Button onClick={() => navigate('/login')} className="w-full">
                                Back to Login
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="John Doe"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="displayUsername">Username</Label>
                                <Input
                                    id="displayUsername"
                                    type="text"
                                    value={formData.displayUsername}
                                    onChange={handleChange}
                                    placeholder="johndoe"
                                    required
                                />
                                <p className="text-xs text-muted-foreground">
                                    You can login with either this username or your email
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="username">Email Address</Label>
                                <Input
                                    id="username"
                                    type="email"
                                    value={formData.username}
                                    onChange={handleChange}
                                    placeholder="you@dewaterconstruct.com"
                                    required
                                />
                                <p className="text-xs text-muted-foreground">
                                    Must be a valid @dewaterconstruct.com email
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="Create a password"
                                    required
                                />
                                {formData.password && (
                                    <div className="text-xs space-y-1 p-2 bg-muted/50 rounded-md mt-2">
                                        <p className="font-medium mb-2">Password must contain:</p>
                                        <div className="grid grid-cols-2 gap-1">
                                            <div className={`flex items-center gap-1.5 ${validations.minLength ? 'text-green-600' : 'text-muted-foreground'}`}>
                                                {validations.minLength ? <Check size={12} /> : <X size={12} />}
                                                <span>8+ chars</span>
                                            </div>
                                            <div className={`flex items-center gap-1.5 ${validations.hasUpper ? 'text-green-600' : 'text-muted-foreground'}`}>
                                                {validations.hasUpper ? <Check size={12} /> : <X size={12} />}
                                                <span>Uppercase</span>
                                            </div>
                                            <div className={`flex items-center gap-1.5 ${validations.hasLower ? 'text-green-600' : 'text-muted-foreground'}`}>
                                                {validations.hasLower ? <Check size={12} /> : <X size={12} />}
                                                <span>Lowercase</span>
                                            </div>
                                            <div className={`flex items-center gap-1.5 ${validations.hasNumber ? 'text-green-600' : 'text-muted-foreground'}`}>
                                                {validations.hasNumber ? <Check size={12} /> : <X size={12} />}
                                                <span>Number</span>
                                            </div>
                                            <div className={`flex items-center gap-1.5 ${validations.hasSpecial ? 'text-green-600' : 'text-muted-foreground'}`}>
                                                {validations.hasSpecial ? <Check size={12} /> : <X size={12} />}
                                                <span>Special char</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirm Password</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="Confirm your password"
                                    required
                                    className={formData.confirmPassword && formData.password !== formData.confirmPassword ? 'border-destructive' : ''}
                                />
                                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                                    <p className="text-xs text-destructive">Passwords do not match</p>
                                )}
                            </div>

                            {message && !isSuccess && (
                                <Alert variant={messageType === 'error' ? 'destructive' : 'default'}>
                                    <AlertDescription>{message}</AlertDescription>
                                </Alert>
                            )}

                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? 'Creating Account...' : 'Sign Up'}
                            </Button>

                            <div className="text-center text-sm text-muted-foreground pt-2">
                                Already have an account?{' '}
                                <Link to="/login" className="text-primary hover:underline font-medium">
                                    Login
                                </Link>
                            </div>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
export default SignUp;
