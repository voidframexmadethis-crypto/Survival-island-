import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  appId: 'com.adventureforgegames.survivalisland',
  appName: 'Survival Island',
  webDir: 'mobile/dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#0c0a09',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0c0a09',
    },
    Keyboard: {
      resize: KeyboardResize.Native,
    },
  },
};

export default config;
