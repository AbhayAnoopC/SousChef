import "dotenv/config";

export default ({ config }: any) => ({
  ...config,
  name: "SousChef",
  slug: "souschef",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "souschef",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  splash: {
    image: "./assets/images/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.abhay.souschef",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: ["expo-router", "expo-sqlite"],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    ...config.extra,
    revenuecatPublicKeyIOS: process.env.REVENUECAT_IOS_PUBLIC_KEY,
    eas: {
      projectId: "4027f6b6-14a5-4d38-9c20-bf8d309e7079",
    },
  },
});
