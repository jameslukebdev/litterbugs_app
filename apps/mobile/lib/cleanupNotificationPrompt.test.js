import { expect, it, vi } from 'vitest';
import { createCleanupNotificationPrompt } from './cleanupNotificationPrompt';

function setup() {
  const api = { present: vi.fn(), acknowledge: vi.fn().mockResolvedValue(undefined), open: vi.fn().mockResolvedValue(undefined), onError: vi.fn(), isCurrent: vi.fn(() => true) };
  const prompt = createCleanupNotificationPrompt(api);
  const notice = { id: 'one', event_type: 'report_funding_approved', report_id: 'report' };
  const button = text => api.present.mock.calls.at(-1)[2].find(item => item.text === text);
  return { api, prompt, notice, button };
}
it('does not acknowledge or navigate on display, Later, or native dismissal', () => {
  const { api, prompt, notice, button } = setup();
  prompt.show([notice]);
  expect(api.acknowledge).not.toHaveBeenCalled(); expect(api.open).not.toHaveBeenCalled();
  button('Later').onPress(); prompt.show([notice]);
  expect(api.present).toHaveBeenCalledTimes(1);
  prompt.show([{ ...notice, id: 'two' }]);
  api.present.mock.calls.at(-1)[3].onDismiss();
  expect(api.acknowledge).not.toHaveBeenCalled(); expect(api.open).not.toHaveBeenCalled();
});
it('marks only the displayed batch read after an explicit action', async () => {
  const { api, prompt, notice, button } = setup();
  prompt.show([notice, { ...notice, id: 'two' }]);
  prompt.show([{ ...notice, id: 'three' }]); // Do not replace an open prompt.
  await button('Mark displayed updates read').onPress();
  expect(api.acknowledge).toHaveBeenCalledWith(['one', 'two']);
  expect(api.open).not.toHaveBeenCalled();
  prompt.show([{ ...notice, id: 'three' }]);
  expect(api.present).toHaveBeenCalledTimes(2);
});
it('opens funding-ready work only after the customer chooses View Report', async () => {
  const { api, prompt, notice, button } = setup();
  prompt.show([notice]); await button('View Report').onPress();
  expect(api.open).toHaveBeenCalledWith(expect.objectContaining({ name: 'App', params: { screen: 'Map', params: { reportId: 'report' } } }));
  expect(api.acknowledge).toHaveBeenCalledWith(['one']);
});
it('keeps an unsuccessful acknowledgement eligible for retry', async () => {
  const { api, prompt, notice, button } = setup();
  api.acknowledge.mockRejectedValueOnce(new Error('offline'));
  prompt.show([notice]); await button('Mark read').onPress();
  expect(api.onError).toHaveBeenCalledTimes(1);
  prompt.show([notice]); await button('Mark read').onPress();
  expect(api.acknowledge).toHaveBeenCalledTimes(2);
});
it('does not acknowledge when opening fails or after an account change', async () => {
  const { api, prompt, notice, button } = setup();
  api.open.mockRejectedValue(new Error('navigation unavailable'));
  prompt.show([notice]); await button('View Report').onPress();
  expect(api.acknowledge).not.toHaveBeenCalled();
  prompt.show([notice]); api.isCurrent.mockReturnValue(false);
  await button('Mark read').onPress();
  expect(api.acknowledge).not.toHaveBeenCalled();
});
