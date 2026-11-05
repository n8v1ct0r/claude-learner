// app.config.js
//
// app.json is the source of truth and stays iPhone-only (see __tests__/release/release-config.test.ts).
// The public web demo is a separate export: `npm run web:build` sets CL_WEB_EXPORT=1, and only then
// is the web platform added (EXPO_NO_WEB_SETUP skips the CLI check that reads raw app.json; react-dom
// and react-native-web are already dependencies). Every native and App Store build resolves app.json.
module.exports = ({ config }) => {
  if (process.env.CL_WEB_EXPORT !== '1') return config;
  return {
    ...config,
    platforms: [...(config.platforms ?? []), 'web'],
    // Web only: split every route into its own chunk, loaded when the route is first shown, so the first
    // screen does not download and run the code (and libraries) of every other screen.
    plugins: (config.plugins ?? []).map((p) =>
      p === 'expo-router' ? ['expo-router', { asyncRoutes: { web: process.env.CL_WEB_PRERENDER !== '1' } }] : p,
    ),
    // CL_WEB_PRERENDER=1: a static (server-rendered) export, used only at build time to take the first
    // screen's HTML (scripts/web-postexport.mjs). Server rendering cannot wait for async route chunks, so
    // that export loads routes synchronously. The shipped export is the single-page app.
    web: { bundler: 'metro', output: process.env.CL_WEB_PRERENDER === '1' ? 'static' : 'single', favicon: './assets/images/icon.png' },
  };
};
