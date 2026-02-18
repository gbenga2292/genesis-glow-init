# Security Vulnerability Report

## Executive Summary
A security review of the application has identified **Critical** and **High** severity vulnerabilities. The current authentication architecture is fundamentally insecure due to a custom implementation that exposes sensitive data (password hashes) to the public and relies on easily bypassable client-side controls.

## 🚨 Critical Vulnerabilities

### 1. Password Hash Exposure
**Location**: `src/services/dataService.ts` (Lines 66-70)
**Description**: The application performs authentication by querying a public `users` table from the client side using the Supabase anonymous key.
```typescript
const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .single();
```
**Impact**: To make this query work, Row Level Security (RLS) on the `users` table must be either disabled or configured to allow `SELECT` for the `anon` role. An attacker can extract **all users and their password hashes** by simply querying the table using the public API key.

### 2. Hardcoded Admin Backdoor (FIXED)
**Status**: ✅ **Remediated**
**Description**: The hardcoded credentials have been restricted to **Development Mode only** (`import.meta.env.DEV`).
**Impact**: This backdoor is no longer active in production builds, mitigating the risk of unauthorized admin access in the live application.


## 🔴 High Severity Vulnerabilities

### 3. Client-Side Only Authorization (Insecure Access Control)
**Location**: `src/contexts/AuthContext.tsx`
**Description**: Permissions are enforced solely in the frontend using the `hasPermission` function, which relies on `currentUser` state loaded from `localStorage`.
**Impact**: An attacker can manually edit `localStorage` to change their role from `staff` to `admin`. Since the database requests likely use the generic `anon` key without user-specific RLS, the backend will honor the request.

### 4. Custom Authentication Implementation
**Description**: The app manually handles password hashing (`bcryptjs`) and session management rather than using Supabase's built-in Auth (GoTrue).
**Impact**: This increases the attack surface (e.g., no built-in protection against brute force, no email verification, complex secure session handling) and leads to the design flaws mentioned above.

## ⚠️ Recommendations

### Immediate Actions (Hotfixes)
1.  **Remove the Hardcoded Backdoor**: Delete the `if (username === 'admin' ...)` block in `AuthContext.tsx`.
2.  **Migrate to Supabase Auth**: Instead of a custom `users` table, use `supabase.auth.signUp()` and `supabase.auth.signInWithPassword()`.
    *   This moves password handling to Supabase's secure infrastructure.
    *   It generates a secure JWT token for RLS policies.
3.  **Enable RLS Policies**: Ensure ALL tables (including `assets`, `waybills`, etc.) have Row Level Security enabled and checks `auth.uid()` or user roles from the JWT, not just the anon key.

### Long Term Improvements
1.  **Server-Side Role Management**: Use Custom Claims or a `profiles` table linked to `auth.users` to manage roles securely.
2.  **Audit Logs**: Move activity logging to postgres triggers to ensure they cannot be bypassed or forged by the client.

## Conclusion
The current security posture is **unsafe for production**. It is strongly recommended to refactor the authentication system to use Supabase Auth immediately to mitigate the risk of data leakage and unauthorized access.
