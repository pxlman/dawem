export default {
  expo: {
    name: "Dawem",
    slug: "Dawem",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    updates: {
      fallbackToCacheTimeout: 0
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/icon.png",
        backgroundColor: "#FFFFFF"
      },
      package: "com.yourname.habittrackerv1",
      versionCode: 1
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    scheme: "habittrackerv1",
  },
};