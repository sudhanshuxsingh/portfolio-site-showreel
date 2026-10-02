/**
 * Single source of truth for the cut: scenes, the music edit and sound cues,
 * in seconds. Remotion reads it for the picture; scripts/mix.py reads the
 * JSON export (npm run cues) for the soundtrack, so they cannot drift apart.
 *
 * Music: "Mere Paas Aao Mere Dosto" — mostly 0:43–0:57 ("A"), and 1:18–1:36
 * ("B") where needed. Soft and slowed at the start and the end.
 * Every scene boundary below sits on a beat of that edit.
 */
export const FPS = 60;
export const sec = (s: number) => Math.round(s * FPS);

export interface MusicSegment {
  id: string;
  /** Video time the segment starts. */
  at: number;
  /** Source window in the song. */
  from: number;
  to: number;
  rate: number;
  /** dB. */
  gain: number;
  fadeIn: number;
  fadeOut: number;
  /** Optional low-pass sweep [startHz, endHz] across the segment. */
  lowpass?: [number, number];
  reverb?: number;
  /** After `to`, a turntable wind-down of this many seconds (pitch and speed → 0). */
  tapeStop?: number;
}

export const music: MusicSegment[] = [
  // Slowed, soft, muffled: the hook as a memory under "most portfolios look the same".
  { id: 'intro', at: 0, from: 43.0, to: 49.4, rate: 0.85, gain: -13, fadeIn: 1.4, fadeOut: 0.35, lowpass: [700, 2600], reverb: 0.45 },
  // The drop: the vocal downbeat at 43.279 lands on the logo at 8.000 s.
  { id: 'hook', at: 7.721, from: 43.0, to: 57.48, rate: 1, gain: -5, fadeIn: 0.02, fadeOut: 0.1 },
  // 1:18–1:36 carries the tour and the features.
  { id: 'verse', at: 22.342, from: 77.95, to: 96.06, rate: 1, gain: -5, fadeIn: 0.03, fadeOut: 0.08 },
  // Back to the hook for craft.
  // …and it winds down like a turntable right on the cut to the easter eggs.
  { id: 'hook2', at: 40.566, from: 43.0, to: 57.38, rate: 1, gain: -5, fadeIn: 0.02, fadeOut: 0, tapeStop: 0.62 },
  // Easter eggs: a muffled bed under the first two eggs, then silence for the Haki.
  { id: 'eggs', at: 56.2, from: 78.0, to: 82.2, rate: 1, gain: -19, fadeIn: 0.6, fadeOut: 0.9, lowpass: [450, 900] },
  // Details and "make it yours".
  { id: 'tail', at: 68.0, from: 86.0, to: 96.06, rate: 1, gain: -6, fadeIn: 0.25, fadeOut: 0.12 },
  // Slowed and soft again to close.
  { id: 'outro', at: 78.0, from: 43.0, to: 49.4, rate: 0.85, gain: -12, fadeIn: 0.12, fadeOut: 3.2, lowpass: [3200, 900], reverb: 0.5 },
];

/** Scene boundaries in seconds. */
export const T = {
  hook: [0, 8.0],
  reveal: [8.0, 14.154],
  firstLook: [14.154, 18.148],
  signals: [18.148, 22.342],
  scroll: [22.342, 29.943],
  cmdk: [29.943, 35.4],
  theme: [35.4, 38.512],
  sound: [38.512, 40.845],
  craftIntro: [40.845, 42.738],
  craftWall: [42.738, 48.972],
  registry: [48.972, 55.066],
  eggsIntro: [55.066, 56.6],
  morph: [56.6, 59.4],
  press: [59.4, 61.6],
  haki: [61.6, 68.0],
  details: [68.0, 72.613],
  yours: [72.613, 78.0],
  outro: [78.0, 85.0],
} as const satisfies Record<string, readonly [number, number]>;

export type SceneId = keyof typeof T;
export const DURATION = T.outro[1];

/** Frames for a scene: [from, durationInFrames]. */
export const scene = (id: SceneId) => {
  const [a, b] = T[id];
  return { from: sec(a), durationInFrames: sec(b) - sec(a) };
};

/** Video-time beats of the music edit (from src/music-beats.json). */
import beatData from './music-beats.json';
export const beats: number[] = music
  .filter((m) => m.gain > -12)
  .flatMap((m) =>
    beatData.beats
      .filter((b) => b >= m.from && b <= m.to)
      .map((b) => +(m.at + (b - m.from) / m.rate).toFixed(3))
  )
  .sort((a, b) => a - b);

/** Beats inside a scene, as frames relative to the scene start. */
export const sceneBeats = (id: SceneId) => {
  const [a, b] = T[id];
  return beats.filter((t) => t >= a - 0.001 && t < b).map((t) => sec(t) - sec(a));
};

/** Haki: when the avatar is clicked inside the haki scene (s from scene start). */
export const HAKI_CLICK = 0.9;
