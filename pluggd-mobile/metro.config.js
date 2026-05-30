const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);
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
