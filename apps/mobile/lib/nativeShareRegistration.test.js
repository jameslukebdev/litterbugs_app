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
  it('loads the share TurboModule only when the installed client provides it', () => {
    expect(mapScreenSource).toContain("TurboModuleRegistry.get('RNShare')");
    expect(mapScreenSource).toContain("require('react-native-share').default");
    expect(mapScreenSource).toContain('share: installedRNShare?.open ?? NativeShare.share');
    expect(mapScreenSource).toContain('shareSingle: installedRNShare.shareSingle');
    expect(mapScreenSource).toContain('readAsStringAsync: FileSystem.readAsStringAsync');
    expect(mapScreenSource).toContain('isPackageInstalled: installedRNShare.isPackageInstalled');
    expect(mapScreenSource).toContain('canOpenURL: Linking.canOpenURL');
    expect(mapScreenSource).not.toContain('NativeModules.RNShare');
    expect(mapScreenSource).not.toContain("import RNShare from 'react-native-share';");
  });

  it('keeps the photo bounded while allowing the preview text to grow', () => {
    expect(reportShareSheetSource).toMatch(/preview:\s*\{\s*minHeight: 104,/);
    expect(reportShareSheetSource).toMatch(/previewMedia:\s*\{[\s\S]*?height: 88,/);
    expect(reportShareSheetSource).toContain("previewPhoto: { width: 88, height: 88 }");
    expect(reportShareSheetSource).toContain('style={styles.previewTitle} numberOfLines={2}');
  });
});
