import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
vi.mock('react-native', () => ({ View: ({children}) => <div>{children}</div>, Text: ({children}) => <span>{children}</span>, StyleSheet: {create: value=>value} }));
vi.mock('react-native-maps', () => ({ Marker: ({children}) => <section>{children}</section> }));
vi.mock('@expo/vector-icons', () => ({Ionicons: ({name}) => <i data-icon={name} />}));
import ReportMapMarkers from './ReportMapMarkers';
const render = (cleanup_state, label, labelled=true, selectedId=null) => renderToStaticMarkup(<ReportMapMarkers markers={[{id:'a',label,labelled,width:80,height:32,coordinate:{latitude:36,longitude:-81},report:{cleanup_state}}]} selectedId={selectedId} />);
describe('report marker meaning', () => {
  it('puts a clock or check before the unchanged funded amount', () => {
    for (const [state,icon] of [['claimed','time-outline'],['completion_submitted','time-outline'],['completed','checkmark']]) {
      const html=render(state,'$25');
      expect(html).toContain(`data-icon="${icon}"`);
      expect(html.indexOf('data-icon')).toBeLessThan(html.indexOf('$25'));
    }
  });
  it('uses a leaf for an unfunded available cleanup without inventing a zero-dollar reward', () => {
    const html=render('available',null);
    expect(html).toContain('leaf-outline'); expect(html).not.toContain('$');
  });
  it('keeps the state icon when a funded label is crowded and reveals the amount on selection', () => {
    expect(render('claimed','$25',false)).toContain('time-outline');
    expect(render('claimed','$25',false)).not.toContain('$25');
    expect(render('claimed','$25',false,'a')).toContain('$25');
  });
});
