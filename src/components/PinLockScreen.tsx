import React, { useState, useEffect } from 'react';
import { Lock, Shield, Delete, KeyRound } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PinLockScreenProps {
  onUnlock: () => void;
  onLogout: () => void;
  userName?: string;
  avatarLetter?: string;
}

export const PinLockScreen: React.FC<PinLockScreenProps> = ({ onUnlock, onLogout, userName, avatarLetter }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const maxLength = 4;

  const verifyPin = React.useCallback(async (enteredPin: string) => {
    setIsVerifying(true);
    try {
      const { default: bcrypt } = await import('bcryptjs');
      const storedUser = localStorage.getItem('currentUser');
      if (!storedUser) {
        setError('Session expired');
        setIsVerifying(false);
        return;
      }

      const userId = JSON.parse(storedUser).id;
      let pinHash = localStorage.getItem(`pin_hash_${userId}`);

      if (!pinHash) {
        try {
          const { supabase } = await import('@/integrations/supabase/client');
          const { data, error: dbError } = await (supabase as any)
            .from('users')
            .select('pin_hash')
            .eq('id', userId)
            .single();

          if (!dbError && data?.pin_hash) {
            pinHash = data.pin_hash;
            localStorage.setItem(`pin_hash_${userId}`, pinHash!);
          } else if (dbError) {
            console.error('Error fetching PIN hash:', dbError);
          } else if (!data?.pin_hash) {
            onUnlock();
            return;
          }
        } catch (err) {
          console.error('Network error checking PIN:', err);
        }
      }

      if (!pinHash) {
        setError('Offline: Cannot verify PIN. Connect to internet.');
        setIsVerifying(false);
        return;
      }

      const isMatch = await bcrypt.compare(enteredPin, pinHash);
      if (isMatch) {
        onUnlock();
      } else {
        setError('Incorrect PIN. Please try again.');
        setIsShaking(true);
        setTimeout(() => {
          setIsShaking(false);
          setPin('');
          setIsVerifying(false);
        }, 600);
      }
    } catch (e) {
      console.error('PIN verification error', e);
      setError('Verification failed. Please try again.');
      setPin('');
      setIsVerifying(false);
    }
  }, [onUnlock]);

  const handleDigit = React.useCallback((digit: string) => {
    if (isVerifying) return;
    setPin(prevPin => {
      if (prevPin.length >= maxLength) return prevPin;
      const newPin = prevPin + digit;
      if (newPin.length === maxLength) {
        setTimeout(() => verifyPin(newPin), 80);
      }
      return newPin;
    });
    setError('');
  }, [verifyPin, isVerifying]);

  const handleDelete = React.useCallback(() => {
    if (isVerifying) return;
    setPin(prev => prev.slice(0, -1));
    setError('');
  }, [isVerifying]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDigit, handleDelete]);

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'];

  return (
    <div className="fixed inset-0 z-[9999] flex" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── LEFT PANEL – Branding ── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[42%] relative overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.7) 60%, hsl(var(--background)) 100%)',
        }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 right-0 w-72 h-72 rounded-full opacity-10 translate-x-1/3 translate-y-1/3"
          style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)' }} />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }} />

        {/* Top logo area */}
        <div className="relative z-10 p-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-none">DCEL</p>
              <p className="text-white/60 text-xs mt-0.5">Asset Manager</p>
            </div>
          </div>
        </div>

        {/* Center content */}
        <div className="relative z-10 px-10 pb-4">
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-6">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white/80 text-xs font-medium">Session Locked</span>
            </div>
            <h1 className="text-4xl font-bold text-white leading-tight mb-3">
              Secure<br />Access Portal
            </h1>
            <p className="text-white/60 text-sm leading-relaxed max-w-xs">
              Your session has been locked for security. Enter your PIN to resume where you left off.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-col gap-2">
            {[
              { icon: '🔐', text: 'End-to-end encrypted' },
              { icon: '⚡', text: 'Works offline with cached PIN' },
              { icon: '🛡️', text: 'Auto-locks on inactivity' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-2.5 text-white/70 text-xs">
                <span className="text-base">{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="relative z-10 p-10">
          <p className="text-white/30 text-xs">© 2026 Dewatering Construction Etc Limited</p>
        </div>
      </div>

      {/* ── RIGHT PANEL – PIN Entry ── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-background relative">

        {/* Subtle background texture */}
        <div className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)',
            backgroundSize: '24px 24px'
          }} />

        <div className="relative z-10 w-full max-w-sm px-8 flex flex-col items-center">

          {/* Mobile-only brand badge */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <span className="font-bold text-foreground">DCEL Asset Manager</span>
          </div>

          {/* Avatar */}
          <div className="mb-5 flex flex-col items-center gap-3">
            <div className="relative">
              <div className="h-20 w-20 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center shadow-lg">
                <span className="text-2xl font-bold text-primary">
                  {avatarLetter || '?'}
                </span>
              </div>
              {/* Lock badge */}
              <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-amber-500 border-2 border-background flex items-center justify-center">
                <Lock className="h-3 w-3 text-white" />
              </div>
            </div>

            {userName && (
              <div className="text-center">
                <p className="text-base font-semibold text-foreground">{userName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Locked · Enter PIN to continue</p>
              </div>
            )}
          </div>

          {/* PIN Dots */}
          <div className={cn(
            "flex gap-4 my-5 transition-all duration-300",
            isShaking && "animate-[shake_0.5s_ease-in-out]"
          )}>
            {Array.from({ length: maxLength }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-3.5 w-3.5 rounded-full border-2 transition-all duration-200",
                  i < pin.length
                    ? "bg-primary border-primary scale-125 shadow-[0_0_8px_hsl(var(--primary)/0.5)]"
                    : "border-muted-foreground/30 bg-transparent"
                )}
              />
            ))}
          </div>

          {/* Error */}
          <div className="h-5 mb-4 text-center">
            {error && (
              <p className="text-xs text-destructive font-medium animate-in fade-in slide-in-from-top-1">
                {error}
              </p>
            )}
          </div>

          {/* Number Pad */}
          <div className="grid grid-cols-3 gap-3 w-full max-w-[260px]">
            {digits.map((digit, i) => {
              if (digit === '') return <div key={i} />;

              if (digit === 'delete') {
                return (
                  <button
                    key={i}
                    onClick={handleDelete}
                    disabled={isVerifying || pin.length === 0}
                    className={cn(
                      "h-14 w-14 mx-auto rounded-2xl flex items-center justify-center transition-all duration-150",
                      "text-muted-foreground hover:text-foreground hover:bg-muted/60 active:scale-95",
                      "disabled:opacity-30 disabled:cursor-not-allowed"
                    )}
                  >
                    <Delete className="h-5 w-5" />
                  </button>
                );
              }

              return (
                <button
                  key={i}
                  onClick={() => handleDigit(digit)}
                  disabled={isVerifying}
                  className={cn(
                    "h-14 w-14 mx-auto rounded-2xl flex items-center justify-center",
                    "text-lg font-semibold text-foreground transition-all duration-150",
                    "border border-border/60 bg-card/80 backdrop-blur-sm",
                    "hover:bg-primary/10 hover:border-primary/40 hover:text-primary hover:scale-105",
                    "active:scale-95 active:bg-primary/20",
                    "shadow-sm hover:shadow-md",
                    "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  )}
                >
                  {digit}
                </button>
              );
            })}
          </div>

          {/* Verifying indicator */}
          {isVerifying && (
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground animate-in fade-in">
              <div className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <span>Verifying…</span>
            </div>
          )}

          {/* Sign out */}
          <button
            onClick={onLogout}
            className="mt-8 text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
          >
            Sign out instead
          </button>
        </div>
      </div>

      {/* Shake animation */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-6px); }
          30% { transform: translateX(6px); }
          45% { transform: translateX(-5px); }
          60% { transform: translateX(5px); }
          75% { transform: translateX(-3px); }
          90% { transform: translateX(3px); }
        }
        .animate-\\[shake_0\\.5s_ease-in-out\\] {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
};
