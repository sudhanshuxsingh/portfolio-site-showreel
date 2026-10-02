import { Easing, interpolate } from 'remotion';

export const ease = {
  /** The site's own curve (shimmer, haki ring): expo-ish out. */
  out: Easing.bezier(0.16, 1, 0.3, 1),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  in: Easing.bezier(0.7, 0, 0.84, 0),
  /** Tailwind's default transition curve. */
  tw: Easing.bezier(0.4, 0, 0.2, 1),
  linear: (t: number) => t,
};

/** Clamped interpolate between two frames. */
export const tween = (
  frame: number,
  [start, end]: [number, number],
  [from, to]: [number, number],
  easing: (t: number) => number = ease.out
) =>
  interpolate(frame, [start, end], [from, to], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing,
  });

/** 0 → 1 → 0 window with eased edges. */
export const windowed = (
  frame: number,
  start: number,
  end: number,
  fadeIn = 12,
  fadeOut = 12
) =>
  Math.min(
    tween(frame, [start, start + fadeIn], [0, 1]),
    tween(frame, [end - fadeOut, end], [1, 0], ease.inOut)
  );

/** Critically damped-ish spring evaluated analytically (deterministic). */
export const springy = (
  frame: number,
  start: number,
  { stiffness = 170, damping = 18, mass = 1, fps = 60 } = {}
) => {
  const t = Math.max(0, frame - start) / fps;
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t));
  }
  return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
};

/** Deterministic pseudo-random in [0, 1) for a seed. */
export const rand = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
};
