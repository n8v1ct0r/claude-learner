// babel-preset-expo auto-adds react-native-worklets/plugin (Reanimated 4) when the package is
// installed, so it must NOT be listed manually here. NativeWind needs jsxImportSource + its preset.
//
// The web export skips NativeWind: no component uses className, so on web it only added a runtime
// wrapper around every element and a render-blocking Tailwind base stylesheet. iOS and Android keep it.
// (api.caller keys Babel's cache on the platform, so web and native transforms never mix.)
module.exports = function (api) {
  const platform = api.caller((caller) => caller && caller.platform);
  if (platform === 'web') {
    return { presets: ['babel-preset-expo'] };
  }
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  };
};
