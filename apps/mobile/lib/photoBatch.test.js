import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPhotoBatch } from './photoBatch';

let frames, clock, batch;
const flush = () => { const pending = frames; frames = []; pending.forEach(run => run()); };
function photo(group = null) {
  const slot = batch.createSlot(group);
  const reveal = vi.fn();
  slot.listen(reveal);
  slot.attach();
  return { slot, reveal };
}

beforeEach(() => {
  vi.useFakeTimers();
  frames = [];
  clock = 0;
  batch = createPhotoBatch({ now: () => clock, schedule: run => frames.push(run), cancel: () => {} });
});
afterEach(() => { batch.stop(); vi.useRealTimers(); });

describe('photo batch', () => {
  it('holds loaded photos until every visible photo has loaded, then reveals them together', () => {
    const a = photo(), b = photo(), c = photo();
    a.slot.settle(true); b.slot.settle(true); flush();
    expect(a.reveal).not.toHaveBeenCalled();
    expect(b.reveal).not.toHaveBeenCalled();
    clock = 600;
    c.slot.settle(true); flush();
    [a, b, c].forEach(({ reveal }) => expect(reveal).toHaveBeenCalledExactlyOnceWith(true));
  });

  it('shows an already-cached group at once without a fade', () => {
    const a = photo(), b = photo();
    clock = 30;
    a.slot.settle(true); b.slot.settle(true); flush();
    expect(a.reveal).toHaveBeenCalledWith(false);
    expect(b.reveal).toHaveBeenCalledWith(false);
  });

  it('does not let a failed photo hold the group', () => {
    const a = photo(), b = photo();
    a.slot.settle(true); b.slot.settle(false); flush();
    expect(a.reveal).toHaveBeenCalledOnce();
    expect(b.reveal).not.toHaveBeenCalled();
  });

  it('stops waiting for a stalled photo after five seconds', () => {
    const a = photo(), b = photo();
    a.slot.settle(true); flush();
    expect(a.reveal).not.toHaveBeenCalled();
    vi.advanceTimersByTime(5000); flush();
    expect(a.reveal).toHaveBeenCalledOnce();
    b.slot.settle(true); flush();
    expect(b.reveal).toHaveBeenCalledOnce();
  });

  it('lets off-screen cards load without holding back the visible ones', () => {
    batch.setVisibleGroups(['one', 'two']);
    const one = photo('one'), two = photo('two'), below = photo('three');
    one.slot.settle(true); flush();
    expect(one.reveal).not.toHaveBeenCalled();
    two.slot.settle(true); flush();
    expect(one.reveal).toHaveBeenCalledOnce();
    expect(two.reveal).toHaveBeenCalledOnce();
    expect(below.reveal).not.toHaveBeenCalled();
  });

  it('never hides revealed photos when a newly visible card is still loading', () => {
    batch.setVisibleGroups(['one']);
    const one = photo('one'), two = photo('two');
    one.slot.settle(true); flush();
    batch.setVisibleGroups(['one', 'two']); flush();
    expect(one.reveal).toHaveBeenCalledOnce();
    two.slot.settle(true); flush();
    expect(two.reveal).toHaveBeenCalledOnce();
  });

  it('releases the group when a loading photo leaves the screen', () => {
    const a = photo(), b = photo();
    a.slot.settle(true); flush();
    b.slot.detach(); flush();
    expect(a.reveal).toHaveBeenCalledOnce();
  });

  it('holds a card through a fallback photo after a restart', () => {
    const a = photo(), b = photo();
    a.slot.settle(true);
    b.slot.settle(false); b.slot.restart(); flush();
    expect(a.reveal).not.toHaveBeenCalled();
    b.slot.settle(true); flush();
    expect(a.reveal).toHaveBeenCalledOnce();
    expect(b.reveal).toHaveBeenCalledOnce();
  });
});
