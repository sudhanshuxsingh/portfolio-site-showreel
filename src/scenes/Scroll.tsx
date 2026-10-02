import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { ease, tween } from '../lib/anim';
import { clips } from '../lib/clips';
import { Backdrop, RAIL } from '../components/Sheet';
import { Screen } from '../components/Screen';
import { Label } from '../components/Type';
import { ink, mono, sans } from '../theme';

const FROM = 60;
const RATE = 1.4;
const toScene = (captureFrame: number) => (captureFrame - FROM) / RATE;

/** Facts per section, all straight from the site's source. */
const SECTIONS: { id: string; title: string; note: string }[] = [
  { id: 'hero', title: 'Hero.', note: 'Who, where, open to work — before any scroll' },
  { id: 'about', title: 'About.', note: 'One line. Full-stack GenAI, with design sense' },
  { id: 'stack', title: 'Stack.', note: '5 groups · 23 tools · GenAI → workflow' },
  { id: 'experience', title: 'Experience.', note: 'Timeline whose durations compute themselves' },
  { id: 'projects', title: 'Projects.', note: 'Live previews, status and tags' },
  { id: 'craft', title: 'Craft.', note: '10 live components and experiments' },
  { id: 'contact', title: 'Contact.', note: 'Email first. Résumé one tap away' },
  { id: 'footer', title: 'Footer.', note: 'Designed & built by Sudhanshu Singh' },
];

export const Scroll: React.FC = () => {
  const frame = useCurrentFrame();
  const marks = (clips['scroll-phone'].sections as { id: string; frame: number }[]).map((m) => ({
    id: m.id,
    // the section starts moving 44 capture frames before it arrives
    at: toScene(m.frame - 30),
  }));
  const changes = [0, ...marks.map((m) => m.at)];
  let index = 0;
  changes.forEach((at, i) => {
    if (frame >= at) index = i;
  });

  const enter = tween(frame, [0, 40], [0, 1], ease.out);
  const ry = tween(frame, [0, 456], [-20, -4], ease.inOut);
  const rx = tween(frame, [0, 456], [12, 6], ease.inOut);
  const phoneW = 600;

  return (
    <AbsoluteFill>
      <Backdrop />
      <Label text="// 04 — every section" at={2} style={{ position: 'absolute', left: RAIL + 22, top: 228 }} />
      <div
        style={{
          position: 'absolute',
          right: RAIL + 22,
          top: 226,
          fontFamily: mono,
          fontSize: 28,
          color: ink.mutedFg,
          letterSpacing: '0.06em',
        }}
      >
        {String(index + 1).padStart(2, '0')} / {String(SECTIONS.length).padStart(2, '0')}
      </div>

      {/* Rolling section index. */}
      <div style={{ position: 'absolute', left: RAIL + 14, right: RAIL, top: 286, height: 172, overflow: 'hidden' }}>
        {SECTIONS.map((section, i) => {
          const start = changes[i];
          const end = changes[i + 1] ?? Infinity;
          const pin = tween(frame, [start + 5, start + 20], [1, 0], ease.out);
          const pout = Number.isFinite(end) ? tween(frame, [end - 4, end + 6], [0, 1], ease.in) : 0;
          if (frame < start - 1 || frame > end + 8) return null;
          return (
            <div
              key={section.id}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                fontFamily: sans,
                fontSize: 158,
                fontWeight: 640,
                letterSpacing: '-0.055em',
                lineHeight: 1.05,
                color: ink.fg,
                transform: `translateY(${(i === 0 ? 0 : pin * 115) - pout * 115}%)`,
                filter: `blur(${(pin + pout) * 6}px)`,
                whiteSpace: 'nowrap',
              }}
            >
              {section.title}
            </div>
          );
        })}
      </div>
      <div style={{ position: 'absolute', left: RAIL + 22, top: 486, height: 40, overflow: 'hidden' }}>
        {SECTIONS.map((section, i) => {
          const start = changes[i];
          const end = changes[i + 1] ?? Infinity;
          if (frame < start || frame >= end) return null;
          const shown = Math.floor((frame - start) * 2.4);
          return (
            <div key={section.id} style={{ fontFamily: mono, fontSize: 28, color: ink.mutedFg, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
              {section.note.slice(0, shown)}
            </div>
          );
        })}
      </div>

      <AbsoluteFill style={{ perspective: 2400, perspectiveOrigin: '50% 60%' }}>
        <div
          style={{
            position: 'absolute',
            left: (1080 - phoneW) / 2 - 22,
            top: 590,
            transformStyle: 'preserve-3d',
            transform: `translateY(${(1 - enter) * 600}px) rotateX(${rx + (1 - enter) * 25}deg) rotateY(${ry}deg) rotateZ(${(1 - enter) * -6}deg)`,
          }}
        >
          <Screen clip="scroll-phone" width={phoneW} chrome="phone" from={FROM} rate={RATE} cursor={false} depth={26} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
