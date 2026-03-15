import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.algebrain.tutor',
  appName: 'AlgebraBrain',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
    },
    LiveUpdates: {
      appId: 'YOUR_APPFLOW_APP_ID', // замени на App ID со страницы приложения в Appflow
      channel: 'Production',
      autoUpdateMethod: 'background',
      maxVersions: 2,
    },
  },
};

export default config;
