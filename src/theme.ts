/**
 * The portfolio's own tokens (src/app/globals.css in sudhanshuxsingh/www):
 * zinc paper and ink, hairlines, one green "available" signal. Red is held
 * back for the avatar easter egg, the only moment the palette breaks.
 */
export const ink = {
  bg: '#09090b',
  fg: '#fafafa',
  muted: '#18181b',
  mutedFg: '#a1a1aa',
  dim: '#71717b',
  border: '#27272a',
  line: '#1c1c1f',
  signal: '#4ade80',
  haki: '#ff2a1f',
};

export const paper = {
  bg: '#ffffff',
  fg: '#09090b',
  muted: '#f4f4f5',
  mutedFg: '#71717b',
  dim: '#a1a1aa',
  border: '#e4e4e7',
  line: '#ececee',
  signal: '#15803d',
};

export const sans = 'Geist, ui-sans-serif, system-ui, sans-serif';
export const mono = '"Geist Mono", ui-monospace, monospace';

export const WIDTH = 1080;
export const HEIGHT = 1920;
export const FPS = 60;

/** Seconds → frames at the composition rate. */
export const s = (seconds: number) => Math.round(seconds * FPS);
