import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
vi.mock('react-native', async () => {
  const { createElement } = await import('react');
  const Container = ({ children }) => createElement('div', null, children);
  return { View: Container, Text: Container, ScrollView: Container, ActivityIndicator: () => null, StyleSheet: { create: (value) => value } };
});
vi.mock('expo-image', async () => {
  const { createElement } = await import('react');
  return { Image: ({ accessibilityLabel }) => createElement('span', null, accessibilityLabel) };
});
vi.mock('../lib/reports', () => ({ useReports: () => ({ getReportPhotoUrl: vi.fn() }) }));
import ReportPhotoGallery from './ReportPhotoGallery';
describe('report photo gallery lifecycle', () => {
  it('renders nothing when dismissal clears the report before its photo URLs', () => {
    expect(renderToStaticMarkup(<ReportPhotoGallery report={null} urls={['https://example.com/stale.jpg']} loading={false} width={350} />)).toBe('');
  });
  it('can render another report after the previous report closes', () => {
    const report={id:'second',title:'Bottles by the road',photo_paths:['second/photo.jpg']};
    expect(renderToStaticMarkup(<ReportPhotoGallery report={report} urls={['https://example.com/new.jpg']} loading={false} width={350} />)).toContain('Bottles by the road');
  });
  it('keeps an explicit fallback when photos are unavailable', () => {
    expect(renderToStaticMarkup(<ReportPhotoGallery report={{id:'report'}} urls={[]} loading={false} width={350} />)).toContain('Photo unavailable');
  });
});
