// Install before loading the fixture app. Never silently route fixture actions to a backend.
export function installFixtureNetworkGuard(target = globalThis) {
  const deny = () => { throw new Error('Fixture app: backend/network operations are disabled.'); };
  target.fetch = async () => deny();
  target.XMLHttpRequest = class { constructor() { deny(); } };
  target.WebSocket = class { constructor() { deny(); } };
}
