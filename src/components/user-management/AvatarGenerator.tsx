import React, { useMemo } from 'react';

export interface AvatarGeneratorProps {
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  avatarColor?: string;
  className?: string;
  onClick?: () => void;
}

const AVATAR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DFE6E9', '#A29BFE', '#FD79A8', '#FDCB6E', '#6C5CE7',
  '#00B894', '#FF7675', '#74B9FF', '#81ECEC', '#55EFC4',
  '#FD79A8', '#FDCB6E', '#6C5CE7', '#A29BFE', '#FF6348',
];

export const generateAvatarColor = (name?: string): string => {
  // Create a hash from the name to consistently generate the same color
  const safeName = name || 'Unknown';
  let hash = 0;
  for (let i = 0; i < safeName.length; i++) {
    hash = safeName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
};

export const getInitials = (name?: string): string => {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);
};

export const AvatarGenerator: React.FC<AvatarGeneratorProps> = ({
  name,
  size = 'md',
  avatarColor,
  className = '',
  onClick
}) => {
  const safeName = name || 'Unknown User';
  const initials = useMemo(() => getInitials(safeName), [safeName]);
  const bgColor = useMemo(() => avatarColor || generateAvatarColor(safeName), [safeName, avatarColor]);

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg'
  };

  const fontSize = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg'
  };

  return (
    <div
      className={`
        flex items-center justify-center rounded-full font-semibold
        text-white cursor-default select-none transition-all duration-200
        ${sizeClasses[size]}
        ${onClick ? 'cursor-pointer hover:shadow-lg transform hover:scale-105' : ''}
        ${className}
      `}
      style={{ 
        backgroundColor: bgColor,
        boxShadow: onClick ? '0 2px 8px rgba(0, 0, 0, 0.1)' : 'none'
      }}
      onClick={onClick}
      title={name}
    >
      <span className={fontSize[size]}>{initials}</span>
    </div>
  );
};

export default AvatarGenerator;
