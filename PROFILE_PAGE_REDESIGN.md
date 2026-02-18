# Profile Page Redesign: "Personal Command Center"

## Overview

The DCEL Inventory profile page has been completely redesigned as a **"Personal Command Center"** — a modern, glass-morphic interface that reflects the premium aesthetic of the application while providing comprehensive user management, security controls, and personalization options.

## Design Philosophy

### Glassmorphic Elegance
- **Deep Theme Integration**: Uses glassmorphic cards with frosted-glass effects and semi-transparent gradients
- **Unified Color Palette**: Blue-to-indigo accent gradients for primary actions, with role-specific color coding
- **Typography**: Clean, professional typography using Tailwind's default font family
- **Micro-interactions**: Smooth hover states, transitions, and loading indicators throughout

### Layout Structure

```
┌─────────────────────────────────────────────────────┐
│  PROFILE HEADER (Full Width)                        │
│  ├─ Large Avatar (32x32)                            │
│  ├─ User Name + Role Badge                          │
│  ├─ Last Active Time                                │
│  └─ Logout Button                                   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  STAT CARDS (4-Column Grid)                         │
│  ├─ Assets Managed                                  │
│  ├─ Waybills Signed                                 │
│  ├─ Total Activity                                  │
│  └─ Team Members                                    │
└─────────────────────────────────────────────────────┘

┌──────────────────────────┬──────────────────────────┐
│  LEFT COLUMN (1/3 width) │  RIGHT COLUMN (2/3 width)│
├──────────────────────────┼──────────────────────────┤
│ ◆ Login History          │ ◆ Personal Information   │
│ ◆ Role & Permissions     │ ◆ Security & Protection  │
│                          │ ◆ Preferences & Settings │
└──────────────────────────┴──────────────────────────┘
```

## Component Architecture

### 1. **ProfileHeader**
**File**: `src/components/profile/ProfileHeader.tsx`

Displays the user's profile information with glassmorphic background.

**Features**:
- Large avatar with upload capability
- User name and role badge
- Last active timestamp (integrated with activity tracking)
- Logout button with gradient background
- Avatar upload with base64 conversion
- Responsive design (stacks on mobile)

**Props**:
```typescript
interface ProfileHeaderProps {
  onLogout: () => void;
  onAvatarChange?: (avatarData: string) => void;
}
```

---

### 2. **StatCards**
**File**: `src/components/profile/StatCards.tsx`

Four cards showing user's impact and engagement metrics.

**Features**:
- Responsive grid (1 col mobile, 2 cols tablet, 4 cols desktop)
- Color-coded stat cards (blue, indigo, purple, green)
- Trend indicators (up/down/neutral)
- Icon and label system
- Loading state support

**Props**:
```typescript
interface StatCardsProps {
  stats: StatCard[];
  isLoading?: boolean;
}

interface StatCard {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  color: 'blue' | 'indigo' | 'purple' | 'green';
}
```

**Sample Data**:
```typescript
const stats = [
  { icon: <Package />, label: "Assets Managed", value: "245", change: "+12% this month", trend: 'up', color: 'blue' },
  { icon: <CheckCircle2 />, label: "Waybills Signed", value: "89", change: "+5 this week", trend: 'up', color: 'green' },
  { icon: <Zap />, label: "Total Activity", value: "1,234", change: "All time", trend: 'neutral', color: 'indigo' },
  { icon: <Users />, label: "Team Members", value: "12", change: "In your group", trend: 'neutral', color: 'purple' },
];
```

---

### 3. **PersonalInfoCard**
**File**: `src/components/profile/PersonalInfoCard.tsx`

Editable personal information section with inline editing.

**Features**:
- Toggle between view and edit modes
- Inline form editing for name, email, bio
- Icon-based field display
- Cancel and save buttons
- Integration with AuthContext for updates

**Fields**:
- Full Name (required)
- Email Address (required)
- Bio (optional, expandable textarea)

**Props**:
```typescript
interface PersonalInfoCardProps {
  onSave?: (data: { name: string; email: string; bio?: string }) => Promise<void>;
  isLoading?: boolean;
}
```

---

### 4. **SecurityPanel**
**File**: `src/components/profile/SecurityPanel.tsx`

Comprehensive security management with password changes and 2FA.

**Features**:
- Password change dialog
- Password strength meter integration
- Current password verification
- New password confirmation
- Two-Factor Authentication toggle
- Security recommendations

**Dialogs**:
- Change Password Dialog (modal)
  - Current password input
  - New password input with strength meter
  - Confirm password input
  - Loading state during submission

**Props**:
```typescript
interface SecurityPanelProps {
  onPasswordChange?: (data: { currentPassword: string; newPassword: string }) => Promise<void>;
  isLoading?: boolean;
}
```

---

### 5. **PasswordStrengthMeter**
**File**: `src/components/profile/PasswordStrengthMeter.tsx`

Visual password strength validator with requirements checklist.

**Scoring System**:
- Length >= 8 characters
- Uppercase letters
- Lowercase letters
- Numbers
- Special characters

**Strength Levels**:
- None (0%): Gray
- Weak (25%): Red
- Fair (50%): Yellow
- Good (75%): Blue
- Strong (100%): Green

**Props**:
```typescript
interface PasswordStrengthMeterProps {
  password: string;
  showLabel?: boolean;
}
```

---

### 6. **PreferencesCard**
**File**: `src/components/profile/PreferencesCard.tsx`

Theme and notification preferences management.

**Appearance Settings**:
- Light Mode
- Dark Mode
- System (auto-detect)

**Notification Preferences**:
- Email Notifications (toggle)
- In-App Notifications (toggle)
- Low Stock Alerts (toggle)
- Waybill Status Updates (toggle)
- Weekly Reports (toggle)

**Props**:
```typescript
interface PreferencesCardProps {
  isLoading?: boolean;
}
```

---

### 7. **LoginHistoryCard**
**File**: `src/components/profile/LoginHistoryCard.tsx`

Recent login activity and device information.

**Features**:
- List of last 5 logins
- Device information display
- IP address display
- Location information
- Login type badge (Password/Magic Link/OAuth)
- Time ago relative formatting
- Refresh button

**Login Record Structure**:
```typescript
interface LoginRecord {
  id: string;
  timestamp: string;
  deviceInfo?: string;
  ipAddress?: string;
  location?: string;
  loginType?: 'password' | 'magic_link' | 'oauth';
}
```

---

### 8. **PermissionsCard**
**File**: `src/components/profile/PermissionsCard.tsx`

Role clarity with explicit capability matrix.

**Supported Roles**:
1. **Administrator** (Red gradient)
   - Create/Delete Users
   - Edit Company Settings
   - Access All Reports
   - Manage Permissions
   - View Audit Logs
   - Reset Passwords
   - Export Data

2. **Manager** (Blue gradient)
   - Create Waybills
   - Assign Assets
   - View Reports
   - Manage Team Members
   - ❌ Delete Waybills
   - ❌ Edit Settings
   - ❌ Manage Global Users

3. **Supervisor** (Purple gradient)
   - Create Waybills
   - View Reports
   - Assign Assets
   - Approve Returns
   - ❌ Delete Waybills
   - ❌ Manage Users
   - ❌ Edit Settings

4. **Staff** (Green gradient)
   - Create Waybills
   - View Own Reports
   - Submit Returns
   - View Assets
   - ❌ Assign Assets
   - ❌ Delete Records
   - ❌ Manage Users

**Props**:
```typescript
interface PermissionsCardProps {
  isLoading?: boolean;
}
```

---

## Page Layout: ProfilePage

**File**: `src/pages/ProfilePage.tsx`

Complete page implementation using all components above.

**Layout Hierarchy**:
```
ProfilePage
├── Sidebar (navigation)
├── Header (breadcrumb area)
└── Main Content
    ├── ProfileHeader
    ├── StatCards (4-column grid)
    └── Two-Column Layout
        ├── Left Column (lg:col-span-1)
        │  ├── LoginHistoryCard
        │  └── PermissionsCard
        └── Right Column (lg:col-span-2)
           ├── PersonalInfoCard
           ├── SecurityPanel
           └── PreferencesCard
```

**Responsive Breakpoints**:
- **Mobile** (< 1024px): Single column, full width
- **Tablet** (1024px-1279px): Light two-column
- **Desktop** (≥ 1280px): Full three-section layout

---

## State Management

### ProfilePage State
```typescript
const [avatarUrl, setAvatarUrl] = useState<string>("");
const [isLoading, setIsLoading] = useState(false);

// Avatar is loaded from localStorage or currentUser
useEffect(() => {
  const savedAvatar = localStorage.getItem(`avatar_${currentUser?.id}`);
  if (savedAvatar) {
    setAvatarUrl(savedAvatar);
  }
}, [currentUser?.id]);
```

### Component-Level State
- **PersonalInfoCard**: Edit mode, form data
- **SecurityPanel**: Password dialog state, form inputs
- **PreferencesCard**: Theme selection, notification toggles
- **LoginHistoryCard**: Login history data, loading state

---

## Integration Points

### AuthContext Usage
```typescript
const { currentUser, updateUser, deleteUser, getLoginHistory, logout, updateLastActive } = useAuth();
```

### Available Hooks
- `useAuth()` - User and auth operations
- `useToast()` - Toast notifications (sonner)
- `useIsMobile()` - Mobile responsiveness
- `useNavigate()` - Route navigation

### Data Persistence
- **Avatar**: LocalStorage (`avatar_${userId}`)
- **Theme**: LocalStorage (`theme`)
- **Preferences**: Component state (can be extended to backend)
- **Login History**: Loaded via `getLoginHistory()` API call
- **User Updates**: Persisted via `updateUser()` API call

---

## Styling & Colors

### Glassmorphic Effects
```typescript
// Glass effect base
"backdrop-blur-sm border-white/10"
"bg-gradient-to-br from-{color}-500/5 via-transparent to-transparent"

// Applied to all cards for consistent aesthetic
```

### Role Colors
| Role | Color | Gradient |
|------|-------|----------|
| Admin | Red | from-red-600 to-pink-600 |
| Manager | Blue | from-blue-600 to-cyan-600 |
| Supervisor | Purple | from-purple-600 to-indigo-600 |
| Staff | Green | from-green-600 to-emerald-600 |
| User | Slate | from-slate-600 to-blue-600 |

### Stat Card Colors
- Blue: Assets
- Green: Completed actions
- Indigo: Activity/Stats
- Purple: Team-related

---

## Features Implemented

✅ **Identity & Personalization**
- Smart avatar upload (base64 conversion)
- Profile editing with inline form
- Role badge with gradient background
- Last active timestamp display

✅ **Security & Management**
- Secure password change flow
- Password strength meter with real-time feedback
- Current password verification
- Two-Factor Authentication toggle (UI ready)
- Security recommendations

✅ **Preferences & Localization**
- Theme switcher (Light/Dark/System)
- Granular notification preferences
- Email notifications toggle
- In-app notifications toggle
- Context-specific alerts (stock, waybills, etc.)

✅ **Role Clarity**
- Permission matrix per role
- Visual capability indicators (checkmarks/crosses)
- Contact admin CTA for upgrades
- Role-specific color coding

✅ **Activity Tracking**
- Login history display
- Device/IP information
- Location tracking support
- Time-ago formatting

✅ **Responsive Design**
- Mobile-first layout
- Tablet optimization
- Desktop multi-column layout
- Touch-friendly buttons and controls

---

## Future Enhancements

### Short Term
- [ ] Implement actual 2FA setup flow
- [ ] Add audit log viewer
- [ ] Implement activity export to CSV
- [ ] Add profile photo cropping
- [ ] Real login history API integration

### Medium Term
- [ ] Notification preferences backend sync
- [ ] Custom role management
- [ ] Bulk user operations
- [ ] Activity timeline with filtering
- [ ] Session management (logout other devices)

### Long Term
- [ ] Advanced analytics dashboard
- [ ] Compliance reporting
- [ ] Data export/GDPR compliance
- [ ] Account recovery flows
- [ ] Biometric authentication support

---

## Testing Checklist

### Avatar Upload
- [ ] Upload image < 5MB
- [ ] Reject non-image files
- [ ] Handle large files gracefully
- [ ] Persist across browser sessions

### Personal Info Editing
- [ ] Toggle edit mode smoothly
- [ ] Validate required fields
- [ ] Cancel without saving
- [ ] Save updates to backend

### Password Change
- [ ] Show strength meter in real-time
- [ ] Block weak passwords
- [ ] Verify password match
- [ ] Handle API failures gracefully

### Theme Switching
- [ ] Apply theme immediately
- [ ] Persist selection
- [ ] System detection works
- [ ] All components respect theme

### Responsive Testing
- [ ] Mobile: Single column layout
- [ ] Tablet: Two-column layout
- [ ] Desktop: Full three-section layout
- [ ] Buttons/forms work on touch

### Permissions Display
- [ ] Shows correct role
- [ ] Lists all capabilities
- [ ] Colors match role
- [ ] Admin CTA visible for non-admins

---

## Code Examples

### Using ProfilePage
```tsx
import ProfilePage from '@/pages/ProfilePage';

// In your router
<Route path="/profile" element={<ProfilePage />} />
```

### Customizing Stats
```tsx
const customStats = [
  {
    icon: <YourIcon />,
    label: "Custom Metric",
    value: 123,
    change: "+10% growth",
    trend: 'up' as const,
    color: 'blue' as const,
  },
  // ... more stats
];

<StatCards stats={customStats} />
```

### Adding New Preferences
```tsx
// In PreferencesCard
const [preferences, setPreferences] = useState({
  // ... existing
  newPreference: true, // Add this
});

// Then in JSX
<div className="flex items-center justify-between">
  <div>
    <p className="text-sm">New Preference Label</p>
  </div>
  <Switch
    checked={preferences.newPreference}
    onCheckedChange={(value) => 
      handlePreferenceChange('newPreference', value)
    }
  />
</div>
```

---

## File Structure

```
src/
├── pages/
│   └── ProfilePage.tsx ..................... Main page
├── components/
│   └── profile/
│       ├── index.ts ....................... Export file
│       ├── ProfileHeader.tsx .............. Avatar & intro
│       ├── StatCards.tsx .................. Metrics display
│       ├── PersonalInfoCard.tsx ........... Edit profile
│       ├── SecurityPanel.tsx .............. Password & 2FA
│       ├── PasswordStrengthMeter.tsx ...... Strength indicator
│       ├── PreferencesCard.tsx ............ Theme & notifications
│       ├── LoginHistoryCard.tsx ........... Activity history
│       └── PermissionsCard.tsx ............ Role permissions
└── hooks/
    └── use-theme.ts ....................... Theme management
```

---

## Performance Optimizations

- **Lazy Loading**: Components render on demand
- **Memoization**: Unnecessary re-renders prevented
- **LocalStorage Caching**: Avatar and theme cached locally
- **Responsive Images**: Avatar scales appropriately
- **Debounced Updates**: Form inputs debounced before API calls

---

## Accessibility

- ✅ ARIA labels on interactive elements
- ✅ Keyboard navigation support
- ✅ Color contrast ratios meet WCAG AA
- ✅ Touch targets >= 44x44px
- ✅ Loading states announced to screen readers
- ✅ Form validation messages are descriptive

---

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile browsers: iOS 12+, Android 8+

---

## Summary

The "Personal Command Center" profile page represents a **modern, premium approach** to user profile management. By combining glassmorphic design, comprehensive functionality, and thoughtful UX patterns, we've created a page that not only manages user data but **feels delightful to use**.

The modular component architecture ensures **maintainability** and **extensibility**, while the responsive design guarantees **accessibility** across all devices.
