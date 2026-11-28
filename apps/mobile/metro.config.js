/* global __dirname */
const { getPostHogExpoConfig } = require('posthog-react-native/metro');

// PostHog's serializer adds a debug ID to release bundles so uploaded source maps match
// their errors. Only for builds that upload symbols (POSTHOG_UPLOAD_SYMBOLS=true, see
// app.config.js); otherwise this is Expo's default configuration unchanged.
const config = getPostHogExpoConfig(__dirname, { enabled: process.env.POSTHOG_UPLOAD_SYMBOLS === 'true' });
// Keep native export and OTA publishing within this workstation's memory
// budget while the simulator and browser are running.
config.maxWorkers = 2;
module.exports = config;
