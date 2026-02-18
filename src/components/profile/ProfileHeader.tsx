import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Camera, LogOut, Sparkles, PenLine } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface ProfileHeaderProps {
  onLogout: () => void;
  onAvatarChange?: (avatarData: string) => void;
}

const getRoleColor = (role: string | undefined) => {
  const colors: Record<string, { bg: string; text: string; gradient: string }> = {
    admin: { bg: 'bg-red-100', text: 'text-red-800', gradient: 'from-red-600 to-rose-600' },
    manager: { bg: 'bg-blue-100', text: 'text-blue-800', gradient: 'from-blue-600 to-indigo-600' },
    supervisor: { bg: 'bg-purple-100', text: 'text-purple-800', gradient: 'from-purple-600 to-indigo-600' },
    staff: { bg: 'bg-green-100', text: 'text-green-800', gradient: 'from-green-600 to-emerald-600' },
    default: { bg: 'bg-slate-100', text: 'text-slate-800', gradient: 'from-slate-600 to-blue-600' }
  };
  return colors[role as string] || colors.default;
};

const getRoleLabel = (role: string | undefined) => {
  if (!role) return 'User';
  return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ onLogout, onAvatarChange }) => {
  const { currentUser, updateUserAvatar } = useAuth();
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);

  // Custom Color State
  const [customColor, setCustomColor] = useState<string | null>(() => {
    return currentUser?.id ? localStorage.getItem(`profile_color_${currentUser.id}`) : null;
  });

  const roleColors = getRoleColor(currentUser?.role);

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setCustomColor(color);
    if (currentUser?.id) {
      localStorage.setItem(`profile_color_${currentUser.id}`, color);
    }
  };

  const handleAvatarUpload = () => {
    fileInputRef.current?.click();
  };

  // Compress image to reduce database size
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Create canvas for compression
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          // Calculate new dimensions (max 400x400 for avatars)
          const maxSize = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;

          // Draw and compress
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to base64 with quality compression (0.8 = 80% quality)
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
          resolve(compressedBase64);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB');
      return;
    }

    setIsUploadingAvatar(true);

    try {
      // Compress the image
      const compressedBase64 = await compressImage(file);

      // Optimistic update
      localStorage.setItem(`avatar_${currentUser?.id}`, compressedBase64);
      onAvatarChange?.(compressedBase64);

      if (currentUser?.id) {
        await updateUserAvatar(currentUser.id, compressedBase64);
        toast.success('Avatar updated successfully');
      }
    } catch (error) {
      console.error('Failed to process avatar', error);
      toast.error('Failed to process image');
    } finally {
      setIsUploadingAvatar(false);
      // Reset input to allow re-uploading the same file
      event.target.value = '';
    }
  };

  const lastActiveTime = currentUser?.lastActive
    ? formatDistanceToNow(new Date(currentUser.lastActive), { addSuffix: true })
    : 'Never';

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-8 md:p-12 backdrop-blur-xl border border-white/10 shadow-2xl transition-colors duration-500`}
      style={{
        background: customColor || undefined
      }}
    >
      {/* Default Gradient Fallback if no custom color */}
      {!customColor && (
        <div className={`absolute inset-0 bg-gradient-to-br ${roleColors.gradient} -z-10`} />
      )}

      {/* Glassmorphic Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-40 pointer-events-none" />
      <div className="absolute -top-20 -right-20 h-40 w-40 bg-white/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 h-40 w-40 bg-white/5 rounded-full blur-3xl pointer-events-none" />

      {/* Color Picker Control */}
      <div className="absolute top-4 right-4 z-20">
        <Button
          variant="ghost"
          size="icon"
          className="text-white/70 hover:bg-white/20 hover:text-white rounded-full h-8 w-8 transition-all"
          onClick={() => colorInputRef.current?.click()}
          title="Customize Color"
        >
          <PenLine className="h-4 w-4" />
        </Button>
        <input
          ref={colorInputRef}
          type="color"
          className="invisible absolute top-0 right-0 w-0 h-0"
          onChange={handleColorChange}
          value={customColor || '#ef4444'}
        />
      </div>

      <div className="relative z-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          {/* Avatar and Basic Info */}
          <div className="flex items-end gap-6">
            {/* Avatar */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <Avatar className="h-32 w-32 border-4 border-white/30 shadow-2xl relative">
                <AvatarImage src={currentUser?.avatar || localStorage.getItem(`avatar_${currentUser?.id}`) || undefined} />
                <AvatarFallback className="text-5xl bg-white/20 text-white font-bold">
                  {currentUser?.name?.charAt(0).toUpperCase() || currentUser?.username?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <Button
                size="icon"
                variant="secondary"
                className="absolute -bottom-2 -right-2 rounded-full shadow-lg h-10 w-10 bg-white/90 hover:bg-white"
                onClick={handleAvatarUpload}
                disabled={isUploadingAvatar}
              >
                <Camera className="h-5 w-5 text-slate-700" />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Name and Role */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">
                  {currentUser?.name || currentUser?.username}
                </h1>
                <Badge className="bg-white/30 text-white border border-white/50 backdrop-blur text-sm md:text-base">
                  <Sparkles className="h-3 w-3 mr-2" />
                  {getRoleLabel(currentUser?.role)}
                </Badge>
              </div>
              <p className="text-white/80 text-sm md:text-base">
                @{currentUser?.username}
              </p>
              <p className="text-white/70 text-xs md:text-sm">
                Last active: {lastActiveTime}
              </p>
            </div>
          </div>

          {/* Actions */}
          <Button
            variant="secondary"
            size="lg"
            className="bg-white/90 text-slate-700 hover:bg-white shadow-lg self-start md:self-auto"
            onClick={onLogout}
          >
            <LogOut className="mr-2 h-5 w-5" />
            Log Out
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;
