// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  View: ({ children }) => <div>{children}</div>,
  Text: ({ children }) => <span>{children}</span>,
  TouchableOpacity: ({ children, onPress, disabled }) => <button disabled={disabled} onClick={onPress}>{children}</button>,
}));
const draft = vi.hoisted(() => ({ status: vi.fn(), subscribe: vi.fn(), resolve: vi.fn() }));
vi.mock('../lib/cloudDrafts', () => ({ cloudDrafts: draft }));
import CloudDraftStatus from './CloudDraftStatus';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root, host, notify;
beforeEach(() => {
  vi.resetAllMocks();
  draft.status.mockReturnValue('unsaved');
  draft.subscribe.mockImplementation(listener => { notify = listener; return () => {}; });
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => { await act(() => root.unmount()); host.remove(); });
const mount = onRestored => act(() => root.render(<CloudDraftStatus userId="owner" draftKey="report" onRestored={onRestored} />));

it('occupies no space throughout repeated normal autosave cycles', async () => {
  await mount();
  for (const status of ['unsaved', 'local', 'syncing', 'synced', 'local', 'syncing', 'offline', 'syncing', 'synced']) {
    await act(() => notify('owner', 'report', status));
    expect(host.childNodes.length).toBe(0);
  }
});

it.each(['account', 'device'])('retains the explicit %s conflict resolution', async choice => {
  draft.status.mockReturnValue('conflict');
  const restored = { form: { title: 'Recovered draft' } };
  draft.resolve.mockImplementation(async () => {
    notify('owner', 'report', 'synced');
    return restored;
  });
  const onRestored = vi.fn();
  await mount(onRestored);
  const buttons = host.querySelectorAll('button');
  expect(buttons.length).toBe(2);
  await act(() => buttons[choice === 'account' ? 0 : 1].click());
  expect(draft.resolve).toHaveBeenCalledWith('owner', 'report', choice);
  if (choice === 'account') expect(onRestored).toHaveBeenCalledWith(restored);
  else expect(onRestored).not.toHaveBeenCalled();
  expect(host.childNodes.length).toBe(0);
});

it('retains recovery for an existing submission and displays recovery failures', async () => {
  draft.status.mockReturnValue('submitting');
  draft.resolve.mockRejectedValue(new Error('There is no current account draft to restore.'));
  await mount();
  expect(host.textContent).toContain('Restore submitted draft');
  await act(() => host.querySelector('button').click());
  expect(draft.resolve).toHaveBeenCalledWith('owner', 'report', 'account');
  expect(host.textContent).toContain('There is no current account draft to restore.');
  expect(host.querySelector('button').disabled).toBe(false);
});
