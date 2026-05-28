// Babel config explícita para SDK 54.
// react-native-worklets (sucesor del plugin de reanimated en RN 0.81/Reanimated 4)
// DEBE ir último — sino los worklets no se transforman y la app crashea al
// llamar runOnUI / useSharedValue.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: ["react-native-worklets/plugin"],
  };
};
