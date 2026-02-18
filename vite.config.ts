import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: './',
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    exclude: [
      '@capacitor/splash-screen',
      '@capawesome/capacitor-live-update',
      '@capacitor/core',
      '@capacitor/android'
    ],
  },
  build: {
    // Disable source maps in production to save memory
    sourcemap: mode === 'development',
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Copy public folder to dist - needed for logos, icons, and static assets
    copyPublicDir: true,
    // Optimize chunk splitting to prevent large bundles
    rollupOptions: {
      output: {
        manualChunks: {
          // Split React and related libraries
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Split UI library components
          'radix-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-popover',
          ],
          // Split data/API libraries
          'data-vendor': ['@supabase/supabase-js', '@tanstack/react-query'],
          // Split charting libraries
          'charts': ['recharts'],
          // Split form libraries
          'forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
        },
      },
    },
    // Minification options - using esbuild (built-in, faster than terser)
    minify: 'esbuild',
    esbuild: {
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },
  },
}));
