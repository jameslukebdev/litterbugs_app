/* global __dirname */
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// Keep native export and OTA publishing within this workstation's memory
// budget while the simulator and browser are running.
config.maxWorkers = 2;
module.exports = config;
