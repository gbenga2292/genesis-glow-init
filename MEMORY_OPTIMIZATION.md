# Memory Optimization Guide

## Problem: Fatal Process Out of Memory

The error `Fatal process out of memory: Zone` occurs when Node.js exhausts its allocated heap memory during build or development operations.

## Solutions Implemented

### 1. ✅ Increased Node.js Memory Limit

**What was done:**
- Added `NODE_OPTIONS=--max-old-space-size=4096` to all npm scripts
- This allocates 4GB of memory to Node.js processes (default is ~512MB-2GB)

**Scripts updated:**
- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run build:dev` - Development build
- `npm run preview` - Preview build
- `npm run electron:dev` - Electron development
- `npm run electron:build` - Electron production builds

**If you still get memory errors**, increase the value:
```json
"dev": "cross-env NODE_OPTIONS=--max-old-space-size=8192 vite"
```

### 2. ✅ Optimized Vite Build Configuration

**What was done:**
- **Disabled source maps in production** - Saves significant memory during builds
- **Implemented code splitting** - Breaks large bundles into smaller chunks:
  - `react-vendor` - React core libraries
  - `radix-ui` - UI component libraries
  - `data-vendor` - Supabase and React Query
  - `charts` - Recharts library
  - `forms` - Form handling libraries
- **Added Terser minification** - Optimizes output and removes console logs in production
- **Increased chunk size warning limit** - Prevents unnecessary warnings

**Benefits:**
- Smaller individual bundles = less memory per build step
- Parallel processing of chunks = better resource utilization
- Faster builds and smaller production bundles

### 3. ⚠️ Recommended: Clear Cache and Dependencies

Run these commands periodically to prevent cache-related memory issues:

```powershell
# Clear npm cache
npm cache clean --force

# Delete and reinstall dependencies
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install

# Clear Vite cache
Remove-Item -Recurse -Force node_modules/.vite
```

### 4. ⚠️ Check for Memory Leaks

**Common causes in your codebase:**

#### a) Large Data Loading
Your app loads ALL data on startup via `AppDataContext`:
- Quick checkouts
- Employees
- Vehicles
- Sites
- Site transactions
- Equipment logs
- Waybill documents

**Recommendation:** Implement pagination or lazy loading for large datasets.

#### b) useEffect Dependencies
Check for infinite loops in components with `useEffect` hooks.

**Example of problematic pattern:**
```typescript
useEffect(() => {
  setData([...data, newItem]); // ❌ Causes infinite loop
}, [data]);
```

**Correct pattern:**
```typescript
useEffect(() => {
  setData(prev => [...prev, newItem]); // ✅ Uses functional update
}, [newItem]);
```

#### c) Large State Objects
Monitor components that store large amounts of data in state.

## Monitoring Memory Usage

### During Development
```powershell
# Run with memory monitoring
npm run dev
```

Watch for warnings in the console about memory usage.

### During Build
```powershell
# Build with verbose output
npm run build
```

Look for:
- Chunk size warnings
- Memory warnings
- Build time (slow builds may indicate memory pressure)

## Troubleshooting

### Error Still Occurs After Fixes

1. **Increase memory limit further:**
   ```json
   "dev": "cross-env NODE_OPTIONS=--max-old-space-size=8192 vite"
   ```

2. **Check system resources:**
   - Close other applications
   - Ensure you have at least 8GB RAM available
   - Check Task Manager for memory usage

3. **Identify the specific command:**
   - Which command caused the error? (`npm run dev`, `npm run build`, etc.)
   - This helps narrow down the issue

4. **Check for specific file issues:**
   - Very large component files (>1000 lines)
   - Circular dependencies
   - Large imported assets (images, videos)

### Build-Specific Issues

If only builds fail (not dev server):

1. **Disable source maps temporarily:**
   ```typescript
   // vite.config.ts
   build: {
     sourcemap: false, // Disable completely
   }
   ```

2. **Reduce parallel builds:**
   ```typescript
   // vite.config.ts
   build: {
     rollupOptions: {
       maxParallelFileOps: 2, // Limit concurrent operations
     }
   }
   ```

### Android Build Issues

If the error occurs during Android builds:

1. **Increase Gradle memory:**
   Edit `android/gradle.properties`:
   ```properties
   org.gradle.jvmargs=-Xmx4096m -XX:MaxPermSize=512m
   ```

2. **Disable parallel builds:**
   ```properties
   org.gradle.parallel=false
   ```

## Performance Monitoring

Your app includes `performanceMonitor` utility. Use it to track:
- Data loading times
- Component render times
- Memory usage patterns

Check the console for performance metrics during development.

## Best Practices Going Forward

1. **Lazy load routes** - Use React lazy loading for pages
2. **Virtualize long lists** - Use libraries like `react-window` for large tables
3. **Optimize images** - Compress and resize images before importing
4. **Code split by route** - Already implemented in your Vite config
5. **Monitor bundle size** - Run `npm run build` regularly to check bundle sizes
6. **Use React.memo** - Prevent unnecessary re-renders of expensive components
7. **Implement pagination** - Don't load all data at once

## Current Project Stats

- **Total TypeScript/JavaScript files:** 263
- **Total code size:** ~12.29 MB
- **Dependencies:** 95 packages
- **Dev dependencies:** 17 packages

This is a moderately large project, so memory optimization is important.

## Need More Help?

If memory issues persist:
1. Note which exact command fails
2. Check the terminal output for specific errors
3. Monitor Task Manager during the operation
4. Consider upgrading system RAM if consistently hitting limits
