/**
 * Frame-accurate capture for live web UIs.
 *
 * Screen recorders sample a page in real time, so JS- and CSS-driven motion
 * stutters whenever a frame takes longer than 16 ms to encode. Instead, this
 * freezes the page's clock and steps it exactly one frame at a time:
 *
 *  - Date, performance.now, setTimeout/Interval, requestAnimationFrame and
 *    requestIdleCallback all run on a virtual clock (framer-motion, React
 *    timers, sonner, next-themes, the Haki sequencer…).
 *  - CSS animations, CSS transitions and WAAPI animations are paused and
 *    seeked to the virtual time on every frame via document.getAnimations().
 *
 * The result is a perfect 60 fps capture of the real site, however slow the
 * screenshotting is.
 */
export function installVirtualTime(epoch) {
  if (window.__vt) return;
  const realSetTimeout = window.setTimeout.bind(window);
  const RealDate = window.Date;

  const vt = {
    now: 0,
    epoch,
    timers: new Map(),
    nextTimer: 1,
    rafs: new Map(),
    nextRaf: 1,
    seen: new WeakMap(),
    realSetTimeout,
  };

  Object.defineProperty(performance, 'now', {
    configurable: true,
    value: () => vt.now,
  });

  function VDate(...args) {
    if (!new.target) return new RealDate(vt.epoch + vt.now).toString();
    return args.length === 0
      ? new RealDate(vt.epoch + vt.now)
      : new RealDate(...args);
  }
  VDate.prototype = RealDate.prototype;
  VDate.now = () => vt.epoch + vt.now;
  VDate.parse = RealDate.parse;
  VDate.UTC = RealDate.UTC;
  window.Date = VDate;

  const addTimer = (cb, ms, args, interval) => {
    const id = vt.nextTimer++;
    const delay = Math.max(0, Number(ms) || 0);
    vt.timers.set(id, {
      due: vt.now + delay,
      cb,
      args,
      interval: interval ? Math.max(1, delay) : null,
    });
    return id;
  };
  window.setTimeout = (cb, ms, ...args) => addTimer(cb, ms, args, false);
  window.setInterval = (cb, ms, ...args) => addTimer(cb, ms, args, true);
  window.clearTimeout = (id) => vt.timers.delete(id);
  window.clearInterval = (id) => vt.timers.delete(id);
  window.requestAnimationFrame = (cb) => {
    const id = vt.nextRaf++;
    vt.rafs.set(id, cb);
    return id;
  };
  window.cancelAnimationFrame = (id) => vt.rafs.delete(id);
  window.requestIdleCallback = (cb) =>
    addTimer(() => cb({ didTimeout: false, timeRemaining: () => 40 }), 1, [], false);
  window.cancelIdleCallback = (id) => vt.timers.delete(id);

  const run = (fn, args) => {
    try {
      if (typeof fn === 'function') fn(...args);
    } catch (error) {
      console.error('[vt]', error);
    }
  };

  vt.advanceTo = (target) => {
    for (let guard = 0; guard < 10000; guard++) {
      let pick = null;
      for (const [id, timer] of vt.timers) {
        if (timer.due > target) continue;
        if (!pick || timer.due < pick[1].due) pick = [id, timer];
      }
      if (!pick) break;
      const [id, timer] = pick;
      vt.now = Math.max(vt.now, timer.due);
      if (timer.interval !== null) timer.due += timer.interval;
      else vt.timers.delete(id);
      run(timer.cb, timer.args);
    }
    vt.now = target;
  };

  /** Seek every running animation to the virtual clock. */
  vt.sync = () => {
    for (const animation of document.getAnimations()) {
      let start = vt.seen.get(animation);
      if (start === undefined) {
        start = vt.now;
        vt.seen.set(animation, start);
      }
      const timing = animation.effect?.getComputedTiming?.();
      const end = timing ? timing.endTime : Infinity;
      const elapsed = (vt.now - start) * (animation.playbackRate || 1);
      try {
        if (Number.isFinite(end) && elapsed >= end) {
          if (animation.playState !== 'finished') animation.finish();
        } else {
          if (animation.playState !== 'paused') animation.pause();
          animation.currentTime = elapsed;
        }
      } catch (error) {
        console.error('[vt] animation', error);
      }
    }
  };

  vt.frame = (dt) => {
    vt.advanceTo(vt.now + dt);
    const callbacks = [...vt.rafs.values()];
    vt.rafs.clear();
    for (const cb of callbacks) run(cb, [vt.now]);
    vt.sync();
  };

  /** Resolve after queued tasks (React's MessageChannel scheduler) drain. */
  vt.settle = () =>
    new Promise((resolve) => {
      const channel = new MessageChannel();
      let hops = 0;
      channel.port1.onmessage = () => {
        if (++hops < 3) channel.port2.postMessage(0);
        else resolve();
      };
      channel.port2.postMessage(0);
    });

  window.__vt = vt;
}
