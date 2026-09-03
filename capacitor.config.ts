import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'in.nirmaan.app',
  appName: 'Nirmaan',
  webDir: 'dist',
  server: {
    // DEBUG/LOCAL: run on http so plain-HTTP (cleartext) calls to a local LAN backend
    // aren't blocked as mixed content, and the app origin (http://localhost) matches the
    // backend's CORS allow-list. Revert androidScheme to 'https' (and drop cleartext) for
    // production, where the API should be served over HTTPS.
    androidScheme: 'http',
    cleartext: true,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
