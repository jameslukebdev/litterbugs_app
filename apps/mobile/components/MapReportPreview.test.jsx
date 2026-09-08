import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
vi.mock('react-native', async () => {
  const { createElement } = await import('react');
  const Box = ({ children }) => createElement('div', null, children);
  return { View: Box, Text: Box, TouchableOpacity: Box, Modal: ({ visible, children }) => visible ? children : null,
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
  it('distinguishes a cleaner reward from a contribution amount', () => {
    const html = render({ report, distance: 0.4 });
    expect(html).toContain('Cleaner reward $6');
    expect(html).toContain('0.4 mi away');
    expect(html).toContain('View report');
  });
  it('does not advertise a completed report as an available reward', () => {
    const html = render({ report: { ...report, cleanup_state: 'completed' } });
    expect(html.match(/Cleanup Complete/g)).toHaveLength(1);
    expect(html).not.toContain('Cleaner reward');
  });
  it('keeps each overlapping report discoverable in the chooser', () => {
    const html = render({ nearby: [report, { id: 'b', title: 'Volunteer cleanup by the creek' }] });
    expect(html).toContain(report.title);
    expect(html).toContain('Volunteer cleanup by the creek');
    expect(html).toContain('Reports here');
  });
});
