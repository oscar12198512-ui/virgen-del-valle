import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.virgendelvalle.playabuche',
  appName: 'Virgen del Valle',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
