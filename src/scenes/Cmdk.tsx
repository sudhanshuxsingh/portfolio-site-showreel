import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion';
import { ease, springy, tween } from '../lib/anim';
import { clips } from '../lib/clips';
import { Backdrop, RAIL } from '../components/Sheet';
import { lerpView, Screen, type View } from '../components/Screen';
import { Label, Words, lux, w } from '../components/Type';
import { ink, mono, sans } from '../theme';

/** An isometric keycap built from stacked rounded layers (real 3D sides). */
export const Keycap: React.FC<{ label: string; size: number; press: number; sub?: string }> = ({ label, size, press, sub }) => {
  const height = size * 0.3 * (1 - press * 0.6);
  const layers = 14;
  const r = size * 0.18;
  return (
    <div style={{ position: 'relative', width: size, height: size, transformStyle: 'preserve-3d' }}>
      {Array.from({ length: layers }, (_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: r,
            background: '#0c0c0e',
            border: '2px solid #2c2c31',
            transform: `translateZ(${(i / layers) * height}px)`,
          }}
        />
      ))}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: r,
          background: 'linear-gradient(135deg, #1a1a1d, #111113)',
          border: `3px solid ${press > 0.3 ? ink.fg : '#45454c'}`,
          boxShadow: press > 0.3 ? `0 0 ${size * 0.3}px rgba(250,250,250,${0.35 * press})` : undefined,
          transform: `translateZ(${height}px)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: sans,
          fontWeight: 500,
          fontSize: size * 0.44,
          color: ink.fg,
        }}
      >
        <span style={{ lineHeight: 1 }}>{label}</span>
        {sub && <span style={{ fontFamily: mono, fontSize: size * 0.11, color: ink.mutedFg, marginTop: size * 0.06, letterSpacing: '0.08em' }}>{sub}</span>}
      </div>
    </div>
  );
};

const keyPress = (frame: number, down: number, up: number) =>
  frame < down ? 0 : frame < up ? tween(frame, [down, down + 4], [0, 1], ease.out) : 1 - springy(frame, up, { stiffness: 260, damping: 14 });

// Two passes through the cmdk capture.
const A = { start: 56, from: 14, rate: 1.3, end: 199 };
const B = { start: 199, from: 270, rate: 1.17, end: 327 };
const toScene = (captureFrame: number) =>
  captureFrame < 260 ? A.start + (captureFrame - A.from) / A.rate : B.start + (captureFrame - B.from) / B.rate;

const FULL: View = { x: 0, y: 70, w: 820, h: 1000 };
const DIALOG: View = { x: 110, y: 300, w: 600, h: 731.7 };
const TOAST: View = { x: 330, y: 640, w: 480, h: 585.4 };

const KEY_LABELS: Record<string, string> = { 'Control+K': '⌘K', ArrowDown: '↓', Enter: '↵' };

export const Cmdk: React.FC = () => {
  const frame = useCurrentFrame();
  const events = clips.cmdk.events;
  const openA = toScene(events.find((e) => e.type === 'key' && e.keys === 'Control+K')!.frame);
  const enters = events.filter((e) => e.type === 'key' && e.keys === 'Enter').map((e) => toScene(e.frame));
  const openB = toScene(events.filter((e) => e.type === 'key' && e.keys === 'Control+K')[1].frame);

  // Camera: full → dialog → toast → dialog → full (light).
  const zIn1 = tween(frame, [openA, openA + 26], [0, 1], ease.inOut);
  const toToast = tween(frame, [enters[0] + 2, enters[0] + 28], [0, 1], ease.inOut);
  const zIn2 = tween(frame, [openB - 4, openB + 22], [0, 1], ease.inOut);
  const zOut2 = tween(frame, [enters[1] - 2, enters[1] + 26], [0, 1], ease.inOut);
  const view =
    frame < enters[0] + 2
      ? lerpView(FULL, DIALOG, zIn1)
      : frame < openB - 4
        ? lerpView(DIALOG, TOAST, toToast)
        : frame < enters[1] - 2
          ? lerpView(TOAST, DIALOG, zIn2)
          : lerpView(DIALOG, FULL, zOut2);

  const keysIntro = tween(frame, [50, 72], [1, 0], ease.in);
  const shot = tween(frame, [50, 76], [0, 1], ease.out);

  // Key echo chips from the capture's own input log.
  const chips: { label: string; at: number }[] = [];
  let typed = '';
  let typedAt = 0;
  for (const e of events) {
    const at = toScene(e.frame);
    if (e.type === 'type') {
      if (!typed) typedAt = at;
      typed += e.char as string;
      continue;
    }
    if (typed) {
      chips.push({ label: typed, at: typedAt });
      typed = '';
    }
    chips.push({ label: KEY_LABELS[e.keys as string] ?? (e.keys as string), at });
  }
  const visible = chips.filter((c) => frame >= c.at && frame < c.at + 70);

  return (
    <AbsoluteFill>
      <Backdrop />
      <Label text="// 05 — command menu" at={2} style={{ position: 'absolute', left: RAIL + 22, top: 228 }} />
      <Words
        style={{ position: 'absolute', left: RAIL + 14, top: 290 }}
        size={140}
        lines={[w('Everything,', 6), w('one keystroke', [24, 34]), lux('away.', 47)]}
        exitAt={300}
      />

      {/* ⌘ + K keycaps, pressed on the beats. */}
      <AbsoluteFill style={{ perspective: 1800, opacity: keysIntro }}>
        <div
          style={{
            position: 'absolute',
            left: 540,
            top: 1170,
            transformStyle: 'preserve-3d',
            transform: `translate(-50%, -50%) rotateX(56deg) rotateZ(-38deg) scale(${1 + (1 - keysIntro) * 0.4})`,
            display: 'flex',
            gap: 44,
          }}
        >
          <Keycap label="⌘" sub="COMMAND" size={250} press={keyPress(frame, 22, 52)} />
          <Keycap label="K" size={250} press={keyPress(frame, 45, 52)} />
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ perspective: 2200, opacity: shot }}>
        <div
          style={{
            position: 'absolute',
            left: 70,
            top: 730,
            transformStyle: 'preserve-3d',
            transform: `translateZ(${(1 - shot) * -900}px) rotateX(${6 + (1 - shot) * 20}deg) rotateY(${tween(frame, [56, 327], [8, -5], ease.inOut)}deg)`,
          }}
        >
          <Sequence from={A.start} durationInFrames={A.end - A.start} layout="none">
            <Screen clip="cmdk" width={940} view={view} from={A.from} rate={A.rate} cursor={false} />
          </Sequence>
          <Sequence from={B.start} durationInFrames={B.end - B.start} layout="none">
            <Screen clip="cmdk" width={940} view={view} from={B.from} rate={B.rate} cursor={false} theme={frame > enters[1] + 2 ? 'light' : 'dark'} />
          </Sequence>
        </div>
      </AbsoluteFill>

      {/* Key echo. */}
      <div style={{ position: 'absolute', left: RAIL + 22, right: RAIL + 22, top: 212, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        {visible.map((chip) => {
          const p = tween(frame, [chip.at, chip.at + 8], [0, 1], ease.out);
          const o = tween(frame, [chip.at + 55, chip.at + 70], [1, 0]);
          return (
            <div
              key={`${chip.label}-${chip.at}`}
              style={{
                padding: '5px 14px',
                borderRadius: 10,
                border: '2px solid #3f3f46',
                borderBottomWidth: 4,
                background: '#111113',
                fontFamily: chip.label.length > 2 ? mono : sans,
                fontSize: 26,
                fontWeight: 500,
                color: ink.fg,
                opacity: p * o,
                transform: `translateY(${(1 - p) * 18}px) scale(${0.9 + 0.1 * p})`,
                whiteSpace: 'nowrap',
              }}
            >
              {chip.label}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
