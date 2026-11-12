// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { observePhotoBatch } from './photo-batch';

const frames = new Map<number, FrameRequestCallback>();
let frameId = 0;
let dispose: (() => void) | undefined;
let root: HTMLDivElement;
const busy = vi.fn();
const box = (top = 100, left = 10) => ({ top, bottom: top + 100, left, right: left + 180, width: 180, height: 100, x: left, y: top, toJSON() {} });
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}
function photo(src: string, top = 100) {
  const image = document.createElement('img');
  image.src = src; image.dataset.batchPhoto = ''; image.loading = 'lazy';
  let loaded = false;
  let decode = deferred();
  let position = top;
  Object.defineProperties(image, { complete: { get: () => loaded }, naturalWidth: { get: () => loaded ? 180 : 0 } });
  image.getBoundingClientRect = () => box(position);
  image.decode = vi.fn(() => decode.promise);
  root.append(image);
  return {
    image,
    load: () => { loaded = true; image.dispatchEvent(new Event('load')); },
    get decoded() { return decode.resolve; },
    move: (next: number) => { position = next; },
    replace: (next: string) => { loaded = false; decode = deferred(); image.src = next; },
  };
}
function frame() {
  const pending = [...frames.values()]; frames.clear();
  pending.forEach(callback => callback(0));
}
async function microtasks() { for (let i = 0; i < 8; i++) await Promise.resolve(); }
async function reveal() { await microtasks(); frame(); await microtasks(); }
beforeEach(() => {
  vi.useFakeTimers(); frames.clear(); busy.mockClear();
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++frameId, callback); return frameId; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  vi.stubGlobal('IntersectionObserver', undefined);
  vi.stubGlobal('ResizeObserver', undefined);
  root = document.createElement('div'); root.getBoundingClientRect = () => ({ ...box(0), width: 800, height: 600, right: 800, bottom: 600 });
  document.body.append(root);
});
afterEach(() => { dispose?.(); dispose = undefined; root.remove(); vi.unstubAllGlobals(); vi.useRealTimers(); });

it('reveals visible photos in the same frame only after every one has decoded', async () => {
  const one = photo('/one.jpg'), two = photo('/two.jpg'), offscreen = photo('/far.jpg', 1000);
  dispose = observePhotoBatch(root, busy); frame();
  expect(one.image.loading).toBe('eager'); expect(offscreen.image.loading).toBe('lazy');
  one.load(); one.decoded(); await reveal();
  expect(one.image.dataset.photoReady).toBeUndefined();
  two.load(); await reveal();
  expect(one.image.dataset.photoReady).toBeUndefined();
  expect(two.image.dataset.photoReady).toBeUndefined();
  two.decoded(); await microtasks();
  expect(one.image.dataset.photoReady).toBeUndefined();
  frame();
  expect(one.image.dataset.photoReady).toBe('/one.jpg|');
  expect(two.image.dataset.photoReady).toBe('/two.jpg|');
  expect(offscreen.image.dataset.photoReady).toBeUndefined();
  expect(busy).toHaveBeenLastCalledWith(false);
});

it('handles photos already in the browser cache', async () => {
  const one = photo('/cached.jpg'); one.load(); one.decoded();
  dispose = observePhotoBatch(root, busy); frame(); await reveal();
  expect(one.image.dataset.photoReady).toBe('/cached.jpg|');
});

it('does not hold the other photos when an image fails', async () => {
  const good = photo('/good.jpg'), bad = photo('/bad.jpg');
  dispose = observePhotoBatch(root, busy); frame();
  bad.image.dispatchEvent(new Event('error')); good.load(); good.decoded(); await reveal();
  expect(good.image.dataset.photoReady).toBe('/good.jpg|');
  expect(bad.image.dataset.photoReady).toBeUndefined();
  expect(busy).toHaveBeenLastCalledWith(false);
});

it('drops obsolete image work after a filter or retry changes the source', async () => {
  const one = photo('/old.jpg');
  dispose = observePhotoBatch(root, busy); frame();
  one.load(); const oldDecode = one.decoded;
  one.replace('/new.jpg'); await microtasks(); frame();
  oldDecode(); await reveal();
  expect(one.image.dataset.photoReady).toBeUndefined();
  one.load(); one.decoded(); await reveal();
  expect(one.image.dataset.photoReady).toBe('/new.jpg|');
});

it('starts a new visible group on scroll instead of waiting for a photo left behind', async () => {
  const old = photo('/old-view.jpg'), next = photo('/new-view.jpg', 1000);
  dispose = observePhotoBatch(root, busy); frame();
  old.move(-300); next.move(100); window.dispatchEvent(new Event('scroll')); frame();
  next.load(); next.decoded(); await reveal();
  expect(next.image.dataset.photoReady).toBe('/new-view.jpg|');
  expect(old.image.dataset.photoReady).toBeUndefined();
});

it('releases ready photos after a five-second stall and lets the late photo recover', async () => {
  const good = photo('/good.jpg'), slow = photo('/slow.jpg');
  dispose = observePhotoBatch(root, busy); frame();
  good.load(); good.decoded(); await microtasks();
  vi.advanceTimersByTime(5000); await reveal();
  expect(good.image.dataset.photoReady).toBe('/good.jpg|');
  expect(slow.image.dataset.photoReady).toBeUndefined();
  expect(busy).toHaveBeenLastCalledWith(false);
  slow.load(); slow.decoded(); await reveal(); await reveal();
  expect(slow.image.dataset.photoReady).toBe('/slow.jpg|');
});

it('cancels timers and scheduled reveals when leaving the page', async () => {
  const one = photo('/one.jpg');
  dispose = observePhotoBatch(root, busy); frame();
  one.load(); one.decoded(); await microtasks();
  dispose(); dispose = undefined;
  expect(vi.getTimerCount()).toBe(0); expect(frames.size).toBe(0);
  frame(); await microtasks();
  expect(one.image.dataset.photoReady).toBeUndefined();
});
