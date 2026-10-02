import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { ease, tween } from '../lib/anim';
import { ISO } from '../lib/mark3d';
import { Cursor } from '../components/Cursor';
import { Mark } from '../components/Mark';
import { Backdrop, RAIL } from '../components/Sheet';
import { Words } from '../components/Type';
import { SignalPill } from './Reveal';
import { ink, mono, sans } from '../theme';

const STACK = ['Next.js 15', 'React 19', 'TypeScript', 'Tailwind v4', 'shadcn/ui', 'Motion'];

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const solid = tween(frame, [10, 60], [0, 1], ease.inOut);
  const yaw = ISO.yaw + Math.sin(frame / 70) * 12;
  const fade = tween(frame, [356, 388], [0, 1], ease.inOut);
  const click = 232;
  const cta = tween(frame, [153, 175], [0, 1], ease.out);
  const pressed = frame >= click && frame < click + 6;
  const glow = frame >= click ? Math.exp(-(frame - click) / 18) : 0;
  const cursorX = tween(frame, [190, 228], [980, 700], ease.inOut);
  const cursorY = tween(frame, [190, 228], [1760, 1408], ease.inOut);
  return (
    <AbsoluteFill>
      <Backdrop />
      <AbsoluteFill style={{ opacity: 1 - fade }}>
        <AbsoluteFill style={{ alignItems: 'center', top: 120 - 160 }}>
          <Mark
            id="outro"
            size={760}
            camera={{ yaw, pitch: ISO.pitch, distance: 26, unit: 48 }}
            solid={solid}
            draw={tween(frame, [0, 30], [0.3, 1])}
            light={[-150, -180]}
            lightRadius={360}
            lightOpacity={1 - solid}
            guidesOpacity={0.45 * (1 - solid * 0.5)}
          />
        </AbsoluteFill>
        <Words
          style={{ position: 'absolute', left: 0, right: 0, top: 690 }}
          size={182}
          weight={660}
          leading={0.88}
          align="center"
          lines={[[{ text: 'Developer', at: 20 }], [{ text: 'Portfolio.', at: 47, color: ink.mutedFg }]]}
        />
        <div style={{ position: 'absolute', left: RAIL + 30, right: RAIL + 30, top: 1080, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 14 }}>
          {STACK.map((item, i) => (
            <div
              key={item}
              style={{
                padding: '10px 20px',
                borderRadius: 12,
                border: '1.5px solid #2a2a2e',
                background: '#111113',
                fontFamily: mono,
                fontSize: 27,
                color: ink.mutedFg,
                opacity: tween(frame, [101 + i * 4, 113 + i * 4], [0, 1]),
                transform: `translateY(${tween(frame, [101 + i * 4, 115 + i * 4], [14, 0], ease.out)}px)`,
              }}
            >
              {item}
            </div>
          ))}
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 1300, display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: cta, transform: `translateY(${(1 - cta) * 30}px)` }}>
          <div style={{ fontFamily: mono, fontSize: 28, letterSpacing: '0.24em', color: ink.dim, marginBottom: 18 }}>VISIT</div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 22,
              padding: '26px 44px',
              borderRadius: 999,
              background: ink.fg,
              color: ink.bg,
              fontFamily: sans,
              fontWeight: 600,
              fontSize: 66,
              letterSpacing: '-0.03em',
              transform: `scale(${pressed ? 0.96 : 1})`,
              boxShadow: `0 0 ${80 * glow + 20}px rgba(250,250,250,${0.15 + 0.45 * glow})`,
            }}
          >
            sudhanshuxsingh.in
            <svg width={52} height={52} viewBox="0 0 24 24" fill="none" stroke={ink.bg} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 7h10v10" />
              <path d="M7 17 17 7" />
            </svg>
          </div>
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 1580, display: 'flex', justifyContent: 'center', opacity: tween(frame, [259, 275], [0, 1]) }}>
          <SignalPill scale={1.15} />
        </div>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 1700,
            textAlign: 'center',
            fontFamily: mono,
            fontSize: 25,
            letterSpacing: '0.12em',
            color: ink.dim,
            opacity: tween(frame, [287, 303], [0, 1]),
          }}
        >
          DESIGNED & BUILT BY SUDHANSHU SINGH
        </div>
        {frame >= 190 && frame < 300 && (
          <Cursor x={cursorX} y={cursorY} size={60} down={pressed} sinceDown={frame >= click ? frame - click : Infinity} opacity={tween(frame, [280, 298], [1, 0])} />
        )}
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          gap: 26,
          opacity: tween(frame, [384, 398], [0, 1]) * (1 - tween(frame, [412, 420], [0, 1])),
        }}
      >
        <Mark id="outro-end" size={150} camera={{ ...ISO, distance: 26, unit: 10 }} solid={1} guidesOpacity={0} lightOpacity={0} />
        <div style={{ fontFamily: mono, fontSize: 38, letterSpacing: '0.08em', color: ink.fg }}>sudhanshuxsingh.in</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
