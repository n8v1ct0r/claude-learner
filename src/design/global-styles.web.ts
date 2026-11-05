// src/design/global-styles.web.ts: the web build does not run NativeWind (no component uses className;
// see babel.config.js and metro.config.js), so there is no Tailwind stylesheet to load. Without this,
// web shipped a render-blocking Tailwind base stylesheet and wrapped every element in NativeWind's
// runtime for no styling at all.
export {};
