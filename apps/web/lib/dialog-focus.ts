type TabKey = Pick<KeyboardEvent, 'key' | 'shiftKey' | 'altKey' | 'ctrlKey' | 'metaKey' | 'preventDefault'>;

/** Explicit steps also work when Safari's native Tab order skips buttons and links. */
export function moveDialogFocus(container: HTMLElement, event: TabKey) {
  if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) return;
  const controls = Array.from(container.querySelectorAll<HTMLElement>(
    'a[href],button,input,select,textarea,summary,[tabindex]',
  )).filter(element => element.tabIndex >= 0 && !element.matches(':disabled')
    && !element.closest('[hidden],[inert],[aria-hidden="true"]')
    && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden');
  event.preventDefault();
  const current = controls.indexOf(document.activeElement as HTMLElement);
  const next = current < 0 ? (event.shiftKey ? controls.length - 1 : 0)
    : (current + (event.shiftKey ? -1 : 1) + controls.length) % controls.length;
  (controls[next] ?? container).focus();
}
