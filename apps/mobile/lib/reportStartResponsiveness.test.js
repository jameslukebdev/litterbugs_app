import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const mapScreenSource = readFileSync(
  new URL('../MapScreen.js', import.meta.url),
  'utf8'
);
const appTabsSource = readFileSync(
  new URL('../AppTabs.js', import.meta.url),
  'utf8'
);

describe('new report workflow responsiveness', () => {
  it('opens the report form before waiting for a fresh GPS position', () => {
    const start = mapScreenSource.indexOf('const beginReportAtCoordinate = async (coord) => {');
    const end = mapScreenSource.indexOf('\nconst openReportLocationPicker =', start);
    const beginReportSource = mapScreenSource.slice(start, end);

    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    expect(beginReportSource.indexOf('setFormOpen(true)')).toBeGreaterThanOrEqual(0);
    expect(beginReportSource.indexOf('Location.getCurrentPositionAsync')).toBeGreaterThanOrEqual(0);
    expect(beginReportSource.indexOf('setFormOpen(true)')).toBeLessThan(
      beginReportSource.indexOf('Location.getCurrentPositionAsync')
    );
    expect(beginReportSource).toContain("setReportLocationVerification('checking')");
    expect(beginReportSource).toContain("setReportLocationVerification('verified')");
    expect(beginReportSource).toContain("distancePolicy.status === 'remote_confirmation_required'");
    expect(beginReportSource).toContain("text: 'Use this location'");
    expect(beginReportSource).toContain("closeUnverifiedDraft({ returnToPlacement: true })");
    expect(beginReportSource).not.toContain('accept funding');
    expect(beginReportSource).not.toContain('administrator approval');
  });

  it('prevents workflow advancement while the location check is pending', () => {
    expect(mapScreenSource).toContain(
      "(reportLocationVerification === 'checking' && !isEditing)"
    );
    expect(mapScreenSource).toContain("reportLocationVerification === 'checking'");
  });

  it('starts reports from a visible action and confirms the selected location first', () => {
    expect(mapScreenSource).toContain(
      "accessibilityLabel={reportPlacementActive ? 'Use this location' : 'Report litter'}"
    );
    expect(mapScreenSource).toContain('regionForPosition: reportLocationRegion');
    expect(mapScreenSource).toContain('accuracy: Location.Accuracy.High');
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
    expect(mapScreenSource).toContain('styles.floatingMapLogoCard');
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
    expect(mapScreenSource).toContain('automaticallyAdjustKeyboardInsets={Platform.OS === \'ios\'}');
  });

  it('scrolls lower report fields above the keyboard when focused', () => {
    expect(mapScreenSource).toContain('const reportWizardScrollRef = useRef(null)');
    expect(mapScreenSource).toContain('const revealBottomReportField = () => {');
    expect(mapScreenSource).toContain('reportWizardScrollRef.current?.scrollToEnd({ animated: true })');
    expect(mapScreenSource).toContain('ref={reportWizardScrollRef}');
    expect(mapScreenSource.match(/onFocus=\{revealBottomReportField\}/g)).toHaveLength(3);
    expect(mapScreenSource).toContain(
      'reportKeyboardVisible && styles.wizardScrollContentKeyboard'
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
