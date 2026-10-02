/**
 * Sound cues in absolute seconds, derived from the same numbers the scenes
 * use: the timeline, and the input events each capture recorded per frame.
 * `npm run cues` writes them to out/cues.json for scripts/mix.py.
 */
import { clips, type ClipName } from './lib/clips';
import { HAKI_CLICK, sceneBeats, T, type SceneId } from './timeline';

export type CueType =
  | 'click'
  | 'key'
  | 'keyHeavy'
  | 'tick'
  | 'whoosh'
  | 'whooshLong'
  | 'impact'
  | 'impactSoft'
  | 'riser'
  | 'pop'
  | 'blip'
  | 'glitch'
  | 'thump'
  | 'boing'
  | 'scan'
  | 'shimmer'
  | 'rumble'
  | 'haki'
  | 'scratch'
  | 'hit'
  /** Not a sound: dips the music by `gain` dB for `dur` seconds. */
  | 'duck';

export interface Cue {
  t: number;
  type: CueType;
  /** dB trim. */
  gain?: number;
  /** -1 left … 1 right. */
  pan?: number;
  /** Seconds, for sustained cues (riser, rumble). */
  dur?: number;
}

const FPS = 60;
const at = (scene: SceneId, frame: number) => T[scene][0] + frame / FPS;

/** Capture events → absolute seconds through a scene's trim/hold/rate. */
const fromClip = (
  scene: SceneId,
  clip: ClipName,
  { start = 0, from = 0, rate = 1, hold = 0, types = ['click'] as string[], until = Infinity } = {}
) =>
  clips[clip].events
    .filter((e) => types.includes(e.type) && e.frame >= from)
    .map((e) => ({ e, frame: start + hold + (e.frame - from) / rate }))
    .filter(({ frame }) => frame < until)
    .map(({ e, frame }) => ({ t: at(scene, frame), e }));

export function buildCues(): Cue[] {
  const cues: Cue[] = [];
  const add = (cue: Cue) => cues.push({ ...cue, t: +cue.t.toFixed(4) });

  // 00 Hook — ticks on each word, scratches as the templates get crossed out, a riser into the drop.
  [47, 75, 101, 153, 180, 206, 287, 300, 314].forEach((f, i) => add({ t: at('hook', f), type: 'tick', gain: i >= 6 ? -2 : -6 }));
  add({ t: at('hook', 206), type: 'shimmer', gain: -14 });
  [262, 268, 275, 283, 290, 298].forEach((f, i) => add({ t: at('hook', f), type: 'scratch', gain: -12, pan: i % 2 ? 0.35 : -0.35 }));
  add({ t: at('hook', 262), type: 'whooshLong', gain: -10 });
  add({ t: at('hook', 360), type: 'riser', dur: 2.0, gain: -6 });

  // 01 Reveal — the drop.
  add({ t: at('reveal', 0), type: 'impact', gain: 0 });
  add({ t: at('reveal', 2), type: 'shimmer', gain: -8 });
  add({ t: at('reveal', 24), type: 'whooshLong', gain: -9 });
  add({ t: at('reveal', 180), type: 'tick', gain: -8 });
  add({ t: at('reveal', 203), type: 'tick', gain: -8 });
  add({ t: at('reveal', 275), type: 'pop', gain: -10 });
  add({ t: at('reveal', 344), type: 'whoosh', gain: -8 });

  // 02 First look — the window flies in; the mark is pressed twice.
  add({ t: at('firstLook', 0), type: 'whoosh', gain: -8, pan: 0.2 });
  for (const { t } of fromClip('firstLook', 'hero-spotlight', { from: 40, rate: 1.33 })) add({ t, type: 'thump', gain: -6 });

  // 03 Signals — copy the email (the site's own click).
  add({ t: at('signals', 0), type: 'whoosh', gain: -10 });
  add({ t: at('signals', 70), type: 'whoosh', gain: -14, pan: 0.4 });
  add({ t: at('signals', 154), type: 'whoosh', gain: -14, pan: -0.4 });
  for (const { t } of fromClip('signals', 'hero-copy')) add({ t, type: 'click', gain: 0 });

  // 04 Sections — a tick as each section title rolls in.
  add({ t: at('scroll', 0), type: 'whoosh', gain: -8 });
  const scrollMarks = (clips['scroll-phone'].sections as { id: string; frame: number }[]).map((m) => (m.frame - 30 - 60) / 1.4);
  scrollMarks.forEach((f) => add({ t: at('scroll', f), type: 'tick', gain: -9 }));

  // 05 ⌘K — keycaps, then every keystroke from the capture's input log.
  add({ t: at('cmdk', 22), type: 'keyHeavy', gain: -2 });
  add({ t: at('cmdk', 45), type: 'keyHeavy', gain: -2 });
  add({ t: at('cmdk', 50), type: 'whoosh', gain: -9 });
  const cmdkScene = (c: number) => (c < 260 ? 56 + (c - 14) / 1.3 : 199 + (c - 270) / 1.17);
  let enterCount = 0;
  for (const e of clips.cmdk.events) {
    const t = at('cmdk', cmdkScene(e.frame));
    if (e.type === 'type') add({ t, type: 'key', gain: -10 });
    else if (e.keys === 'Enter') {
      add({ t, type: 'key', gain: -6 });
      add({ t: t + 0.06, type: enterCount === 0 ? 'pop' : 'whoosh', gain: -6 });
      enterCount += 1;
    } else add({ t, type: 'key', gain: -7 });
  }

  // 06 Theme — the circular wipe and the system split.
  add({ t: at('theme', 47), type: 'whooshLong', gain: -6 });
  add({ t: at('theme', 117), type: 'whoosh', gain: -7, pan: -0.3 });
  add({ t: at('theme', 2), type: 'tick', gain: -10 });

  // 07 Sound — the site's synthesized click, exactly; the music steps back for it.
  add({ t: T.sound[0] + 0.05, type: 'duck', gain: -9, dur: T.sound[1] - T.sound[0] - 0.35 });
  add({ t: at('sound', 62), type: 'click', gain: -4 });
  [70, 93, 116].forEach((f) => add({ t: at('sound', f), type: 'click', gain: 2 }));

  // 08 Craft — slam, counter, then each demo as the camera locks onto it.
  add({ t: at('craftIntro', 0), type: 'impactSoft', gain: -2 });
  for (let n = 1; n <= 10; n++) add({ t: at('craftIntro', 8 + (36 * Math.log(1 + n)) / Math.log(11)), type: 'tick', gain: -14 });
  add({ t: at('craftIntro', 100), type: 'whoosh', gain: -8 });
  // Tile activations land on every other beat of the wall (as in CraftWall).
  const wallBeats = sceneBeats('craftWall');
  for (let i = 0; i < 8; i++) {
    const f = wallBeats[i * 2] ?? i * 46;
    add({ t: at('craftWall', f), type: 'whoosh', gain: -13, pan: i % 2 ? 0.45 : -0.45 });
  }

  // 09 Registry — typing, checkmarks, then the real install tabs being clicked.
  for (let f = 14; f < 90; f += 2.6) add({ t: at('registry', f), type: 'key', gain: -17, pan: Math.sin(f) * 0.3 });
  [98, 112, 128].forEach((f) => add({ t: at('registry', f), type: 'pop', gain: -13 }));
  add({ t: at('registry', 160), type: 'whoosh', gain: -8 });
  for (const { t } of fromClip('registry', 'craft-code', { start: 162, hold: 6, from: 150, rate: 1.36 })) add({ t, type: 'click', gain: -3 });

  // 10 Easter eggs — the music cuts; glitch; morph blips; press; Haki.
  add({ t: at('eggsIntro', 0), type: 'impactSoft', gain: -8 });
  add({ t: at('eggsIntro', 50), type: 'glitch', gain: -10, dur: 0.7 });
  [30, 66, 102, 138].forEach((f, i) => add({ t: at('morph', f), type: 'blip', gain: -6, pan: [-0.3, 0.3, -0.2, 0.2][i] }));
  add({ t: at('press', 42), type: 'thump', gain: 0 });
  add({ t: at('press', 82), type: 'boing', gain: -6 });

  const click = T.haki[0] + HAKI_CLICK;
  add({ t: click, type: 'click', gain: 0 });
  add({ t: click, type: 'haki', gain: 0 });
  add({ t: click + 0.36, type: 'rumble', dur: 2.6, gain: -4 });
  add({ t: click + 2.4, type: 'impact', gain: 1 });
  [3.16, 3.29, 3.42, 3.55].forEach((s, i) => add({ t: click + s, type: 'hit', gain: -8 - i * 2 }));
  add({ t: click + 4.4, type: 'whooshLong', gain: -12 });
  // A swell out of the silence, into the details.
  add({ t: T.details[0] - 1.6, type: 'riser', dur: 1.6, gain: -10 });

  // 11 Details — a swipe per card, a tick as each word lands.
  [0, 67, 113, 160, 207, 253].forEach((f, i) => {
    add({ t: at('details', f), type: 'whoosh', gain: -10, pan: i % 2 ? 0.4 : -0.4 });
    add({ t: at('details', [20, 67, 113, 160, 207, 253][i]), type: 'tick', gain: -9 });
  });

  // 12 Make it yours — edits typed, then the scan line swaps the site over.
  add({ t: at('yours', 0), type: 'whoosh', gain: -9 });
  [
    [30, 'Your Name'],
    [62, 'Design engineer · Building on the web.'],
    [100, 'hello@yourname.dev'],
    [128, 'Anywhere, Earth'],
  ].forEach(([start, text]) => {
    const s0 = (start as number) + 8;
    for (let i = 0; i < (text as string).length; i += 2) add({ t: at('yours', s0 + i / 1.4), type: 'key', gain: -16 });
  });
  add({ t: at('yours', 164), type: 'whoosh', gain: -8 });
  add({ t: at('yours', 200), type: 'scan', gain: -6 });

  // 13 Outro.
  add({ t: at('outro', 20), type: 'impactSoft', gain: -8 });
  add({ t: at('outro', 232), type: 'click', gain: 0 });
  add({ t: at('outro', 384), type: 'shimmer', gain: -10 });

  return cues.sort((a, b) => a.t - b.t);
}
