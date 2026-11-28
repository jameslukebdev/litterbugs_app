const photoSource = (image: HTMLImageElement) => `${image.getAttribute('src') ?? ''}|${image.getAttribute('srcset') ?? ''}`;

/** Wait for full decoding, not merely a progressive image's first painted bytes. */
function preparePhoto(image: HTMLImageElement, signal: AbortSignal): Promise<boolean> {
  return new Promise(resolve => {
    let finished = false;
    const finish = (ready: boolean) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      image.removeEventListener('load', decode);
      image.removeEventListener('error', failed);
      signal.removeEventListener('abort', failed);
      resolve(ready);
    };
    const failed = () => finish(false);
    const decode = () => {
      if (typeof image.decode !== 'function') { finish(image.naturalWidth > 0); return; }
      void image.decode().then(() => finish(true), failed);
    };
    // A stalled photo must not hold the entire visible group indefinitely.
    const timeout = setTimeout(failed, 5000);
    image.addEventListener('load', decode);
    image.addEventListener('error', failed);
    signal.addEventListener('abort', failed, { once: true });
    image.loading = 'eager';
    if (image.complete) { if (image.naturalWidth > 0) decode(); else failed(); }
    if (signal.aborted) failed();
  });
}

/** Reveal a viewport's photos in the same frame, while leaving offscreen images lazy. */
export function observePhotoBatch(container: HTMLElement, onBusy: (busy: boolean) => void) {
  let stopped = false;
  let frame = 0;
  let revealFrame = 0;
  let wave: { images: HTMLImageElement[]; sources: string[]; controller: AbortController } | null = null;
  const observed = new Set<HTMLImageElement>();
  const stalled = new WeakMap<HTMLImageElement, string>();
  const visible = (image: HTMLImageElement) => {
    const box = image.getBoundingClientRect(), root = container.getBoundingClientRect();
    return box.width > 0 && box.height > 0 && box.bottom > Math.max(0, root.top)
      && box.top < Math.min(window.innerHeight, root.bottom)
      && box.right > Math.max(0, root.left) && box.left < Math.min(window.innerWidth, root.right);
  };
  function schedule() {
    if (!stopped && !frame) frame = requestAnimationFrame(scan);
  }
  const intersection = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(schedule);
  const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
  const mutations = new MutationObserver(schedule);

  function scan() {
    frame = 0;
    if (stopped) return;
    const photos = Array.from(container.querySelectorAll<HTMLImageElement>('img[data-batch-photo]'));
    for (const image of observed) if (!container.contains(image)) { intersection?.unobserve(image); observed.delete(image); }
    for (const image of photos) {
      const source = photoSource(image);
      if (image.dataset.photoReady && image.dataset.photoReady !== source) delete image.dataset.photoReady;
      if (!observed.has(image)) { observed.add(image); intersection?.observe(image); }
    }
    const images = photos.filter(image => image.dataset.photoReady !== photoSource(image) && visible(image)
      && (stalled.get(image) !== photoSource(image) || (image.complete && image.naturalWidth > 0)));
    const sources = images.map(photoSource);
    if (wave && images.length === wave.images.length && images.every((image, i) => image === wave!.images[i] && sources[i] === wave!.sources[i])) return;
    wave?.controller.abort();
    cancelAnimationFrame(revealFrame);
    revealFrame = 0;
    wave = null;
    if (!images.length) { onBusy(false); return; }
    const current = { images, sources, controller: new AbortController() };
    wave = current;
    onBusy(true);
    void Promise.all(images.map(image => preparePhoto(image, current.controller.signal))).then(ready => {
      if (stopped || wave !== current) return;
      revealFrame = requestAnimationFrame(() => {
        revealFrame = 0;
        if (stopped || wave !== current) return;
        images.forEach((image, i) => {
          if (!container.contains(image) || photoSource(image) !== sources[i]) return;
          if (ready[i]) image.dataset.photoReady = sources[i];
          else stalled.set(image, sources[i]);
        });
        wave = null;
        onBusy(false);
      });
    });
  }

  mutations.observe(container, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'srcset', 'data-active'] });
  resize?.observe(container);
  container.addEventListener('load', schedule, true);
  container.addEventListener('error', schedule, true);
  if (!intersection) window.addEventListener('scroll', schedule, true);
  window.addEventListener('resize', schedule);
  schedule();
  return () => {
    stopped = true;
    wave?.controller.abort();
    cancelAnimationFrame(frame);
    cancelAnimationFrame(revealFrame);
    intersection?.disconnect(); resize?.disconnect(); mutations.disconnect();
    container.removeEventListener('load', schedule, true);
    container.removeEventListener('error', schedule, true);
    if (!intersection) window.removeEventListener('scroll', schedule, true);
    window.removeEventListener('resize', schedule);
  };
}
