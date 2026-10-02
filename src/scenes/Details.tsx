import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { ease, tween } from '../lib/anim';
import { Backdrop, RAIL } from '../components/Sheet';
import { Screen } from '../components/Screen';
import { Label, Words } from '../components/Type';
import { ink, mono, sans } from '../theme';

const Code: React.FC<{ lines: [string, string?][] }> = ({ lines }) => (
  <div
    style={{
      width: 900,
      borderRadius: 24,
      border: '1.5px solid #2a2a2e',
      background: '#0c0c0e',
      padding: '34px 38px',
      fontFamily: mono,
      fontSize: 28,
      lineHeight: 1.6,
      color: ink.mutedFg,
      boxShadow: '0 60px 120px rgba(0,0,0,0.6)',
      whiteSpace: 'pre',
    }}
  >
    {lines.map(([text, strong], i) => (
      <div key={i}>
        {text}
        {strong ? <span style={{ color: ink.fg }}>{strong}</span> : null}
      </div>
    ))}
  </div>
);

const Keys: React.FC = () => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 22, width: 900, justifyContent: 'center' }}>
    {['⌘K', '↑', '↓', '↵', 'Esc', 'Tab', 'Space'].map((key) => (
      <div
        key={key}
        style={{
          minWidth: 130,
          padding: '26px 30px',
          borderRadius: 22,
          border: '2px solid #3f3f46',
          borderBottomWidth: 8,
          background: '#111113',
          fontFamily: key.length > 2 ? mono : sans,
          fontSize: 50,
          color: ink.fg,
          textAlign: 'center',
        }}
      >
        {key}
      </div>
    ))}
  </div>
);

interface Card {
  word: string;
  note: string;
  visual: React.ReactNode;
}

const CARDS: Card[] = [
  {
    word: 'Skip link.',
    note: 'Tab once — straight to the content',
    visual: <Screen still="skip-link-desktop-dark" width={900} view={{ x: 0, y: 0, w: 330, h: 240 }} chrome="none" radius={26} cursor={false} />,
  },
  {
    word: 'Reduced motion.',
    note: 'Every animation honors the OS setting',
    visual: (
      <Code
        lines={[
          ['@media (', 'prefers-reduced-motion: reduce'],
          [') {'],
          ['  *, *::before, *::after {'],
          ['    animation-duration: ', '0.01ms !important;'],
          ['    transition-duration: ', '0.01ms !important;'],
          ['  }'],
          ['}'],
        ]}
      />
    ),
  },
  {
    word: 'JSON-LD.',
    note: 'Structured data, so search knows who you are',
    visual: (
      <Code
        lines={[
          ['{'],
          ['  "@type": ', '"Person",'],
          ['  "name": ', '"Sudhanshu Singh",'],
          ['  "jobTitle": ', '"Tech Lead · Full-stack…",'],
          ['  "worksFor": ', '"Tata Consultancy Services",'],
          ['  "sameAs": ', '[GitHub, LinkedIn, LeetCode]'],
          ['}'],
        ]}
      />
    ),
  },
  {
    word: 'OG images.',
    note: 'Share cards for X and LinkedIn',
    visual: (
      <div style={{ width: 900, borderRadius: 26, overflow: 'hidden', border: '1.5px solid #2a2a2e', background: '#0c0c0e', boxShadow: '0 60px 120px rgba(0,0,0,0.6)' }}>
        <Img src={staticFile('images/og.png')} style={{ width: 900, display: 'block' }} />
        <div style={{ padding: '20px 26px', fontFamily: sans, fontSize: 28, color: ink.fg }}>
          Sudhanshu Singh — Tech Lead, Full-stack & GenAI Developer
          <div style={{ fontFamily: mono, fontSize: 22, color: ink.dim, marginTop: 6 }}>sudhanshuxsingh.in</div>
        </div>
      </div>
    ),
  },
  {
    word: '404, handled.',
    note: 'Old links still find a way home',
    visual: <Screen still="not-found-desktop-dark" width={900} view={{ x: 0, y: 40, w: 820, h: 420 }} chrome="browser" url="sudhanshuxsingh.in/old-link" cursor={false} />,
  },
  {
    word: 'Keyboard-first.',
    note: '⌘K · arrows · Esc · Enter or Space plays the Haki',
    visual: <Keys />,
  },
];

const STARTS = [0, 67, 113, 160, 207, 253];
const LAND = [20, 67, 113, 160, 207, 253];

export const Details: React.FC = () => {
  const frame = useCurrentFrame();
  let index = 0;
  STARTS.forEach((at, i) => {
    if (frame >= at) index = i;
  });
  return (
    <AbsoluteFill>
      <Backdrop />
      <Label text="// 11 — the details" at={0} cps={3} style={{ position: 'absolute', left: RAIL + 22, top: 228 }} />
      <div style={{ position: 'absolute', right: RAIL + 22, top: 226, fontFamily: mono, fontSize: 28, color: ink.mutedFg, letterSpacing: '0.06em' }}>
        {String(index + 1).padStart(2, '0')} / {String(CARDS.length).padStart(2, '0')}
      </div>
      {CARDS.map((card, i) => {
        const start = STARTS[i];
        const end = STARTS[i + 1] ?? 290;
        if (frame < start - 2 || frame > end + 10) return null;
        const pin = tween(frame, [start, start + 12], [1, 0], ease.out);
        const pout = i === CARDS.length - 1 ? 0 : tween(frame, [end - 4, end + 8], [0, 1], ease.in);
        const x = pin * 1100 - pout * 1100;
        const blur = (pin + pout) * 30;
        return (
          <AbsoluteFill key={card.word}>
            <Words
              key={card.word}
              style={{ position: 'absolute', left: RAIL + 14, top: 290 }}
              size={card.word.length > 12 ? 128 : 150}
              lines={[card.word.split(' ').map((text, k) => ({ text, at: (i === 0 ? 10 : start + 6) + k * 4 }))]}
              exitAt={i === CARDS.length - 1 ? undefined : end - 14}
              exit="fade"
            />
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 640,
                display: 'flex',
                justifyContent: 'center',
                transform: `translateX(${x}px) perspective(1600px) rotateY(${(pin - pout) * -25}deg)`,
                filter: blur > 0.5 ? `blur(${blur}px)` : undefined,
              }}
            >
              {card.visual}
            </div>
            <Label key={card.note} text={card.note} at={LAND[i]} cps={3} size={27} color={ink.mutedFg} out={end - 8} style={{ position: 'absolute', left: RAIL + 22, top: 1660 }} />
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};
