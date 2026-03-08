const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// ─── Firebase RN fix ──────────────────────────────────────────────────────────
//
// `firebase/auth` (the sub-package shim) only has a "main" field pointing at
// the CJS browser build.  Metro resolves that on the emulator (which uses the
// native dev-client build path), but Expo Go on a real device hits the browser
// build which does NOT export `getReactNativePersistence`.
//
// Fix: resolve `firebase/auth` directly to @firebase/auth's react-native build,
// which correctly exports `getReactNativePersistence`, `initializeAuth`, etc.
// ─────────────────────────────────────────────────────────────────────────────
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'firebase/auth': path.resolve(
    __dirname,
    'node_modules/firebase/node_modules/@firebase/auth/dist/rn/index.js'
  ),
};

module.exports = config;
