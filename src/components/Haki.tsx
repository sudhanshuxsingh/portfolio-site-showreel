import { AbsoluteFill, Img, staticFile } from 'remotion';

/**
 * Frame-driven port of the portfolio's HakiAvatar
 * (src/registry/new-york/haki-avatar.tsx + src/lib/haki-sprite.ts): the same
 * 8-frame sprite atlas, Conqueror's Haki sequence and effect keyframes, but
 * evaluated from a timestamp so it renders deterministically at any scale.
 */
type Fx = 'none' | 'charge' | 'surge' | 'rage' | 'burst' | 'aftershock';
interface Step {
  frame: number;
  ms: number;
  fx?: Fx;
}

export const CONQUERORS_HAKI: Step[] = [
  { frame: 0, ms: 600 },
  { frame: 1, ms: 360 },
  { frame: 2, ms: 360 },
  { frame: 3, ms: 420, fx: 'charge' },
  { frame: 4, ms: 360, fx: 'charge' },
  { frame: 5, ms: 380, fx: 'surge' },
  { frame: 6, ms: 520, fx: 'rage' },
  { frame: 7, ms: 760, fx: 'burst' },
  { frame: 6, ms: 130, fx: 'aftershock' },
  { frame: 7, ms: 130, fx: 'aftershock' },
  { frame: 6, ms: 130, fx: 'aftershock' },
  { frame: 7, ms: 620, fx: 'aftershock' },
  { frame: 5, ms: 220, fx: 'surge' },
  { frame: 4, ms: 220, fx: 'charge' },
  { frame: 3, ms: 240 },
  { frame: 2, ms: 260 },
  { frame: 1, ms: 300 },
  { frame: 0, ms: 2600 },
];

/** What a click plays on the site: straight in, out as soon as it powers down. */
export const CLICK_SEQUENCE = CONQUERORS_HAKI.slice(1, -1);
export const CLICK_MS = CLICK_SEQUENCE.reduce((sum, step) => sum + step.ms, 0);

const ATLAS = {
  width: 1916,
  height: 821,
  frameWidth: 290,
  frameHeight: 435,
  frames: [
    { x: 10, y: 175, width: 235, height: 435, offsetX: 32 },
    { x: 250, y: 175, width: 220, height: 435, offsetX: 45 },
    { x: 479, y: 175, width: 214, height: 435, offsetX: 46 },
    { x: 707, y: 175, width: 218, height: 435, offsetX: 49 },
    { x: 925, y: 175, width: 231, height: 435, offsetX: 37 },
    { x: 1156, y: 175, width: 238, height: 435, offsetX: 33 },
    { x: 1394, y: 175, width: 248, height: 435, offsetX: 29 },
    { x: 1642, y: 175, width: 274, height: 435, offsetX: 12 },
  ],
};

export const HAKI_ASPECT = ATLAS.frameWidth / ATLAS.frameHeight;

export interface HakiState {
  frame: number;
  fx: Fx;
  /** ms since the current step began. */
  inStep: number;
  /** ms since the burst began (Infinity before it). */
  sinceBurst: number;
  /** 0–1 overall intensity, handy for grading the whole scene. */
  power: number;
}

const POWER: Record<Fx, number> = {
  none: 0,
  charge: 0.35,
  surge: 0.6,
  rage: 0.8,
  burst: 1,
  aftershock: 0.85,
};

/** Resolve the sequence at `ms` since the click. Negative ms = at rest. */
export function hakiAt(ms: number, sequence: Step[] = CLICK_SEQUENCE): HakiState {
  if (ms < 0) return { frame: 0, fx: 'none', inStep: 0, sinceBurst: Infinity, power: 0 };
  let t = 0;
  let burstAt = Infinity;
  for (const step of sequence) {
    if (step.fx === 'burst' && burstAt === Infinity) burstAt = t;
    if (ms < t + step.ms) {
      const fx = step.fx ?? 'none';
      return {
        frame: step.frame,
        fx,
        inStep: ms - t,
        sinceBurst: ms - burstAt,
        power: POWER[fx] + (step.frame >= 3 && fx === 'none' ? 0.1 : 0),
      };
    }
    t += step.ms;
  }
  return { frame: 0, fx: 'none', inStep: ms - t, sinceBurst: ms - burstAt, power: 0 };
}

const pulse = (ms: number, period: number) => {
  // CSS `alternate` ease-in-out between scale 1 and 1.1
  const phase = (ms / period) % 2;
  const x = phase < 1 ? phase : 2 - phase;
  const eased = x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
  return 1 + 0.1 * eased;
};

const shake = (ms: number, period: number): [number, number] => {
  // steps(2) through (-2,1) → (2,-1) → (-1,-2)
  const step = Math.floor((ms % period) / (period / 2));
  return step === 0 ? [-2, 1] : [2, -1];
};

const ringScale = (t: number) => {
  // cubic-bezier(.16,1,.3,1) approximated by an expo-out
  const p = Math.min(1, Math.max(0, t));
  const e = 1 - Math.pow(2, -10 * p);
  return { scale: 0.2 + 2.6 * e, opacity: 1 - e };
};

export const HakiAvatar: React.FC<{
  /** ms since the click; < 0 is the calm rest frame. */
  ms: number;
  width: number;
  /** Multiply the shake distance (it is in CSS px on the site). */
  shakeScale?: number;
  sequence?: Step[];
  style?: React.CSSProperties;
}> = ({ ms, width, shakeScale, sequence, style }) => {
  const state = hakiAt(ms, sequence);
  const scale = width / ATLAS.frameWidth;
  const crop = ATLAS.frames[state.frame];
  const height = ATLAS.frameHeight * scale;
  const fx = state.fx;
  const k = shakeScale ?? scale * 1.4;

  const glowOpacity =
    fx === 'charge' ? 0.35 : fx === 'surge' ? 0.6 : fx === 'none' ? 0 : 0.75;
  const glowScale =
    fx === 'charge'
      ? pulse(state.inStep, 500)
      : fx === 'surge'
        ? pulse(state.inStep, 220)
        : fx === 'none'
          ? 1
          : pulse(state.inStep, 120);
  const [sx, sy] =
    fx === 'burst'
      ? shake(state.inStep, 80)
      : fx === 'rage' || fx === 'aftershock'
        ? shake(state.inStep, 110)
        : [0, 0];
  const flash = fx === 'burst' ? Math.max(0, 0.9 * (1 - state.inStep / 500)) : 0;
  const rings =
    state.sinceBurst >= 0 && state.sinceBurst < 1300
      ? [ringScale(state.sinceBurst / 1000), ringScale((state.sinceBurst - 160) / 1000)]
      : [];

  return (
    <div style={{ position: 'relative', width, height, overflow: 'hidden', isolation: 'isolate', ...style }}>
      <AbsoluteFill style={{ transform: `translate(${sx * k}px, ${sy * k}px)` }}>
        <div
          style={{
            position: 'absolute',
            left: crop.offsetX * scale,
            top: 0,
            width: crop.width * scale,
            height: crop.height * scale,
            overflow: 'hidden',
          }}
        >
          <Img
            src={staticFile('sprites/haki-sheet.png')}
            style={{
              position: 'absolute',
              left: -crop.x * scale,
              top: -crop.y * scale,
              width: ATLAS.width * scale,
              height: ATLAS.height * scale,
              maxWidth: 'none',
            }}
          />
        </div>
        <AbsoluteFill
          style={{
            background: 'radial-gradient(48% 42% at 50% 46%, rgba(255,30,20,.55), transparent 70%)',
            opacity: glowOpacity,
            transform: `scale(${glowScale})`,
            mixBlendMode: 'screen',
          }}
        />
        {rings.map((ring, i) =>
          ring.opacity > 0 && ring.scale > 0.2 ? (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: '50%',
                top: '46%',
                width: '55%',
                aspectRatio: '1',
                borderRadius: '50%',
                border: `${2 * scale}px solid rgb(255 50 35)`,
                boxShadow: `0 0 ${22 * scale}px rgb(255 30 20 / .8), inset 0 0 ${16 * scale}px rgb(255 30 20 / .5)`,
                transform: `translate(-50%, -50%) scale(${ring.scale})`,
                opacity: ring.opacity,
                mixBlendMode: 'screen',
              }}
            />
          ) : null
        )}
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background: 'radial-gradient(circle at 50% 46%, rgb(255 245 240), rgb(255 60 40 / .75) 55%, transparent)',
          opacity: flash,
          mixBlendMode: 'screen',
        }}
      />
    </div>
  );
};
