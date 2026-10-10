import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.virgendelvalle.playabuche',
  appName: 'Playa Buche',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: 'always',
    preferredContentMode: 'mobile',
    scheme: 'Playa Buche',
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;