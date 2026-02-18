import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dcel.inventory',
  appName: 'DCEL Inventory',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: false,
      launchFadeOutDuration: 0,
      showSpinner: false
    }
  },
  // Exclude Electron and unnecessary files from Android sync
  android: {
    // Only copy essential web assets to Android
    includePlugins: [
      '@capacitor/app',
      '@capacitor/filesystem',
      '@capacitor/share',
      '@capacitor/splash-screen',
      '@capawesome/capacitor-live-update'
    ]
  }
};

export default config;
