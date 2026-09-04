const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

// Sentry must create Expo's base config so its pre-serialization Debug ID
// plugin participates in Expo's custom serializer. Wrapping NativeWind's final
// config with `withSentryConfig` installs a serializer callback that Expo's
// serializer does not invoke, causing real Android bundles to fail.
const config = getSentryExpoConfig(__dirname, {
  includeWebReplay: false,
});
const nativeWindConfig = withNativeWind(config, { input: "./global.css" });
const defaultResolveRequest = nativeWindConfig.resolver.resolveRequest;

nativeWindConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && moduleName === "react-native-agora") {
    return {
      type: "sourceFile",
      filePath: path.resolve(__dirname, "src/lib/agora.web.tsx"),
    };
  }

  if (platform === "web" && moduleName === "react-native-track-player") {
    return {
      type: "sourceFile",
      filePath: path.resolve(__dirname, "src/lib/trackPlayer.web.ts"),
    };
  }

  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = nativeWindConfig;
