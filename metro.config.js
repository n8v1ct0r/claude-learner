// Learn more: https://docs.expo.dev/guides/customizing-metro/
const path = require('node:path');

const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Bundle the prebuilt content database (assets/content/content.db) as an asset so
// require('.../content.db') resolves and ships in `expo export` output; expo-sqlite's SQLiteProvider
// copies it onto the device at first launch (see src/db/content-provider.tsx).
config.resolver.assetExts.push('db');

// Web only: Reanimated (plus react-native-worklets) is ~750 KB of minified JS that the web build only uses
// for a few small JS-thread animations. Resolve it to the small requestAnimationFrame implementation of
// the same API surface in src/web/reanimated-lite.tsx. iOS and Android keep the real library.
const reanimatedLite = path.resolve(__dirname, 'src/web/reanimated-lite.tsx');
const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-reanimated') {
    return { type: 'sourceFile', filePath: reanimatedLite };
  }
  return upstreamResolveRequest
    ? upstreamResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

// The web export does not run NativeWind (see babel.config.js); `npm run web:build` sets CL_WEB_EXPORT.
module.exports = process.env.CL_WEB_EXPORT === '1' ? config : withNativeWind(config, { input: './global.css' });
