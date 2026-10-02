import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion';
import { ease, tween } from '../lib/anim';
import { Backdrop, RAIL } from '../components/Sheet';
import { Screen } from '../components/Screen';
import { Label, Words, w } from '../components/Type';
import { ink, mono } from '../theme';

const COMMAND = 'pnpm dlx shadcn@latest add https://www.sudhanshuxsingh.in/r/ai-prompt-input.json';
const OUTPUT: { text: string; at: number; ok?: boolean; dim?: boolean }[] = [
  { text: 'Checking registry.', at: 98, ok: true },
  { text: 'Installing dependencies.', at: 112, ok: true },
  { text: 'Created 1 file:', at: 128, ok: true },
  { text: '  - components/ui/ai-prompt-input.tsx', at: 136, dim: true },
];

const Terminal: React.FC = () => {
  const frame = useCurrentFrame();
  const typed = Math.max(0, Math.min(COMMAND.length, Math.floor((frame - 14) * 1.15)));
  const caret = Math.floor(frame / 15) % 2 === 0;
  return (
    <div
      style={{
        width: 940,
        borderRadius: 26,
        border: '1.5px solid #2a2a2e',
        background: '#0c0c0e',
        boxShadow: '0 80px 140px rgba(0,0,0,0.6)',
        overflow: 'hidden',
        fontFamily: mono,
      }}
    >
      <div style={{ height: 66, display: 'flex', alignItems: 'center', gap: 12, padding: '0 26px', borderBottom: '1px solid #232326', background: '#111113' }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: 15, height: 15, borderRadius: '50%', background: '#3f3f46' }} />
        ))}
        <div style={{ flex: 1, textAlign: 'center', fontSize: 22, color: ink.dim, letterSpacing: '0.04em' }}>~/my-app — zsh</div>
      </div>
      <div style={{ padding: '30px 34px 40px', fontSize: 31, lineHeight: 1.55, color: ink.fg, minHeight: 470 }}>
        <div style={{ wordBreak: 'break-all' }}>
          <span style={{ color: ink.signal }}>❯ </span>
          {COMMAND.slice(0, typed)}
          {typed < COMMAND.length && <span style={{ opacity: caret ? 1 : 0 }}>▍</span>}
        </div>
        {OUTPUT.map((line) =>
          frame >= line.at ? (
            <div key={line.text} style={{ color: line.dim ? ink.mutedFg : ink.fg, opacity: tween(frame, [line.at, line.at + 6], [0, 1]), whiteSpace: 'pre' }}>
              {line.ok ? <span style={{ color: ink.signal }}>✔ </span> : null}
              {line.text}
            </div>
          ) : null
        )}
        {frame >= 146 && (
          <div style={{ marginTop: 6 }}>
            <span style={{ color: ink.signal }}>❯ </span>
            <span style={{ opacity: caret ? 1 : 0 }}>▍</span>
          </div>
        )}
      </div>
    </div>
  );
};

/** craft-code capture: install tabs npm (180) → bun (240) → pnpm (300), copy (370). */
const CODE = { start: 168, from: 150, rate: 1.36 };

export const Registry: React.FC = () => {
  const frame = useCurrentFrame();
  const term = tween(frame, [0, 30], [0, 1], ease.out);
  const termOut = tween(frame, [158, 182], [0, 1], ease.in);
  const shot = tween(frame, [CODE.start - 6, CODE.start + 22], [0, 1], ease.out);
  return (
    <AbsoluteFill>
      <Backdrop />
      <Label text="// 09 — shadcn registry" at={2} style={{ position: 'absolute', left: RAIL + 22, top: 228 }} />
      <Words style={{ position: 'absolute', left: RAIL + 14, top: 290 }} size={150} lines={[w('Install', 0), w('any piece.', [24, 49])]} exitAt={340} />
      <AbsoluteFill style={{ perspective: 2000 }}>
        <div
          style={{
            position: 'absolute',
            left: 70,
            top: 760,
            transform: `translateY(${(1 - term) * 400 - termOut * 200}px) translateZ(${termOut * -700}px) rotateX(${10 + (1 - term) * 25}deg) rotateY(${-10 + tween(frame, [0, 170], [0, 8])}deg)`,
            opacity: term * (1 - termOut),
          }}
        >
          <Terminal />
        </div>
        <Sequence from={CODE.start - 6} layout="none">
          <div
            style={{
              position: 'absolute',
              left: 70,
              top: 690,
              transformStyle: 'preserve-3d',
              transform: `translateY(${(1 - shot) * 500}px) rotateX(${8 + (1 - shot) * 30}deg) rotateY(${tween(frame, [CODE.start, 366], [9, -4], ease.inOut)}deg)`,
              opacity: shot,
            }}
          >
            <Screen clip="craft-code" width={940} view={{ x: 0, y: 40, w: 820, h: 940 }} from={CODE.from} rate={CODE.rate} hold={6} />
          </div>
        </Sequence>
      </AbsoluteFill>
      <Label text="pnpm · npm · bun — source lands in your codebase" at={CODE.start + 30} size={25} color={ink.mutedFg} style={{ position: 'absolute', left: RAIL + 22, top: 1712 }} />
    </AbsoluteFill>
  );
};
