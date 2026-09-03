import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const mapScreenSource = readFileSync(
  new URL('../MapScreen.js', import.meta.url),
  'utf8'
);
const reportShareSheetSource = readFileSync(
  new URL('../ReportShareSheet.js', import.meta.url),
  'utf8'
);

describe('native sharing registration', () => {
  it('uses the New Architecture-compatible react-native-share TurboModule', () => {
    expect(mapScreenSource).toContain("import RNShare from 'react-native-share';");
    expect(mapScreenSource).toContain('share: RNShare.open');
    expect(mapScreenSource).toContain('shareSingle: RNShare.shareSingle');
    expect(mapScreenSource).toContain('readAsStringAsync: FileSystem.readAsStringAsync');
    expect(mapScreenSource).toContain('isPackageInstalled: RNShare.isPackageInstalled');
    expect(mapScreenSource).toContain('canOpenURL: Linking.canOpenURL');
    expect(mapScreenSource).not.toContain('NativeModules.RNShare');
    expect(mapScreenSource).not.toContain('NativeShare.share');
  });

  it('keeps the report preview card at a bounded height', () => {
    expect(reportShareSheetSource).toMatch(/preview:\s*\{\s*height: 92,/);
    expect(reportShareSheetSource).toMatch(/previewMedia:\s*\{[\s\S]*?height: 92,/);
    expect(reportShareSheetSource).toContain("previewPhoto: { width: 92, height: 92 }");
    expect(reportShareSheetSource).not.toMatch(/preview(?:Media)?:\s*\{[\s\S]*?minHeight: 92,/);
  });
});
