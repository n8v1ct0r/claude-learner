// Two Jest projects:
//   • "expo" — jest-expo preset for React Native / component / engine tests. transformIgnorePatterns
//     keeps the RN/Expo/NativeWind/Reanimated ESM packages transformed by babel-jest; the preset's
//     moduleNameMapper (asset stubs) is merged with the tsconfig `@/*` alias. Reanimated is mocked
//     via the self-contained manual mock in __mocks__/react-native-reanimated.js.
//   • "node" — pure Node integration tests (the Supabase RLS suite + the edge-function GC-09 suite)
//     that hit a real local server over HTTP. They must NOT inherit the jest-expo preset, whose React
//     Native setup installs a whatwg-fetch polyfill that is non-functional under Node (returns
//     undefined status/body).
const expoPreset = require('jest-expo/jest-preset');

const expoProject = {
  displayName: 'expo',
  preset: 'jest-expo',
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/.expo/',
    '<rootDir>/__tests__/rls/',
    '<rootDir>/__tests__/functions/',
    '<rootDir>/__tests__/support/',
  ],
  moduleNameMapper: {
    ...(expoPreset.moduleNameMapper || {}),
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|nativewind|react-native-css-interop|react-native-reanimated|react-native-worklets|lottie-react-native|@react-native-async-storage/.*))',
  ],
};

const nodeProject = {
  displayName: 'node',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/__tests__/rls/**/*.test.ts', '<rootDir>/__tests__/functions/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/.expo/'],
  // No jest-expo preset here, and NOT babel-preset-expo (which injects an `import 'expo/virtual/env'`
  // — an untransformed ESM node_modules file — whenever a file references process.env.EXPO_PUBLIC_*).
  // A plain TypeScript-strip + CommonJS transform is all a Node integration test needs.
  transform: {
    '^.+\\.[jt]sx?$': [
      'babel-jest',
      {
        configFile: false,
        babelrc: false,
        presets: ['@babel/preset-typescript'],
        plugins: ['@babel/plugin-transform-modules-commonjs'],
      },
    ],
  },
  transformIgnorePatterns: ['/node_modules/'],
};

module.exports = { projects: [expoProject, nodeProject] };
