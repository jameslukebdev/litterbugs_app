import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
vi.mock('react-native', async () => {
  const { createElement } = await import('react');
  const Box = ({ children, accessibilityLabel }) => createElement('div', { 'aria-label': accessibilityLabel }, children);
  return { useWindowDimensions: () => ({ width: 393, height: 852, fontScale: 1 }), View: Box, Text: Box, ScrollView: Box, Platform: { OS: 'ios' }, ActionSheetIOS: { showActionSheetWithOptions: vi.fn() }, Alert: { alert: vi.fn() }, TouchableOpacity: Box, Modal: ({ visible, children }) => visible ? children : null,
    FlatList: ({ data, renderItem }) => data.map(item => createElement('div', { key: item.id }, renderItem({ item }))),
    StyleSheet: { create: value => value, hairlineWidth: 1 } };
});
vi.mock('expo-image', () => ({ Image: () => null }));
vi.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
import MapReportPreview from './MapReportPreview';
const report = { id: 'a', title: 'Bottles by the road', funded_amount_cents: 600 };
const render = props => renderToStaticMarkup(<MapReportPreview insetBottom={0} getPhotoUrl={vi.fn()} {...props} />);
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
  it('shows the creator, photo count, and available actions', () => {
    const html = render({ report: { ...report, reporter: { display_name: 'Luke Barber' }, photo_paths: ['one.jpg', 'two.jpg'] }, canFund: true, canShare: true });
    expect(html).toContain('Reported by Luke Barber');
    expect(html).toContain('Photo 1 of 2');
    expect(html).toContain('Report options');
  });
  it('handles a missing creator and unavailable actions', () => {
    const html = render({ report });
    expect(html).toContain('Reported by Reporter unavailable');
    expect(html).toContain('Report options');
    expect(html).toContain('Add to favorites');
  });
  it('keeps each overlapping report discoverable in the chooser', () => {
    const html = render({ nearby: [report, { id: 'b', title: 'Volunteer cleanup by the creek' }] });
    expect(html).toContain(report.title);
    expect(html).toContain('Volunteer cleanup by the creek');
    expect(html).toContain('Reports here');
  });
});
