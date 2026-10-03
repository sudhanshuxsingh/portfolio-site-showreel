import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { ease, tween } from '../lib/anim';
import { Backdrop, RAIL } from '../components/Sheet';
import { Label, Words, lux, w } from '../components/Type';
import { ink, mono } from '../theme';

/**
 * The site's UI click (src/lib/sfx.ts): a sine sweeping 900 → 500 Hz over
 * 55 ms, synthesized live with Web Audio. Drawn here as an oscilloscope.
 */
const CLICKS = [70, 93, 116];

const chirp = (t: number) => {
  // t in seconds, 0..0.055
  const f0 = 900;
  const f1 = 500;
  const d = 0.055;
  const k = Math.log(f1 / f0) / d;
  const phase = (2 * Math.PI * f0 * (Math.exp(k * t) - 1)) / k;
  const env = t < 0.008 ? t / 0.008 : Math.exp(-(t - 0.008) * 70);
  return Math.sin(phase) * env;
};

export const Sound: React.FC = () => {
  const frame = useCurrentFrame();
  const last = [...CLICKS].reverse().find((c) => frame >= c);
  const since = last === undefined ? Infinity : frame - last;
  const energy = since === Infinity ? 0 : Math.exp(-since / 9);
  const muted = frame >= 40 && frame < 62;
  const points = Array.from({ length: 240 }, (_, i) => {
    const t = (i / 239) * 0.055;
    const x = 120 + (i / 239) * 840;
    const y = 1180 - chirp(t) * 190 * energy;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <AbsoluteFill>
      <Backdrop />
      <Label text="// 07 — sound design" at={2} style={{ position: 'absolute', left: RAIL + 22, top: 228 }} />
      <Words style={{ position: 'absolute', left: RAIL + 14, top: 290 }} size={150} lines={[w('It even', [0, 12]), w('sounds', 23), lux('right.', 46)]} />

      {/* Speaker toggle, as in the site header. */}
      <div
        style={{
          position: 'absolute',
          left: 540 - 70,
          top: 860,
          width: 140,
          height: 140,
          borderRadius: 28,
          border: `2px solid ${energy > 0.2 ? ink.fg : '#3f3f46'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#111113',
          boxShadow: `0 0 ${60 * energy}px rgba(250,250,250,${0.3 * energy})`,
          transform: `scale(${1 + energy * 0.06})`,
        }}
      >
        <svg width={72} height={72} viewBox="0 0 24 24" fill="none" stroke={ink.fg} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z" />
          {muted ? (
            <>
              <line x1="22" x2="16" y1="9" y2="15" />
              <line x1="16" x2="22" y1="9" y2="15" />
            </>
          ) : (
            <>
              <path d="M16 9a5 5 0 0 1 0 6" />
              <path d="M19.364 18.364a9 9 0 0 0 0-12.728" />
            </>
          )}
        </svg>
      </div>

      <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0 }}>
        <line x1={120} y1={1180} x2={960} y2={1180} stroke="#27272a" strokeWidth={2} strokeDasharray="8 8" />
        {[0, 0.25, 0.5, 0.75, 1].map((p) => (
          <line key={p} x1={120 + p * 840} y1={1160} x2={120 + p * 840} y2={1200} stroke="#3f3f46" strokeWidth={2} />
        ))}
        <polyline points={points} fill="none" stroke={ink.fg} strokeWidth={3} strokeLinejoin="round" opacity={0.35 + energy * 0.65} />
      </svg>
      <div style={{ position: 'absolute', left: 120, right: 120, top: 1420, display: 'flex', justifyContent: 'space-between', fontFamily: mono, fontSize: 26, color: ink.dim, letterSpacing: '0.04em' }}>
        <span>0 ms</span>
        <span>sine · 900 → 500 Hz</span>
        <span>55 ms</span>
      </div>
      <Label text="Synthesized live · Web Audio" at={58} size={28} color={ink.mutedFg} style={{ position: 'absolute', left: 120, top: 1520 }} />
      <Label text="Mute remembers you · localStorage" at={84} size={28} color={ink.mutedFg} style={{ position: 'absolute', left: 120, top: 1572 }} />
      <AbsoluteFill style={{ opacity: tween(frame, [126, 140], [0, 1], ease.in), background: ink.bg }} />
    </AbsoluteFill>
  );
};
