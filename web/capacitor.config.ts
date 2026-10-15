import type { CapacitorConfig } from '@capacitor/cli';

// App id and name are provisional, like the brand itself. Change both before the first Play Console upload:
// the app id cannot change after release.
const config: CapacitorConfig = {
  appId: 'my.insidewise.app',
  appName: 'Insidewise',
  webDir: 'dist',
  android: {
    // The bundled UI calls the API over HTTPS only.
    allowMixedContent: false,
  },
};

export default config;
