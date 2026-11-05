// src/components/GestureRoot.tsx: the app's root view for gestures.
//
// Native: react-native-gesture-handler's root view, which every gesture in the app needs above it.
// Web: GestureRoot.web.tsx, a plain View, so the web build does not ship gesture-handler (~230 KB of
// minified JS) for a root wrapper that nothing on web uses.
export { GestureHandlerRootView as GestureRoot } from 'react-native-gesture-handler';
