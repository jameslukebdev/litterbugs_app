// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { moveDialogFocus } from './dialog-focus';
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{}] as unknown as DOMRectList);
  document.body.innerHTML = '<input id="behind"><section tabindex="-1"><button id="close">Close</button><button id="copy">Copy</button><a id="last" href="#">Last</a></section>';
});
afterEach(() => { document.body.innerHTML = ''; vi.restoreAllMocks(); });
const dialog = () => document.querySelector('section')!;
function tab(shiftKey = false) {
  const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey, cancelable: true });
  moveDialogFocus(dialog(), event);
  expect(event.defaultPrevented).toBe(true);
  return document.activeElement?.id;
}
it('handles initial dialog focus and every forward step without relying on the browser Tab order', () => {
  dialog().focus();
  expect(tab()).toBe('close');
  expect(tab()).toBe('copy');
  expect(tab()).toBe('last');
  expect(tab()).toBe('close');
});
it('handles reverse steps and brings escaped focus back into the active dialog', () => {
  document.querySelector<HTMLElement>('#behind')!.focus();
  expect(tab(true)).toBe('last');
  expect(tab(true)).toBe('copy');
  expect(tab(true)).toBe('close');
  expect(tab(true)).toBe('last');
});
it('skips disabled, negative-tabindex, hidden, inert and invisible controls', () => {
  dialog().innerHTML = '<button hidden>Hidden</button><div hidden><button>Hidden child</button></div><div inert><button>Inert</button></div><a href="#" tabindex="-1">Download</a><button disabled>Busy</button><fieldset disabled><input></fieldset><button style="visibility:hidden">Invisible</button><button id="only">Visible</button>';
  expect(tab()).toBe('only');
  expect(tab()).toBe('only');
});
it('retains dialog focus if no controls can be focused', () => {
  dialog().innerHTML = '<button disabled>Saving</button>';
  tab();
  expect(document.activeElement).toBe(dialog());
});
it('leaves browser keyboard shortcuts untouched', () => {
  const event = new KeyboardEvent('keydown', { key: 'Tab', ctrlKey: true, cancelable: true });
  moveDialogFocus(dialog(), event);
  expect(event.defaultPrevented).toBe(false);
});
