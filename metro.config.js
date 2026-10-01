const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// three.js >= 0.186: its CommonJS entry (picked on native, where @react-three/fiber
// `require`s three) is deprecated and starts with Node-only `process.emitWarning`,
// which crashes Hermes at load ("undefined is not a function"). Always use the ES build.
const THREE_ESM = path.join(__dirname, "node_modules/three/build/three.module.js");
config.resolver.resolveRequest = (context, moduleName, platform) =>
  moduleName === "three"
    ? { type: "sourceFile", filePath: THREE_ESM }
    : context.resolveRequest(context, moduleName, platform);

module.exports = withNativeWind(config, { input: "./global.css" });
