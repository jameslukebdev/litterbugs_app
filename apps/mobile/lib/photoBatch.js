// Reveal a screen's photos together instead of one by one as each finishes loading.
//
// Every photo takes a slot when it mounts and settles it once its image has loaded
// (or failed). While any on-screen slot is still loading, loaded photos stay hidden;
// as soon as none is, every loaded photo is revealed in the same frame. Photos that
// are off screen never hold the visible ones back, and a photo that stalls stops
// holding the group after `stallMs`. Photos already revealed are never hidden again.

const INSTANT_MS = 140;

export function createPhotoBatch({
  stallMs = 5000,
  now = () => Date.now(),
  schedule = (callback) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(callback) : setTimeout(callback, 16)),
  cancel = (handle) => (typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame(handle) : clearTimeout(handle)),
} = {}) {
  const active = new Set();
  let visibleGroups = null;
  let frame = null;
  let stopped = false;

  const isVisible = (slot) => visibleGroups == null || slot.group == null || visibleGroups.has(slot.group);

  function evaluate() {
    frame = null;
    if (stopped) return;
    for (const slot of active) if (slot.state === 'pending' && isVisible(slot)) return;
    const ready = [...active].filter((slot) => slot.state === 'loaded' && !slot.revealed);
    if (!ready.length) return;
    // A group that was ready almost immediately (already cached) appears without a fade.
    const animate = now() - Math.min(...ready.map((slot) => slot.startedAt)) >= INSTANT_MS;
    for (const slot of ready) slot.revealed = true;
    for (const slot of ready) slot.notify(animate);
  }

  function request() {
    if (!stopped && frame == null) frame = schedule(evaluate);
  }

  function createSlot(group = null) {
    let timer = null;
    let listener = null;
    const clearStall = () => { if (timer) { clearTimeout(timer); timer = null; } };
    const startStall = () => {
      clearStall();
      timer = setTimeout(() => {
        timer = null;
        if (slot.state === 'pending') { slot.state = 'stalled'; request(); }
      }, stallMs);
    };
    const slot = {
      group,
      state: 'pending',
      revealed: false,
      startedAt: now(),
      notify(animate) { listener?.(animate); },
      attach() {
        if (stopped || active.has(slot)) return;
        active.add(slot);
        if (slot.state === 'pending') startStall();
        request();
      },
      detach() {
        clearStall();
        if (active.delete(slot)) request();
      },
      settle(ok) {
        if (slot.state === 'loaded' || slot.state === 'failed') return;
        clearStall();
        slot.state = ok ? 'loaded' : 'failed';
        if (active.has(slot)) request();
        // A slot outside a mounted batch has nobody to wait for.
        else if (ok) { slot.revealed = true; slot.notify(false); }
      },
      // A retried or replaced photo starts loading again from scratch.
      restart() {
        slot.state = 'pending';
        slot.revealed = false;
        slot.startedAt = now();
        if (active.has(slot)) { startStall(); request(); }
      },
      // Calls back once when the slot is revealed (immediately if it already was).
      listen(callback) {
        listener = callback;
        if (slot.revealed) callback(false);
        return () => { if (listener === callback) listener = null; };
      },
    };
    return slot;
  }

  return {
    createSlot,
    setVisibleGroups(groups) {
      visibleGroups = groups ? new Set(groups) : null;
      request();
    },
    stop() {
      stopped = true;
      if (frame != null) cancel(frame);
      frame = null;
      active.clear();
    },
  };
}
