import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

// Integration contract spans the extracted presentation and its owning screen.
const mapScreenSource = ['../MapScreen.js', '../components/ReportWizardSteps.jsx', '../components/ReportDetailsSheet.jsx', '../styles/MapScreen.styles.js'].map(path => readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n');
const appTabsSource = readFileSync(
  new URL('../AppTabs.js', import.meta.url),
  'utf8'
);

describe('new report workflow responsiveness', () => {
  it('starts reports from a visible action and confirms the selected location first', () => {
    expect(mapScreenSource).toContain(
      "accessibilityLabel={reportPlacementActive ? 'Use this location' : 'Report litter'}"
    );
    expect(mapScreenSource).toContain('styles.reportLitterButtonDock');
    expect(mapScreenSource).toContain("alignItems: 'flex-end'");
    expect(mapScreenSource).toContain('accessibilityLabel="Change map style"');
    expect(mapScreenSource).toContain("setReportPlacementActive(true)");
    expect(mapScreenSource).toContain("reportPlacementActive ? 'Use this location' : 'Report litter'");
    expect(mapScreenSource).toContain('accessibilityLabel="Cancel report location"');
    expect(mapScreenSource).toContain(
      "navigation.addListener('blur'"
    );
    expect(mapScreenSource).toContain('headerShown: false');
    expect(mapScreenSource).toContain('styles.floatingMapHeaderArea');
    expect(mapScreenSource).toContain('<ReportFilters map />');
    expect(mapScreenSource).toContain('styles.floatingMapInstructionCard');
    expect(mapScreenSource).toContain('Animated.timing(reportControlTransition');
    expect(mapScreenSource).not.toContain('showInitialMapLoading || reportPlacementActive');
    expect(appTabsSource).toContain('headerShown: false');
    expect(mapScreenSource).toContain('Move the map beneath the pin');

    const confirmStart = mapScreenSource.indexOf('const confirmReportLocation = () => {');
    const confirmEnd = mapScreenSource.indexOf('\nuseEffect(() => {', confirmStart);
    const confirmSource = mapScreenSource.slice(confirmStart, confirmEnd);

    expect(confirmSource).toContain('beginReportAtCoordinate(coord)');
  });

  it('does not use an ordinary map tap as the report entry point', () => {
    expect(mapScreenSource).not.toContain('const onMapPress =');
    expect(mapScreenSource).not.toContain('onMapPress(e)');
  });

  it('keeps the report sheet fixed and hides step controls while typing', () => {
    expect(mapScreenSource).not.toContain('KeyboardAvoidingView');
    expect(mapScreenSource).toContain("Keyboard.addListener(\n      showEvent");
    expect(mapScreenSource).toContain('setReportKeyboardVisible(true)');
    expect(mapScreenSource).toContain('setReportKeyboardVisible(false)');
    expect(mapScreenSource).toContain('!reportKeyboardVisible && (');
    expect(mapScreenSource).toContain('onPress={Keyboard.dismiss}');
    expect(mapScreenSource).toContain('automaticallyAdjustKeyboardInsets={false}');
  });

  it('scrolls lower report fields above the keyboard when focused', () => {
    expect(mapScreenSource).toContain('const reportWizardScrollRef = useRef(null)');
    expect(mapScreenSource).toContain('const revealBottomReportField = () => {');
    expect(mapScreenSource).toContain('reportWizardScrollRef.current?.scrollToEnd({ animated: true })');
    expect(mapScreenSource).toContain('ref={reportWizardScrollRef}');
    expect(mapScreenSource.match(/onFocus=\{revealBottomReportField\}/g)).toHaveLength(4);
    expect(mapScreenSource).toContain(
      'reportKeyboardVisible && { paddingBottom: reportKeyboardHeight + 32 }'
    );
    expect(mapScreenSource).toContain('wizardScrollContentKeyboard: {');
  });

  it('uses matching single-line submit behavior for both Other fields', () => {
    expect(mapScreenSource.match(/returnKeyType="done"/g)).toHaveLength(2);
    expect(mapScreenSource.match(/onSubmitEditing=\{Keyboard\.dismiss\}/g)).toHaveLength(2);
    expect(mapScreenSource).not.toContain('styles.wizardNotesInput');
    expect(mapScreenSource).not.toContain('wizardNotesInput: {');
  });
});
