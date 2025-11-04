export default ({ config }) => ({
  ...config,
  name: 'EchoMind',
  slug: 'echomind',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff'
  },
  updates: {
    fallbackToCacheTimeout: 0
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: false
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff'
    },
    permissions: [
      'android.permission.RECORD_AUDIO'
    ]
  },
  extra: {
    apiBaseUrl: process.env.ECHOMIND_API_URL || 'http://localhost:4000'
  },
  experiments: {
    tsconfigPaths: true
  }
});
