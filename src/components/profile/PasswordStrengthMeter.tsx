import React, { useMemo } from 'react';
import { Progress } from '@/components/ui/progress';

interface PasswordStrengthMeterProps {
  password: string;
  showLabel?: boolean;
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ password, showLabel = true }) => {
  const { strength, percentage, label, color, feedback } = useMemo(() => {
    let score = 0;
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    };

    Object.values(checks).forEach(check => {
      if (check) score++;
    });

    const strengthLevels = [
      { min: 0, max: 0, label: 'None', color: 'bg-gray-300', percentage: 0 },
      { min: 1, max: 2, label: 'Weak', color: 'bg-red-500', percentage: 25 },
      { min: 3, max: 3, label: 'Fair', color: 'bg-yellow-500', percentage: 50 },
      { min: 4, max: 4, label: 'Good', color: 'bg-blue-500', percentage: 75 },
      { min: 5, max: 5, label: 'Strong', color: 'bg-green-500', percentage: 100 },
    ];

    const level = strengthLevels.find(l => score >= l.min && score <= l.max) || strengthLevels[0];

    const feedbackMessages = [];
    if (!checks.length) feedbackMessages.push('At least 8 characters');
    if (!checks.uppercase) feedbackMessages.push('Uppercase letter');
    if (!checks.lowercase) feedbackMessages.push('Lowercase letter');
    if (!checks.number) feedbackMessages.push('Number');
    if (!checks.special) feedbackMessages.push('Special character');

    return {
      strength: score,
      percentage: level.percentage,
      label: level.label,
      color: level.color,
      feedback: feedbackMessages,
    };
  }, [password]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        {showLabel && (
          <span className={`text-xs font-semibold ${color.replace('bg-', 'text-')}`}>
            {label}
          </span>
        )}
        <span className="text-xs text-muted-foreground">{percentage}%</span>
      </div>
      <Progress value={percentage} className="h-2" />
      {feedback.length > 0 && (
        <div className="text-xs text-muted-foreground space-y-1">
          {feedback.map((msg, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-50" />
              {msg}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PasswordStrengthMeter;
