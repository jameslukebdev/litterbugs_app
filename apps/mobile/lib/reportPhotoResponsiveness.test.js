import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

// Integration contract spans the extracted presentation and its owning screen.
const mapScreenSource = ['../MapScreen.js', '../components/ReportWizardSteps.jsx', '../components/ReportDetailsSheet.jsx', '../styles/MapScreen.styles.js'].map(path => readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n');
const reportsSource = readFileSync(
  new URL('./reports.js', import.meta.url),
  'utf8'
);
const reportListSource = readFileSync(
  new URL('../ReportList.js', import.meta.url),
  'utf8'
);

describe('report photo responsiveness', () => {
  it('offers both camera and photo-library actions for report evidence', () => {
    expect(mapScreenSource).toContain('ImagePicker.launchCameraAsync(reportCameraPickerOptions({');
    expect(mapScreenSource).toContain('nativePhotoOptimizationAvailable: isPhotoOptimizationAvailable()');
    expect(mapScreenSource).toContain("onPress={() => pickImage('camera')}");
    expect(mapScreenSource).toContain("onPress={() => pickImage('library')}");
    expect(mapScreenSource).toContain('>Take photo</Text>');
    expect(mapScreenSource).toContain('>Choose photos</Text>');
  });

  it('keeps photo preparation inline and delays feedback for fast operations', () => {
    expect(mapScreenSource).not.toContain('{(isSaving || photoPreparationStatus) && (');
    expect(mapScreenSource).toContain('setTimeout(() => setShowPhotoPreparation(true), 400)');
    expect(mapScreenSource).toContain('return () => clearTimeout(timer)');
    expect(mapScreenSource).toContain('showPhotoPreparation={showPhotoPreparation && isPreparingPhotos}');
    expect(mapScreenSource).toContain('style={styles.photoPreparationSlot}');
    expect(mapScreenSource).toContain('if (photoPreparationStatus || isTransitioning) return;');
  });

  it('safety-checks report photos with bounded concurrency and visible progress', () => {
    expect(mapScreenSource).toContain('REPORT_PHOTO_UPLOAD_CONCURRENCY');
    expect(mapScreenSource).toContain('mapInConcurrentBatches(');
    expect(mapScreenSource).toContain('Photo ${completedPhotos} of ${photoUris.length} safety-checked.');
  });

  it('uses the shared signed URL cache when report details open', () => {
    expect(mapScreenSource).toContain('getReportPhotoUrl(firstPhotoPath)');
    expect(mapScreenSource).not.toContain('const getSignedPhotoUrl = async');
    expect(reportsSource).toContain('const photoUrlCache = useRef(new Map())');
    expect(reportsSource).toContain('const photoUrlRequests = useRef(new Map())');
  });

  it('reveals the first photo before waiting for the remaining photos', () => {
    expect(mapScreenSource).toContain('resolveReportPhotoUrls(selectedReport.photo_paths, getReportPhotoUrl, firstUrl =>');
    expect(mapScreenSource).toContain('setReportPhotoUrls([firstUrl])');
  });

  it('uses the shared photo lifecycle for gallery and report list', () => {
    const gallery = readFileSync(new URL('../components/ReportPhotoGallery.jsx', import.meta.url), 'utf8');
    expect(gallery).toContain('<RemotePhoto');
    expect(reportListSource).toContain('<RemotePhoto');
  });
});
