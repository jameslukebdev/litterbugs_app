import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
vi.mock('react-native', async () => {
  const { createElement } = await import('react');
  const Box = ({ children, accessibilityLabel }) => createElement('div', { 'aria-label': accessibilityLabel }, children);
  class Value {
    interpolate() { return 1; }
    setValue() {}
    stopAnimation() {}
  }
  return { useWindowDimensions: () => ({ width: 393, height: 852, fontScale: 1 }), Animated: { View: Box, Value, timing: () => ({ start: vi.fn() }) }, View: Box, Text: Box, ScrollView: Box, Platform: { OS: 'ios' }, ActionSheetIOS: { showActionSheetWithOptions: vi.fn() }, Alert: { alert: vi.fn() }, TouchableOpacity: Box, Modal: ({ visible, children }) => visible ? children : null,
    FlatList: ({ data, renderItem }) => data.map(item => createElement('div', { key: item.id }, renderItem({ item }))),
    StyleSheet: { create: value => value, hairlineWidth: 1 } };
});
vi.mock('expo-image', () => ({ Image: () => null }));
vi.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
vi.mock('../CompactRankBadge', () => ({ default: () => <div>Ladybug</div> }));
vi.mock('../ProfileAvatar', () => ({ default: () => <div>Profile avatar</div> }));
import MapReportPreview from './MapReportPreview';
const report = { id: 'a', title: 'Bottles by the road', funded_amount_cents: 600 };
const render = props => renderToStaticMarkup(<MapReportPreview insetBottom={0} getPhotoUrl={vi.fn()} {...props} />);
const previewSource = readFileSync(new URL('./MapReportPreview.jsx', import.meta.url), 'utf8');
const previewHeroSource = readFileSync(new URL('./ReportPreviewHero.jsx', import.meta.url), 'utf8');
const mapSource = readFileSync(new URL('../MapScreen.js', import.meta.url), 'utf8');
describe('map preview states', () => {
  it('renders safely before selection and after dismissal', () => {
    expect(render({ report: undefined, nearby: [] })).toBe('');
  });
  it('shows the total cleanup fund and report distance', () => {
    const html = render({ report, distance: 0.4 });
    expect(html).toContain('$6.00');
    expect(html).toContain('Cleanup reward $6.00');
    expect(html).toContain('0.4 mi');
    expect(html).toContain('View report');
  });
  it('does not advertise a completed report as an available reward', () => {
    const html = render({ report: { ...report, cleanup_state: 'completed' } });
    expect(html.match(/Completed/g)).toHaveLength(1);
    expect(html).toContain('Cleanup fund total');
    expect(html).not.toContain('Cleaner reward');
  });
  it('shows compact creator identity, severity, and available actions', () => {
    const html = render({ report: { ...report, reporter: { display_name: 'Luke Barber' }, photo_paths: ['one.jpg', 'two.jpg'] }, canFund: true, canShare: true });
    expect(html).toContain('Reported by Luke Barber');
    expect(html).toContain('Medium severity');
    expect(html).toContain('Ladybug');
    expect(html).not.toContain('Photo 1 of 2');
    expect(html).toContain('Report options');
  });
  it('handles a missing creator and unavailable actions', () => {
    const html = render({ report: { ...report, funded_amount_cents: 0 } });
    expect(html).toContain('Reported by Reporter unavailable');
    expect(html).toContain('Report options');
    expect(html).toContain('Add to favorites');
    expect(html).toContain('Volunteer');
  });
  it('keeps each overlapping report discoverable in the chooser', () => {
    const html = render({ nearby: [report, { id: 'b', title: 'Volunteer cleanup by the creek' }] });
    expect(html).toContain(report.title);
    expect(html).toContain('Volunteer cleanup by the creek');
    expect(html).toContain('Reports here');
  });
  it('animates one-photo previews and hides inactive map controls', () => {
    expect(previewSource).toContain('Animated.timing(animation');
    expect(previewHeroSource).toContain('report?.photo_paths?.[0]');
    expect(previewSource).not.toContain('photos.map');
    expect(mapSource.match(/\{!previewControlsHidden \? <TouchableOpacity/g)).toHaveLength(2);
    expect(mapSource).toContain('setTimeout(() => setPreviewControlsHidden(false), 180)');
    expect(previewHeroSource).toContain("icon: 'trash'");
    expect(previewHeroSource).toContain("icon: 'time'");
    expect(previewHeroSource).toContain("icon: 'leaf'");
  });
});
