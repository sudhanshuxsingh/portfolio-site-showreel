import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { ease, tween } from '../lib/anim';
import { SpotlightLogo } from '../components/SpotlightLogo';
import { Backdrop, RAIL } from '../components/Sheet';
import { Label, Words, w } from '../components/Type';
import { ink, mono, sans } from '../theme';

/** Mono line with the site's one-shot shimmer sweep (globals.css `.shimmer`). */
export const Shimmer: React.FC<{ text: string; at: number; size: number; style?: React.CSSProperties }> = ({
  text,
  at,
  size,
  style,
}) => {
  const frame = useCurrentFrame();
  const p = tween(frame, [at, at + 96], [100, -100], ease.out);
  const o = tween(frame, [at - 6, at + 10], [0, 1]);
  return (
    <div
      style={{
        fontFamily: mono,
        fontSize: size,
        letterSpacing: '0.01em',
        backgroundImage: `linear-gradient(90deg, ${ink.mutedFg} 0%, ${ink.mutedFg} 40%, ${ink.fg} 50%, ${ink.mutedFg} 60%, ${ink.mutedFg} 100%)`,
        backgroundSize: '200% 100%',
        backgroundPosition: `${p}% 0`,
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
        opacity: o,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {text}
    </div>
  );
};

/** The "Open to new roles" pill with the green ping, at any size. */
export const SignalPill: React.FC<{ scale?: number; label?: string; style?: React.CSSProperties }> = ({
  scale = 1,
  label = 'Open to new roles',
  style,
}) => {
  const frame = useCurrentFrame();
  const ping = (frame % 60) / 60; // Tailwind animate-ping: 1s
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 14 * scale,
        padding: `${9 * scale}px ${22 * scale}px ${9 * scale}px ${18 * scale}px`,
        borderRadius: 999,
        border: `${1.5 * Math.max(1, scale * 0.8)}px solid #27272a`,
        background: 'rgba(9,9,11,0.8)',
        fontFamily: sans,
        fontWeight: 500,
        fontSize: 26 * scale,
        color: ink.fg,
        ...style,
      }}
    >
      <span style={{ position: 'relative', width: 20 * scale, height: 20 * scale, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: ink.signal,
            opacity: 0.4 * (1 - ping),
            transform: `scale(${1 + ping})`,
          }}
        />
        <span style={{ width: 11 * scale, height: 11 * scale, borderRadius: '50%', background: ink.signal }} />
      </span>
      {label}
    </div>
  );
};

export const Reveal: React.FC = () => {
  const frame = useCurrentFrame();
  const flash = tween(frame, [0, 16], [0.9, 0], ease.out);
  // The site's SpotlightLogo, exactly: guides run out, the outline traces on,
  // the hatch settles in, and a cursor light sweeps across to the site's rest spot.
  const draw = tween(frame, [4, 66], [0, 1], ease.inOut);
  const guides = tween(frame, [0, 64], [0, 1], ease.out);
  const hatch = tween(frame, [54, 124], [0, 1]);
  const settle = tween(frame, [150, 222], [0, 1], ease.inOut);
  const exit = tween(frame, [344, 369], [0, 1], ease.in);
  const lx = frame < 100 ? tween(frame, [0, 100], [-0.45, 0.88], ease.inOut) : tween(frame, [100, 200], [0.88, 0.32], ease.inOut);
  const ly = frame < 100 ? tween(frame, [0, 100], [-0.25, 0.72], ease.inOut) : tween(frame, [100, 200], [0.72, 0.3], ease.inOut);
  const idle: [number, number] = [lx + Math.sin(frame / 55) * 0.03 * settle, ly + Math.cos(frame / 70) * 0.03 * settle];

  return (
    <AbsoluteFill>
      <Backdrop />
      <AbsoluteFill
        style={{
          transform: `scale(${1 + exit * 0.7})`,
          filter: `blur(${exit * 22}px)`,
          opacity: 1 - exit,
        }}
      >
        <AbsoluteFill style={{ overflow: 'hidden' }}>
          <div
            style={{
              position: 'absolute',
              left: 540 - 380,
              top: 372,
              transformOrigin: '50% 50%',
              transform: `translateY(${-settle * 285}px) scale(${1 - settle * 0.38})`,
            }}
          >
            <SpotlightLogo id="reveal" width={760} draw={draw} guides={guides} hatch={hatch} light={idle} />
          </div>
        </AbsoluteFill>

        <AbsoluteFill style={{ alignItems: 'center' }}>
          <Words
            style={{ position: 'absolute', top: 905 }}
            size={176}
            weight={620}
            tracking={-0.055}
            leading={0.88}
            align="center"
            lines={[[{ text: 'Sudhanshu', at: 180 }], [{ text: 'Singh', at: 203, serif: true }]]}
          />
          <Shimmer text="Tech Lead · Full-stack GenAI developer." at={250} size={38} style={{ position: 'absolute', top: 1268 }} />
          <div
            style={{
              position: 'absolute',
              top: 1352,
              opacity: tween(frame, [275, 290], [0, 1]),
              transform: `translateY(${tween(frame, [275, 300], [24, 0])}px)`,
            }}
          >
            <SignalPill scale={1.25} />
          </div>
          <Label text="The developer portfolio" at={300} size={30} color={ink.mutedFg} style={{ position: 'absolute', top: 1560, left: RAIL + 22 }} />
          <div
            style={{
              position: 'absolute',
              top: 1560,
              right: RAIL + 22,
              fontFamily: mono,
              fontSize: 30,
              color: ink.dim,
              letterSpacing: '0.06em',
              opacity: tween(frame, [318, 330], [0, 1]),
            }}
          >
            NEXT.JS 15 · REACT 19
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: ink.fg, opacity: flash, mixBlendMode: 'normal' }} />
    </AbsoluteFill>
  );
};
