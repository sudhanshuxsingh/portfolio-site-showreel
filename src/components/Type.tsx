import { useCurrentFrame } from 'remotion';
import { ease, tween } from '../lib/anim';
import { ink, mono, sans, serif } from '../theme';

export interface Word {
  text: string;
  /** Frame (scene-relative) the word lands. */
  at: number;
  color?: string;
  weight?: number;
  /** Set in the luxury serif (Instrument Serif italic), sized to sit on the same line. */
  serif?: boolean;
}

/** Instrument Serif runs small next to Geist at display weights: scale it up to match. */
export const SERIF_SCALE = 1.17;

type Mode = 'rise' | 'slam' | 'blur';

/** Words on lines, each rising out of its own mask on its beat. */
export const Words: React.FC<{
  lines: Word[][];
  size: number;
  weight?: number;
  tracking?: number;
  leading?: number;
  align?: 'left' | 'center' | 'right';
  mode?: Mode;
  /** Frame the block leaves. */
  exitAt?: number;
  exit?: 'up' | 'fade' | 'blur';
  color?: string;
  style?: React.CSSProperties;
  duration?: number;
}> = ({
  lines,
  size,
  weight = 640,
  tracking = -0.055,
  leading = 0.9,
  align = 'left',
  mode = 'rise',
  exitAt,
  exit = 'up',
  color = ink.fg,
  style,
  duration = 22,
}) => {
  const frame = useCurrentFrame();
  let index = 0;
  return (
    <div
      style={{
        fontFamily: sans,
        fontSize: size,
        fontWeight: weight,
        letterSpacing: `${tracking}em`,
        lineHeight: leading,
        color,
        textAlign: align,
        perspective: size * 6,
        ...style,
      }}
    >
      {lines.map((line, li) => (
        <div
          key={li}
          style={{
            display: 'flex',
            flexWrap: 'nowrap',
            alignItems: 'baseline',
            justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
            gap: `0 ${size * 0.24}px`,
          }}
        >
          {line.map((word) => {
            const i = index++;
            const p = tween(frame, [word.at, word.at + duration], [0, 1], ease.out);
            const e = exitAt === undefined ? 0 : tween(frame, [exitAt + i * 1.5, exitAt + i * 1.5 + 16], [0, 1], ease.in);
            let transform = '';
            let filter = '';
            let opacity = 1;
            if (mode === 'rise') {
              transform = `translateY(${(1 - p) * 105}%) rotateX(${(1 - p) * -55}deg)`;
              filter = `blur(${(1 - p) * size * 0.05}px)`;
              opacity = Math.min(1, p * 2.2);
            } else if (mode === 'slam') {
              const q = tween(frame, [word.at, word.at + 9], [0, 1], ease.out);
              transform = `scale(${1.45 - 0.45 * q})`;
              filter = `blur(${(1 - q) * size * 0.08}px)`;
              opacity = q;
            } else {
              filter = `blur(${(1 - p) * size * 0.12}px)`;
              opacity = p;
              transform = `scale(${1.08 - 0.08 * p})`;
            }
            if (e > 0) {
              if (exit === 'up') transform += ` translateY(${-e * 110}%)`;
              if (exit === 'blur') filter = `blur(${e * size * 0.12}px)`;
              opacity *= 1 - e;
            }
            const accent = word.serif
              ? {
                  fontFamily: serif,
                  fontStyle: 'italic' as const,
                  fontWeight: 400,
                  fontSize: `${SERIF_SCALE}em`,
                  letterSpacing: '-0.01em',
                  // Same line box as the Geist words, so lines never shift.
                  lineHeight: leading / SERIF_SCALE,
                  // Room for the tall italic ascenders and the lean past the mask.
                  padding: '0.14em 0.1em 0.2em 0.04em',
                  margin: '-0.14em -0.1em -0.2em -0.04em',
                }
              : { padding: `0 0.04em 0.16em`, margin: `0 -0.04em -0.16em` };
            return (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  overflow: mode === 'rise' ? 'hidden' : 'visible',
                  ...accent,
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    transform,
                    filter,
                    opacity,
                    color: word.color ?? (word.serif ? '#ececef' : undefined),
                    fontWeight: word.serif ? 400 : word.weight,
                    transformOrigin: '50% 100%',
                    whiteSpace: 'pre',
                  }}
                >
                  {word.text}
                </span>
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

/** Helper: "Most dev portfolios" at [0, 8, 16] → Word[] */
export const w = (text: string, at: number | number[], color?: string): Word[] =>
  text.split(' ').map((t, i) => ({ text: t, at: Array.isArray(at) ? at[i] ?? at[at.length - 1] : at + i * 6, color }));

/** The same, set in the luxury serif. */
export const lux = (text: string, at: number | number[], color?: string): Word[] => w(text, at, color).map((word) => ({ ...word, serif: true }));

/** Mono technical caption that types itself on. */
export const Label: React.FC<{
  text: string;
  at?: number;
  size?: number;
  color?: string;
  style?: React.CSSProperties;
  cps?: number;
  out?: number;
}> = ({ text, at = 0, size = 26, color = ink.dim, style, cps = 1.6, out }) => {
  const frame = useCurrentFrame();
  const shown = Math.max(0, Math.floor((frame - at) * cps));
  const opacity = out === undefined ? 1 : tween(frame, [out, out + 12], [1, 0]);
  if (frame < at) return null;
  const caret = shown < text.length || Math.floor(frame / 16) % 2 === 0;
  return (
    <div
      style={{
        fontFamily: mono,
        fontSize: size,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color,
        whiteSpace: 'pre',
        opacity,
        ...style,
      }}
    >
      {text.slice(0, shown)}
      <span style={{ opacity: caret && shown < text.length + 30 ? 1 : 0 }}>▍</span>
    </div>
  );
};

/** CSS-equivalent projection of a point on a 3D-transformed element. */
export function project3d(
  point: [number, number],
  el: { x: number; y: number; w: number; h: number; rx?: number; ry?: number; rz?: number; tz?: number; scale?: number },
  perspective: number,
  origin: [number, number]
): [number, number] {
  const rad = Math.PI / 180;
  let x = (point[0] - el.w / 2) * (el.scale ?? 1);
  let y = (point[1] - el.h / 2) * (el.scale ?? 1);
  let z = 0;
  // rotateZ, then rotateY, then rotateX (CSS applies right to left: rotateX(a) rotateY(b) rotateZ(c))
  const rz = (el.rz ?? 0) * rad;
  [x, y] = [x * Math.cos(rz) - y * Math.sin(rz), x * Math.sin(rz) + y * Math.cos(rz)];
  const ry = (el.ry ?? 0) * rad;
  [x, z] = [x * Math.cos(ry) + z * Math.sin(ry), -x * Math.sin(ry) + z * Math.cos(ry)];
  const rx = (el.rx ?? 0) * rad;
  [y, z] = [y * Math.cos(rx) - z * Math.sin(rx), y * Math.sin(rx) + z * Math.cos(rx)];
  z += el.tz ?? 0;
  const cx = el.x + el.w / 2;
  const cy = el.y + el.h / 2;
  const k = perspective / (perspective - z);
  return [origin[0] + (cx + x - origin[0]) * k, origin[1] + (cy + y - origin[1]) * k];
}

/** A drafting callout: dot on the target, leader line, mono label. */
export const Callout: React.FC<{
  target: [number, number];
  label: string;
  /** Where the label sits. */
  to: [number, number];
  at: number;
  out?: number;
  align?: 'left' | 'right';
  size?: number;
  accent?: string;
}> = ({ target, label, to, at, out, align = 'left', size = 25, accent = ink.fg }) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const p = tween(frame, [at, at + 18], [0, 1], ease.out);
  const o = out === undefined ? 1 : tween(frame, [out, out + 10], [1, 0]);
  const elbow: [number, number] = [to[0], target[1] + (to[1] - target[1])];
  const len1 = Math.hypot(elbow[0] - target[0], elbow[1] - target[1]);
  const pulse = 1 + 0.35 * Math.max(0, Math.sin((frame - at) / 7));
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: o, pointerEvents: 'none' }}>
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <circle cx={target[0]} cy={target[1]} r={9 * pulse} fill="none" stroke={accent} strokeOpacity={0.45} strokeWidth={2} />
        <circle cx={target[0]} cy={target[1]} r={5} fill={accent} />
        <line
          x1={target[0]}
          y1={target[1]}
          x2={target[0] + (elbow[0] - target[0]) * p}
          y2={target[1] + (elbow[1] - target[1]) * p}
          stroke={accent}
          strokeOpacity={0.7}
          strokeWidth={2}
          strokeDasharray={len1 > 0 ? undefined : undefined}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          left: align === 'left' ? to[0] + 14 : undefined,
          right: align === 'right' ? 1080 - to[0] + 14 : undefined,
          top: to[1] - size * 0.75,
          padding: `${size * 0.3}px ${size * 0.5}px`,
          border: `1.5px solid rgba(250,250,250,${0.35 * p})`,
          borderRadius: 8,
          background: 'rgba(9,9,11,0.82)',
          backdropFilter: 'blur(6px)',
          fontFamily: mono,
          fontSize: size,
          letterSpacing: '0.04em',
          color: ink.fg,
          whiteSpace: 'nowrap',
          opacity: tween(frame, [at + 8, at + 18], [0, 1]),
          transform: `translateY(${(1 - p) * 8}px)`,
        }}
      >
        {label}
      </div>
    </div>
  );
};
