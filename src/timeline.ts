/**
 * Single source of truth for the cut: scenes, the music edit and sound cues,
 * in seconds. Remotion reads it for the picture; scripts/mix.py reads the
 * JSON export (npm run cues) for the soundtrack, so they cannot drift apart.
 *
 * Music: "Mere Paas Aao Mere Dosto". The slowed hook (0:43–0:49, with its
 * vocals) opens the reel; from the drop on, one guitar groove from the song loops
 * end to end, low and constant; the same groove, slowed, closes it. The sound
 * effects lead; the music stays well underneath.
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
  /** dB, relative to the bed. */
  gain: number;
  fadeIn: number;
  fadeOut: number;
  /** Optional low-pass sweep [startHz, endHz] across the segment. */
  lowpass?: [number, number];
  reverb?: number;
}

/** The slowed bookends. */
export const music: MusicSegment[] = [
  // Slowed and soft, with the vocals: the hook as a memory under "most portfolios
  // look the same". The sung line ends at ~7.06 s; the only vocals in the reel.
  { id: 'intro', at: 0, from: 43.0, to: 49.4, rate: 0.85, gain: 3, fadeIn: 1.2, fadeOut: 0.35, lowpass: [1800, 6000], reverb: 0.4 },
  // The guitar groove, slowed, to close: its first downbeat lands on the outro.
  { id: 'outro', at: 78.0, from: 35.312, to: 41.3, rate: 0.85, gain: 1, fadeIn: 0.05, fadeOut: 3.4, lowpass: [7000, 1400], reverb: 0.45 },
];

/**
 * The loop: four bars of the band's guitar groove before the first sung line
 * (0:35.3–0:41.7). `from` is a downbeat, `to` the downbeat after the last bar.
 * No vocals in it and nothing separated from them, so nothing sounds hollow.
 */
export const grooves = {
  guitar: { from: 35.312, to: 41.675, bars: 4 },
} as const;
export type GrooveId = keyof typeof grooves;

/** The background bed, from the drop to the outro: the one loop, end to end. */
export const bed = {
  /** Video time of the first downbeat: the logo. */
  downbeat: 8.0,
  /** Source time the band's entry fill starts, played into that downbeat. */
  pickup: 34.75,
  /** How far under the effects the bed sits, in LU (the effects set the volume). */
  under: 14,
  /** [groove, bars] in order: the guitar loop eleven times, 44 bars ≈ 8.0 → 78.0 s. */
  plan: Array.from({ length: 11 }, () => ['guitar', 4]) as [GrooveId, number][],
};

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

/**
 * Craft wall: the beats its tiles light up on (frames from the scene start).
 * Fixed numbers, so the camera and its whooshes never move with the music plan.
 */
export const CRAFT_WALL_BEATS = [0, 23, 45, 67, 90, 114, 137, 161, 185, 209, 233, 256, 280, 303, 326, 351];

/** Cold open: hard-cut flashes of what is coming, then the hook (frames). */
export const COLD_OPEN = { shot: 11, shots: 4 };

/** Scenes that land with a zoom punch (and a hit in the mix). */
export const PUNCH: SceneId[] = ['firstLook', 'signals', 'scroll', 'cmdk', 'sound', 'craftWall', 'registry', 'morph', 'press', 'haki', 'details', 'yours'];

/** The avatar egg: when the avatar is clicked inside its scene (s from scene start). */
export const HAKI_CLICK = 0.9;
