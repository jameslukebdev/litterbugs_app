// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('react-native', () => ({
  View: ({ children, accessibilityLabel }) => <div aria-label={accessibilityLabel}>{children}</div>,
  Text: ({ children }) => <span>{children}</span>,
  TouchableOpacity: ({ children, onPress }) => <button onClick={onPress}>{children}</button>,
  StyleSheet: { create: x => x },
}));
vi.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
vi.mock('expo-image', () => ({ Image: ({ source, onError }) => <img src={source.uri} onError={onError} /> }));
import ReportPreviewPhoto from './ReportPreviewPhoto';
import RemotePhoto from './RemotePhoto';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root, host;
afterEach(async () => { if(root) await act(() => root.unmount()); host?.remove(); });
async function mount(props) { host=document.createElement('div');document.body.append(host);root=createRoot(host);await act(() => root.render(<ReportPreviewPhoto {...props} />)); }
describe('preview photo request states', () => {
  it('accepts a late URL hint and ignores a failing older request', async () => {
    let reject;
    const getUrl = vi.fn(() => new Promise((resolve, fail) => { reject = fail; }));
    host=document.createElement('div'); document.body.append(host); root=createRoot(host);
    await act(() => root.render(<RemotePhoto path="a" getUrl={getUrl} />));
    await act(() => root.render(<RemotePhoto path="a" uri="https://example.test/recovered.jpg" getUrl={getUrl} />));
    await act(() => reject(Error('offline')));
    expect(host.querySelector('img').src).toBe('https://example.test/recovered.jpg');
    await act(() => host.querySelector('img').dispatchEvent(new Event('error')));
    await act(() => root.render(<RemotePhoto path="a" uri="https://example.test/refreshed.jpg" getUrl={getUrl} />));
    expect(host.querySelector('img').src).toBe('https://example.test/refreshed.jpg');
  });
  it('keeps a loaded native image mounted when a later URL hint or resolver arrives', async () => {
    const getUrl = vi.fn().mockResolvedValue('https://example.test/a.jpg');
    host=document.createElement('div'); document.body.append(host); root=createRoot(host);
    await act(() => root.render(<RemotePhoto path="a" getUrl={getUrl} />));
    const image = host.querySelector('img');
    const replacementResolver = vi.fn(() => new Promise(() => {}));
    await act(() => root.render(<RemotePhoto path="a" uri="https://example.test/a.jpg" getUrl={replacementResolver} />));
    expect(host.querySelector('img')).toBe(image);
    expect(replacementResolver).not.toHaveBeenCalled();
    expect(host.querySelector('[aria-label="Loading report photo"]')).toBeNull();
  });
  it('shows loading until resolution, not a false empty state', async () => {
    let resolve; const getPhotoUrl=vi.fn(() => new Promise(r=>resolve=r));
    await mount({report:{photo_paths:['a']},getPhotoUrl});
    expect(host.querySelector('[aria-label="Loading report photo"]')).not.toBeNull();
    expect(host.textContent).not.toContain('No photo');
    await act(() => resolve('https://example.test/a.jpg'));
    expect(host.querySelector('img').src).toBe('https://example.test/a.jpg');
  });
  it('retries failed requests and failed image loads with a fresh signed URL', async () => {
    const getPhotoUrl=vi.fn().mockRejectedValueOnce(Error('offline')).mockResolvedValue('https://example.test/a.jpg');
    await mount({report:{photo_paths:['a']},getPhotoUrl});
    expect(host.textContent).toContain('Retry photo');
    await act(() => host.querySelector('button').click());
    expect(getPhotoUrl).toHaveBeenLastCalledWith('a',{force:true});
    await act(() => host.querySelector('img').dispatchEvent(new Event('error')));
    expect(host.textContent).toContain('Retry photo');
    await act(() => host.querySelector('button').click());
    expect(host.querySelector('img')).not.toBeNull();
  });
  it('ignores a stale photo request after report selection changes', async () => {
    let resolve; const getPhotoUrl=vi.fn().mockImplementationOnce(() => new Promise(r=>resolve=r)).mockResolvedValue('https://example.test/b.jpg');
    await mount({report:{photo_paths:['a']},getPhotoUrl});
    await act(() => root.render(<ReportPreviewPhoto report={{photo_paths:['b']}} getPhotoUrl={getPhotoUrl} />));
    await act(() => resolve('https://example.test/a.jpg'));
    expect(host.querySelector('img').src).toBe('https://example.test/b.jpg');
  });
});
