import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { rand } from '../lib/anim';
import { ink, mono } from '../theme';

export type Tone = 'dark' | 'light' | 'red';

const tones = {
  dark: { bg: ink.bg, line: '#1d1d21', hatch: 'rgba(250,250,250,0.06)', text: '#71717b', strong: '#d4d4d8' },
  light: { bg: '#ffffff', line: '#ececee', hatch: 'rgba(9,9,11,0.07)', text: '#a1a1aa', strong: '#3f3f46' },
  red: { bg: '#120203', line: '#3a0a0a', hatch: 'rgba(255,60,40,0.12)', text: '#ff5a4a', strong: '#ffd0c8' },
};

export const RAIL = 56;

const hatch = (color: string) =>
  `repeating-linear-gradient(315deg, ${color} 0, ${color} 1.5px, transparent 0, transparent 50%)`;

/** The ruled sheet behind everything: rails, hairlines, hatch bands. */
export const Backdrop: React.FC<{ tone?: Tone; rails?: number; bands?: number }> = ({
  tone = 'dark',
  rails = 1,
  bands = 1,
}) => {
  const t = tones[tone];
  return (
    <AbsoluteFill style={{ background: t.bg }}>
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: RAIL, width: 1.5, background: t.line, opacity: rails }} />
      <div style={{ position: 'absolute', top: 0, bottom: 0, right: RAIL, width: 1.5, background: t.line, opacity: rails }} />
      {[150, 1770].map((y) => (
        <div key={y} style={{ position: 'absolute', left: 0, right: 0, top: y, height: 1.5, background: t.line, opacity: rails }} />
      ))}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 104, height: 46, backgroundImage: hatch(t.hatch), backgroundSize: '16px 16px', opacity: bands }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1771.5, height: 46, backgroundImage: hatch(t.hatch), backgroundSize: '16px 16px', opacity: bands }} />
    </AbsoluteFill>
  );
};

/** Moving film grain + soft vignette, over everything. */
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.06 }) => {
  const frame = useCurrentFrame();
  const ox = Math.floor(rand(frame) * 384);
  const oy = Math.floor(rand(frame + 99) * 384);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <AbsoluteFill
        style={{
          backgroundImage: `url(${staticFile('images/grain.png')})`,
          backgroundPosition: `${ox}px ${oy}px`,
          opacity,
          mixBlendMode: 'overlay',
        }}
      />
      <AbsoluteFill style={{ background: 'radial-gradient(120% 80% at 50% 50%, transparent 55%, rgba(0,0,0,0.45) 100%)' }} />
      <Img src={staticFile('images/grain.png')} style={{ display: 'none' }} />
    </AbsoluteFill>
  );
};

/** Title-block captions: identity, sheet number, figure name, progress rule. */
export const SheetOverlay: React.FC<{
  tone?: Tone;
  sheet: number;
  of: number;
  fig: string;
  progress: number;
  opacity?: number;
}> = ({ tone = 'dark', sheet, of, fig, progress, opacity = 1 }) => {
  const t = tones[tone];
  const corner = (style: React.CSSProperties, rotate: number) => (
    <svg width={34} height={34} viewBox="0 0 34 34" style={{ position: 'absolute', ...style, transform: `rotate(${rotate}deg)` }}>
      <path d="M1 22 V1 H22" fill="none" stroke={t.strong} strokeOpacity={0.5} strokeWidth={2} />
    </svg>
  );
  const caption: React.CSSProperties = {
    position: 'absolute',
    fontFamily: mono,
    fontSize: 22,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: t.text,
    whiteSpace: 'nowrap',
  };
  return (
    <AbsoluteFill style={{ opacity, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 150, background: `linear-gradient(180deg, ${t.bg} 0%, ${t.bg}cc 55%, transparent 100%)` }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 190, background: `linear-gradient(0deg, ${t.bg} 0%, ${t.bg}d9 50%, transparent 100%)` }} />
      {corner({ left: 22, top: 22 }, 0)}
      {corner({ right: 22, top: 22 }, 90)}
      {corner({ right: 22, bottom: 22 }, 180)}
      {corner({ left: 22, bottom: 22 }, 270)}
      <div style={{ ...caption, left: RAIL + 18, top: 60, color: t.strong }}>SS/ Developer Portfolio</div>
      <div style={{ ...caption, right: RAIL + 18, top: 60 }}>
        Sheet {String(sheet).padStart(2, '0')} / {String(of).padStart(2, '0')}
      </div>
      <div style={{ ...caption, left: RAIL + 18, bottom: 64, color: t.strong }}>{fig}</div>
      <div style={{ ...caption, right: RAIL + 18, bottom: 64 }}>sudhanshuxsingh.in</div>
      <div style={{ position: 'absolute', left: RAIL, right: RAIL, bottom: 40, height: 2, background: t.line }} />
      <div
        style={{
          position: 'absolute',
          left: RAIL,
          bottom: 40,
          height: 2,
          width: (1080 - RAIL * 2) * progress,
          background: t.strong,
          opacity: 0.8,
        }}
      />
    </AbsoluteFill>
  );
};
