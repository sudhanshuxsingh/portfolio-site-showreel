import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { ease, tween } from '../lib/anim';
import { Backdrop, RAIL } from '../components/Sheet';
import { Screen } from '../components/Screen';
import { Label, Words, w } from '../components/Type';
import { ink, mono } from '../theme';

interface Edit {
  key: string;
  before: string;
  after: string;
  at: number;
}

/** src/lib/site.ts — the one file that makes the portfolio someone else's. */
const EDITS: Edit[] = [
  { key: 'name', before: 'Sudhanshu Singh', after: 'Your Name', at: 30 },
  { key: 'tagline', before: 'Tech Lead · Full-stack GenAI developer.', after: 'Design engineer · Building on the web.', at: 62 },
  { key: 'email', before: 'contact@sudhanshuxsingh.in', after: 'hello@yourname.dev', at: 100 },
  { key: 'location', before: 'Kolkata, India', after: 'Anywhere, Earth', at: 128 },
];

const STATIC_LINES: [string, string][] = [
  ['url', 'https://www.sudhanshuxsingh.in'],
  ['timeZone', 'Asia/Kolkata'],
];

const Value: React.FC<{ edit: Edit }> = ({ edit }) => {
  const frame = useCurrentFrame();
  const selected = frame >= edit.at && frame < edit.at + 8;
  const typed = Math.max(0, Math.floor((frame - edit.at - 8) * 1.4));
  const text = frame < edit.at + 8 ? edit.before : edit.after.slice(0, typed);
  const caret = frame >= edit.at + 8 && typed < edit.after.length + 12 && Math.floor(frame / 8) % 2 === 0;
  const changed = frame >= edit.at + 8;
  return (
    <span>
      <span style={{ color: ink.dim }}>'</span>
      <span
        style={{
          color: changed ? ink.fg : ink.mutedFg,
          background: selected ? 'rgba(250,250,250,0.22)' : changed ? 'rgba(74,222,128,0.10)' : 'transparent',
          borderRadius: 4,
        }}
      >
        {text}
      </span>
      {caret && <span style={{ color: ink.fg }}>▍</span>}
      <span style={{ color: ink.dim }}>'</span>
    </span>
  );
};

const Editor: React.FC = () => (
  <div
    style={{
      width: 940,
      borderRadius: 26,
      border: '1.5px solid #2a2a2e',
      background: '#0c0c0e',
      overflow: 'hidden',
      boxShadow: '0 80px 140px rgba(0,0,0,0.6)',
      fontFamily: mono,
    }}
  >
    <div style={{ height: 64, display: 'flex', alignItems: 'center', gap: 16, padding: '0 26px', borderBottom: '1px solid #232326', background: '#111113', fontSize: 23, color: ink.mutedFg }}>
      <span style={{ padding: '8px 16px', borderRadius: 10, background: '#1b1b1e', color: ink.fg }}>site.ts</span>
      <span style={{ color: ink.dim }}>src/lib</span>
    </div>
    <div style={{ padding: '30px 34px 36px', fontSize: 27, lineHeight: 1.75, color: ink.mutedFg, whiteSpace: 'pre' }}>
      <div>
        <span style={{ color: ink.dim }}>export const</span> <span style={{ color: ink.fg }}>site</span> = {'{'}
      </div>
      {EDITS.slice(0, 2).map((edit) => (
        <div key={edit.key}>
          {'  '}
          {edit.key}: <Value edit={edit} />,
        </div>
      ))}
      <div>
        {'  '}
        {STATIC_LINES[0][0]}: <span style={{ color: ink.dim }}>'{STATIC_LINES[0][1]}'</span>,
      </div>
      {EDITS.slice(2).map((edit) => (
        <div key={edit.key}>
          {'  '}
          {edit.key}: <Value edit={edit} />,
        </div>
      ))}
      <div>
        {'  '}
        {STATIC_LINES[1][0]}: <span style={{ color: ink.dim }}>'{STATIC_LINES[1][1]}'</span>,
      </div>
      <div>
        {'  '}openToWork: <span style={{ color: ink.signal }}>true</span>,
      </div>
      <div>{'};'}</div>
    </div>
  </div>
);

export const Yours: React.FC = () => {
  const frame = useCurrentFrame();
  const editor = tween(frame, [0, 26], [0, 1], ease.out);
  const editorOut = tween(frame, [158, 182], [0, 1], ease.in);
  const shot = tween(frame, [164, 192], [0, 1], ease.out);
  const wipe = tween(frame, [200, 246], [0, 1], ease.inOut);
  return (
    <AbsoluteFill>
      <Backdrop />
      <Label text="// 12 — make it yours" at={0} cps={3} style={{ position: 'absolute', left: RAIL + 22, top: 228 }} />
      <Words style={{ position: 'absolute', left: RAIL + 14, top: 290 }} size={150} lines={[w('Make it', [4, 14]), w('yours.', 26)]} exitAt={160} />
      <Words style={{ position: 'absolute', left: RAIL + 14, top: 290 }} size={150} lines={[w('One file.', [176, 188]), [{ text: 'Your', at: 206 }, { text: 'story.', at: 216, color: ink.mutedFg }]]} />
      <AbsoluteFill style={{ perspective: 2000 }}>
        <div
          style={{
            position: 'absolute',
            left: 70,
            top: 760,
            transform: `translateY(${(1 - editor) * 400}px) translateZ(${editorOut * -800}px) rotateX(${8 + (1 - editor) * 25}deg) rotateY(${-9 + tween(frame, [0, 160], [0, 7])}deg)`,
            opacity: editor * (1 - editorOut),
          }}
        >
          <Editor />
        </div>
        <div
          style={{
            position: 'absolute',
            left: 80,
            top: 700,
            transformStyle: 'preserve-3d',
            transform: `translateY(${(1 - shot) * 500}px) rotateX(${8 + (1 - shot) * 25}deg) rotateY(${tween(frame, [164, 323], [8, -6], ease.inOut)}deg)`,
            opacity: shot,
          }}
        >
          <div style={{ position: 'relative' }}>
            <Screen still="home-desktop-dark" width={920} view={{ x: 0, y: 0, w: 820, h: 900 }} cursor={false} />
            <div style={{ position: 'absolute', inset: 0, clipPath: `inset(0 0 ${(1 - wipe) * 100}% 0)` }}>
              <Screen still="home-desktop-dark-yours" width={920} view={{ x: 0, y: 0, w: 820, h: 900 }} cursor={false} depth={0} />
            </div>
            {wipe > 0 && wipe < 1 && (
              <div
                style={{
                  position: 'absolute',
                  left: -10,
                  right: -10,
                  top: `${wipe * 100}%`,
                  height: 3,
                  background: ink.fg,
                  boxShadow: '0 0 30px rgba(250,250,250,0.9)',
                }}
              />
            )}
          </div>
        </div>
      </AbsoluteFill>
      <Label text="src/lib/site.ts — identity, links, experience, stack" at={186} size={25} color={ink.mutedFg} style={{ position: 'absolute', left: RAIL + 22, top: 1712 }} />
    </AbsoluteFill>
  );
};
