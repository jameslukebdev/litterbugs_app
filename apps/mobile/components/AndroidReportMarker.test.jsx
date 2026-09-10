// @vitest-environment jsdom
import React, { act, forwardRef, useImperativeHandle } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';

const native = vi.hoisted(() => ({ redraw: vi.fn(), tracking: null }));
vi.mock('react-native-maps', () => ({
  Marker: forwardRef(({ children, tracksViewChanges }, ref) => {
    native.tracking = tracksViewChanges;
    useImperativeHandle(ref, () => ({ redraw: native.redraw }));
    return <div>{children}</div>;
  }),
}));
vi.mock('@expo/vector-icons', () => ({ Ionicons: { font: {} } }));
vi.mock('expo-font', () => ({ loadAsync: () => Promise.resolve() }));
import AndroidReportMarker from './AndroidReportMarker';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root, host;
const Child = ({ children }) => <span>{children}</span>;
afterEach(async () => {
  if (root) await act(() => root.unmount());
  root = null;
  host?.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  native.redraw.mockClear();
});

it('redraws changed artwork but not unchanged markers after camera updates', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('requestAnimationFrame', callback => setTimeout(callback, 16));
  vi.stubGlobal('cancelAnimationFrame', id => clearTimeout(id));
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  const render = (snapshotKey, tracking, latitude = 36) => act(() => root.render(
    <AndroidReportMarker snapshotKey={snapshotKey} tracksViewChanges={tracking} coordinate={{ latitude, longitude: -81 }}>
      <Child>{snapshotKey}</Child>
    </AndroidReportMarker>,
  ));
  await render('dot', true);
  await act(() => vi.advanceTimersByTimeAsync(40));
  expect(native.redraw).toHaveBeenCalledTimes(1);
  expect(native.tracking).toBe(false);

  await render('dot', false, 36.1);
  await render('dot', true, 36.2);
  await act(() => vi.advanceTimersByTimeAsync(1000));
  expect(native.redraw).toHaveBeenCalledTimes(1);

  await render('selected-$6', true);
  await act(() => vi.advanceTimersByTimeAsync(40));
  expect(native.redraw).toHaveBeenCalledTimes(2);

  await render('dot', false);
  await act(() => root.unmount());
  root = null;
  await act(() => vi.advanceTimersByTimeAsync(1000));
  expect(native.redraw).toHaveBeenCalledTimes(2);
});
