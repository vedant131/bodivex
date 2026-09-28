const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Firebase JS SDK: with package "exports" enabled, Metro loads @firebase/app twice
// (ESM + CJS), and auth registers on the wrong copy:
// "Component auth has not been registered yet".
config.resolver.unstable_enablePackageExports = false;

module.exports = withNativeWind(config, { input: "./global.css" });
