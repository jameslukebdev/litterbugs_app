import { installFixtureNetworkGuard } from './networkGuard';
installFixtureNetworkGuard();
const { registerRootComponent } = require('expo');
// React Native initializes its transport polyfills during bootstrap; reapply the
// guard afterward and before loading any fixture UI dependencies.
installFixtureNetworkGuard();
const FixtureApp = require('./FixtureApp').default;
registerRootComponent(FixtureApp);
