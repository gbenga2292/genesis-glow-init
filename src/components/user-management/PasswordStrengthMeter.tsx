import React, { useMemo } from 'react';
import { Progress } from '@/components/ui/progress';

export interface PasswordStrengthMeterProps {
  password: string;
  showLabel?: boolean;
  className?: string;
}

export interface PasswordStrength {
  score: number; // 0-100
  level: 'weak' | 'fair' | 'good' | 'strong';
  label: string;
  color: string;
  feedback: string[];
}

export const calculatePasswordStrength = (password: string): PasswordStrength => {
  let score = 0;
  const feedback: string[] = [];

  if (!password) {
    return {
      score: 0,
      level: 'weak',
      label: 'No Password',
      color: 'bg-red-500',
      feedback: ['Enter a password']
    };
  }

  // Length scoring (max 30 points)
  if (password.length >= 8) score += 10;
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;
  else if (password.length < 8) {
    feedback.push('Use at least 8 characters');
  }

  // Lowercase letters (max 15 points)
  if (/[a-z]/.test(password)) {
    score += 15;
  } else {
    feedback.push('Add lowercase letters');
  }

  // Uppercase letters (max 15 points)
  if (/[A-Z]/.test(password)) {
    score += 15;
  } else {
    feedback.push('Add uppercase letters');
  }

  // Numbers (max 15 points)
  if (/\d/.test(password)) {
    score += 15;
  } else {
    feedback.push('Add numbers');
  }

  // Special characters (max 10 points)
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 10;
  } else {
    feedback.push('Add special characters (!@#$%^&*)');
  }

  // Cap score at 100
  score = Math.min(score, 100);

  // Determine level
  let level: 'weak' | 'fair' | 'good' | 'strong';
  let label: string;
  let color: string;

  if (score < 40) {
    level = 'weak';
    label = 'Weak';
    color = 'bg-red-500';
  } else if (score < 60) {
    level = 'fair';
    label = 'Fair';
    color = 'bg-yellow-500';
  } else if (score < 80) {
    level = 'good';
    label = 'Good';
    color = 'bg-blue-500';
  } else {
    level = 'strong';
    label = 'Strong';
    color = 'bg-green-500';
  }

  return {
    score,
    level,
    label,
    color,
    feedback: feedback.slice(0, 2) // Show max 2 feedback items
  };
};

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({
  password,
  showLabel = true,
  className = ''
}) => {
  const strength = useMemo(() => calculatePasswordStrength(password), [password]);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="space-y-1">
        <Progress 
          value={strength.score} 
          className="h-2"
        />
        {showLabel && (
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Password Strength</span>
            <span className={`font-medium ${
              strength.level === 'weak' ? 'text-red-600' :
              strength.level === 'fair' ? 'text-yellow-600' :
              strength.level === 'good' ? 'text-blue-600' :
              'text-green-600'
            }`}>
              {strength.label}
            </span>
          </div>
        )}
      </div>
      
      {strength.feedback.length > 0 && (
        <ul className="text-xs text-muted-foreground space-y-1">
          {strength.feedback.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-amber-600 mt-0.5">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PasswordStrengthMeter;
