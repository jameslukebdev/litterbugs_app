import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
vi.mock('react-native', () => {
  const Box = ({ children, accessibilityLabel }) => <div aria-label={accessibilityLabel}>{children}</div>;
  return { Modal: Box, View: Box, Text: Box, TouchableOpacity: Box, ScrollView: Box, ActivityIndicator: () => null, Linking: {}, Alert: {}, Platform: { OS: 'android' } };
});
vi.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
vi.mock('../styles/MapScreen.styles', () => ({ default: {} }));
vi.mock('../CompletedCleanupStory', () => ({ default: () => <div>Cleanup story</div> }));
vi.mock('./ReportPhotoGallery', () => ({ default: () => <div>Original photos</div> }));
vi.mock('../ReporterIdentity', () => ({ default: () => null }));
vi.mock('../ReportShareSheet', () => ({ default: () => null }));
vi.mock('../BrandedLoadingState', () => ({ default: ({ title }) => <div>{title}</div>, LoadingButtonContent: () => null }));
vi.mock('../lib/funding', () => ({ formatUsd: () => '$0.00' }));
vi.mock('../lib/reportSharing', () => ({ reportShareActionLabel: () => 'Share report' }));
vi.mock('../lib/reportWithdrawal', () => ({ withdrawOwnReport: vi.fn(), reportWithdrawalErrorMessage: vi.fn() }));
import ReportDetailsSheet from './ReportDetailsSheet';

describe('completed report loading layout', () => {
  const state = {
    detailsOpen: true, selectedReport: { id: 'a', title: 'Clean road', cleanup_state: 'completed', litter_types: [] },
    insets: { top: 20, bottom: 0 }, reportPhotoUrls: [], completedCleanupImpactLoading: true,
  };
  it('keeps Close available without showing content that the arriving story would push down', () => {
    const html = renderToStaticMarkup(<ReportDetailsSheet state={state} actions={{}} />);
    expect(html).toContain('Close report');
    expect(html).toContain('Loading cleanup…');
    expect(html).not.toContain('Original photos');
    expect(html).not.toContain('Clean road');
  });
  it('reveals the cleanup story before the original photos when ready', () => {
    const html = renderToStaticMarkup(<ReportDetailsSheet state={{ ...state, completedCleanupImpactLoading: false, completedCleanupImpact: {} }} actions={{}} />);
    expect(html.indexOf('Cleanup story')).toBeGreaterThan(-1);
    expect(html.indexOf('Original photos')).toBeGreaterThan(html.indexOf('Cleanup story'));
    expect(html).toContain('Clean road');
    expect(html).not.toContain('Loading cleanup…');
  });
});
