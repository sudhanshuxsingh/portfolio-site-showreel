import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { ease, rand, tween } from '../lib/anim';
import { Backdrop, RAIL } from '../components/Sheet';
import { Label, Words, w } from '../components/Type';
import { ink } from '../theme';

/** The template every portfolio uses: centred avatar, two bars, two buttons. */
const TemplateCard: React.FC<{ crossed: number; lit: number }> = ({ crossed, lit }) => (
  <div
    style={{
      position: 'relative',
      width: 190,
      height: 250,
      borderRadius: 18,
      border: `2px solid ${lit > 0 ? `rgba(250,250,250,${0.22 + lit * 0.6})` : '#34343a'}`,
      background: '#101013',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      paddingTop: 30,
      gap: 14,
    }}
  >
    <div style={{ width: 66, height: 66, borderRadius: '50%', background: '#2c2c31' }} />
    <div style={{ width: 112, height: 12, borderRadius: 6, background: '#34343a', marginTop: 6 }} />
    <div style={{ width: 78, height: 10, borderRadius: 5, background: '#2a2a2f' }} />
    <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
      <div style={{ width: 62, height: 24, borderRadius: 12, background: '#3a3a40' }} />
      <div style={{ width: 62, height: 24, borderRadius: 12, border: '2px solid #3a3a40' }} />
    </div>
    {crossed > 0 && (
      <svg width={190} height={250} style={{ position: 'absolute', inset: -2 }}>
        <line x1={14} y1={14} x2={14 + 162 * crossed} y2={14 + 222 * crossed} stroke="#fafafa" strokeOpacity={0.55} strokeWidth={3} />
        <line x1={176} y1={14} x2={176 - 162 * crossed} y2={14 + 222 * crossed} stroke="#fafafa" strokeOpacity={0.55} strokeWidth={3} />
      </svg>
    )}
  </div>
);

const COLS = 7;
const ROWS = 9;

export const Hook: React.FC = () => {
  const frame = useCurrentFrame();

  // The wall: a floor of identical templates receding into the dark.
  const wallIn = tween(frame, [8, 90], [0, 1], ease.out);
  const fall = tween(frame, [262, 360], [0, 1], ease.in);
  const drift = frame * 0.9;

  // Converge to a single point before the drop at 8.0 s (frame 480).
  const collapse = tween(frame, [400, 470], [0, 1], ease.in);
  const dot = tween(frame, [440, 470], [0, 1], ease.out);

  return (
    <AbsoluteFill>
      <Backdrop rails={tween(frame, [0, 40], [0, 1])} bands={tween(frame, [10, 60], [0, 1])} />

      <AbsoluteFill style={{ perspective: 1400, perspectiveOrigin: '50% 30%', opacity: 1 - fall }}>
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transformStyle: 'preserve-3d',
            transform: `translate(-50%, -38%) translateZ(${-200 - fall * 1600}px) rotateX(${58 + fall * 12}deg) rotateZ(-28deg) translateY(${-drift}px)`,
            display: 'grid',
            gridTemplateColumns: `repeat(${COLS}, 190px)`,
            gap: 30,
          }}
        >
          {Array.from({ length: COLS * ROWS }, (_, i) => {
            const col = i % COLS;
            const row = Math.floor(i / COLS);
            const d = Math.hypot(col - COLS / 2, row - ROWS / 2);
            const appear = tween(frame, [10 + d * 7, 40 + d * 7], [0, 1], ease.out);
            // "same." — every card blinks together, because they are all the same.
            const lit = frame >= 206 && frame < 240 ? tween(frame, [206, 238], [1, 0.001], ease.out) : 0;
            const crossAt = 262 + rand(i) * 40;
            const crossed = tween(frame, [crossAt, crossAt + 10], [0, 1], ease.out);
            return (
              <div key={i} style={{ opacity: appear * wallIn, transform: `translateZ(${(1 - appear) * -120}px)` }}>
                <TemplateCard crossed={crossed} lit={lit} />
              </div>
            );
          })}
        </div>
      </AbsoluteFill>

      {/* Fog so the type reads over the wall. */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, ${ink.bg} 0%, rgba(9,9,11,0.9) 26%, rgba(9,9,11,0.35) 58%, rgba(9,9,11,0.05) 100%)`,
        }}
      />

      <AbsoluteFill style={{ transform: `scale(${1 - collapse * 0.35})`, opacity: 1 - collapse, filter: `blur(${collapse * 18}px)` }}>
        <Label text="// 00 — the problem" at={18} style={{ position: 'absolute', left: RAIL + 22, top: 250 }} out={250} />
        <Words
          style={{ position: 'absolute', left: RAIL + 14, top: 330 }}
          size={172}
          lines={[w('Most dev', [47, 75]), w('portfolios', 101), w('look the', [153, 180]), [{ text: 'same.', at: 206, color: ink.mutedFg }]]}
          exitAt={258}
        />
        <Words
          style={{ position: 'absolute', left: RAIL + 14, top: 760 }}
          size={210}
          weight={680}
          lines={[w('This one', [287, 300]), [{ text: 'doesn’t.', at: 314 }]]}
        />
      </AbsoluteFill>

      {/* The point everything collapses into: the drop lands on it. */}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            width: 18 * dot,
            height: 18 * dot,
            borderRadius: 3,
            background: ink.fg,
            boxShadow: `0 0 ${60 * dot}px rgba(250,250,250,${0.7 * dot})`,
            transform: `rotate(45deg) scale(${1 + 0.4 * Math.sin(frame / 3) * dot})`,
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
