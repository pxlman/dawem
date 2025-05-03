export default {
  expo: {
    name: "Dawem",
    slug: "Dawem",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon2.png",
    splash: {
      image: "./assets/images/splash1-white.png",
      resizeMode: "contain",
      backgroundColor: "#c3c3c3"
    },
    updates: {
      fallbackToCacheTimeout: 0
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.pxlman.dawem",
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/icon2.png",
        backgroundColor: "#FFFFFF"
      },
      package: "com.pxlman.dawem",
      versionCode: 1
    },
    web: {
      favicon: "./assets/images/icon2.png"
    },
    scheme: "dawem",
  },
};