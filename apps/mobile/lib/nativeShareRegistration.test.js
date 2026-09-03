import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const mapScreenSource = readFileSync(
  new URL('../MapScreen.js', import.meta.url),
  'utf8'
);

describe('native sharing registration', () => {
  it('uses the New Architecture-compatible react-native-share TurboModule', () => {
    expect(mapScreenSource).toContain("import RNShare from 'react-native-share';");
    expect(mapScreenSource).toContain('share: RNShare.open');
    expect(mapScreenSource).toContain('shareSingle: RNShare.shareSingle');
    expect(mapScreenSource).not.toContain('NativeModules.RNShare');
    expect(mapScreenSource).not.toContain('NativeShare.share');
  });
});
