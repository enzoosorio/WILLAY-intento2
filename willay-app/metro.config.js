// Override del metro config por defecto de Expo SDK 54.
// Razón: firebase v11 publica sus subpaths via package.json `exports`. Sin esto,
// `firebase/auth`, `firebase/firestore`, etc. fallan en runtime con
// "Component auth has not been registered yet".
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = true;
config.resolver.sourceExts = Array.from(
  new Set([...(config.resolver.sourceExts || []), "cjs", "mjs"]),
);

// Empaquetar los shards de peso del modelo FaceNet (.bin) como assets para que
// `require("../../assets/models/facenet/group1-shard1of1.bin")` (lib/face/facenet.ts)
// resuelva a un módulo de asset que tfjs-react-native pueda cargar via bundleResourceIO.
config.resolver.assetExts = Array.from(
  new Set([...(config.resolver.assetExts || []), "bin", "onnx"]),
);

module.exports = config;
