import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
const platform = vi.hoisted(() => ({ OS: 'ios' }));
vi.mock('react-native', () => ({ Platform: platform, View: ({children}) => <div>{children}</div>, Text: ({children}) => <span>{children}</span>, Image: ({source}) => <img data-src={source?.testUri} />, StyleSheet: {create: value=>value} }));
vi.mock('react-native-maps', () => ({ Marker: ({children}) => <section>{children}</section> }));
vi.mock('@expo/vector-icons', () => ({Ionicons: ({name}) => <i data-icon={name} />}));
vi.mock('./AndroidReportMarker', () => ({ default: ({ children }) => <section>{children}</section> }));
import ReportMapMarkers from './ReportMapMarkers';
const render = (cleanup_state, label, labelled=true, selectedId=null) => renderToStaticMarkup(<ReportMapMarkers markers={[{id:'a',label,labelled,width:80,height:32,coordinate:{latitude:36,longitude:-81},report:{cleanup_state}}]} selectedId={selectedId} />);
afterEach(() => { platform.OS = 'ios'; });
describe('report marker meaning', () => {
  it('labels each state with its website bug', () => {
    for (const [state, bug] of [['available','ladybug'],['claimed','caterpillar'],['completion_submitted','caterpillar'],['completed','flower']]) {
      expect(render(state,'$25')).toContain(`/${bug}.png`);
    }
  });
  it('shows money only on open reports and keeps $0 pins as the bug alone', () => {
    expect(render('available','$25')).toContain('$25');
    expect(render('available','$0')).not.toContain('$0');
    expect(render('claimed','$25')).not.toContain('$25');
    expect(render('completed','$25')).not.toContain('$25');
  });
  it('hides a crowded amount and reveals it on selection', () => {
    expect(render('available','$25',false)).toContain('/ladybug.png');
    expect(render('available','$25',false)).not.toContain('$25');
    expect(render('available','$25',false,'a')).toContain('$25');
  });
  it('preserves Android marker identity for visual changes and refreshes immutable spoken information', () => {
    platform.OS = 'android';
    const base = { id: 'a', label: '$6', labelled: true, coordinate: { latitude: 36, longitude: -81 }, report: { title: 'Creek', cleanup_state: 'available' } };
    const key = (marker, selectedId) => {
      const tree = ReportMapMarkers({ markers: [marker], selectedId });
      return React.Children.toArray(tree.props.children)[0].key;
    };
    expect(key({ ...base, labelled: false, width: 100 }, 'a')).toBe(key(base));
    expect(key({ ...base, label: '$8' })).not.toBe(key(base));
    expect(key({ ...base, report: { ...base.report, cleanup_state: 'completed' } })).not.toBe(key(base));
    platform.OS = 'ios';
    expect(key({ ...base, label: '$8' })).toBe(key(base));
  });
});
