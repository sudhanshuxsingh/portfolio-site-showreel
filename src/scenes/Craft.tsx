import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { ease, tween } from '../lib/anim';
import { clips, type ClipName } from '../lib/clips';
import { Backdrop, RAIL } from '../components/Sheet';
import { Screen, type View } from '../components/Screen';
import { Label, Words } from '../components/Type';
import { sceneBeats } from '../timeline';
import { ink, mono, sans } from '../theme';

export const CraftIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const count = Math.round(tween(frame, [8, 44], [0, 10], ease.out));
  const exit = tween(frame, [100, 114], [0, 1], ease.in);
  return (
    <AbsoluteFill>
      <Backdrop />
      <AbsoluteFill style={{ transform: `scale(${1 + exit * 0.5})`, opacity: 1 - exit, filter: `blur(${exit * 16}px)` }}>
        <Label text="// 08 — craft" at={0} cps={3} style={{ position: 'absolute', left: RAIL + 22, top: 620 }} />
        <div style={{ position: 'absolute', left: RAIL + 6, top: 670, display: 'flex', alignItems: 'flex-start' }}>
          <Words size={330} weight={680} tracking={-0.06} mode="slam" lines={[[{ text: 'Craft.', at: 0 }]]} />
          <div
            style={{
              fontFamily: sans,
              fontSize: 84,
              fontWeight: 500,
              color: ink.mutedFg,
              marginTop: 30,
              marginLeft: 8,
              opacity: tween(frame, [6, 14], [0, 1]),
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            ({count})
          </div>
        </div>
        <Words
          style={{ position: 'absolute', left: RAIL + 14, top: 1020 }}
          size={84}
          weight={560}
          color={ink.mutedFg}
          lines={[[{ text: 'Ten', at: 47 }, { text: 'live', at: 53, color: ink.fg }, { text: 'demos.', at: 59 }], [{ text: 'Every', at: 69 }, { text: 'one', at: 74 }, { text: 'playable.', at: 79 }]]}
        />
        <div
          style={{
            position: 'absolute',
            left: RAIL + 22,
            top: 1290,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            fontFamily: mono,
            fontSize: 28,
            color: ink.mutedFg,
            letterSpacing: '0.04em',
            opacity: tween(frame, [69, 84], [0, 1]),
          }}
        >
          <Img src={staticFile('images/peerlist.png')} style={{ width: 40, height: 40, borderRadius: 6 }} />
          <Img src={staticFile('images/acerternity.png')} style={{ width: 40, height: 40, borderRadius: 6, marginLeft: -22, boxShadow: `0 0 0 3px ${ink.bg}` }} />
          shadcn registry · Aceternity × Peerlist
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

interface Tile {
  clip: ClipName;
  title: string;
  tag: string;
}

const TILES: Tile[] = [
  { clip: 'craft-fluid-menu', title: 'Fluid Menu', tag: 'Day 1' },
  { clip: 'craft-status-button', title: 'Status Button', tag: 'Day 2' },
  { clip: 'craft-animated-checkboxes', title: 'Animated Checkboxes', tag: 'Day 3' },
  { clip: 'craft-animated-toggles', title: 'Animated Toggles', tag: 'Day 4' },
  { clip: 'craft-shared-layout-tabs', title: 'Shared Layout Tabs', tag: 'Day 5' },
  { clip: 'craft-ai-prompt-input', title: 'AI Prompt Input', tag: 'Install' },
  { clip: 'craft-status-indicator', title: 'Status Indicator', tag: 'Install' },
  { clip: 'craft-morphing-logo', title: 'Morphing Logo', tag: 'Install' },
];

const TILE_W = 480;
const TILE_H = 360;
const GAP = 34;
const RATE = 1.15;

/** Centre a 4:3 window inside a capture. */
const fit = (clip: ClipName): View => {
  const { width, height } = clips[clip].css;
  const aspect = TILE_W / TILE_H;
  if (width / height > aspect) {
    const w = height * aspect;
    return { x: (width - w) / 2, y: 0, w, h: height };
  }
  const h = width / aspect;
  return { x: 0, y: (height - h) / 2, w: width, h };
};

export const CraftWall: React.FC = () => {
  const frame = useCurrentFrame();
  const beats = sceneBeats('craftWall');
  const actives = TILES.map((_, i) => beats[i * 2] ?? i * 46);
  let active = 0;
  actives.forEach((at, i) => {
    if (frame >= at) active = i;
  });
  // The camera locks onto each demo as it lights up.
  const ROW = TILE_H + 52 + GAP;
  const centreOf = (i: number): [number, number] => [((i % 2) - 0.5) * (TILE_W + GAP), (Math.floor(i / 2) - 1.5) * ROW - 26];
  const prev = centreOf(Math.max(0, active - 1));
  const curr = centreOf(active);
  const move = active === 0 ? 1 : tween(frame, [actives[active] - 4, actives[active] + 22], [0, 1], ease.inOut);
  const camX = prev[0] + (curr[0] - prev[0]) * move + Math.sin(frame / 50) * 14;
  const camY = prev[1] + (curr[1] - prev[1]) * move + Math.cos(frame / 60) * 10;
  const enter = tween(frame, [0, 30], [0, 1], ease.out);
  const exit = tween(frame, [356, 374], [0, 1], ease.in);

  return (
    <AbsoluteFill>
      <Backdrop />
      <AbsoluteFill style={{ perspective: 2000, perspectiveOrigin: '50% 50%', opacity: 1 - exit }}>
        <div
          style={{
            position: 'absolute',
            left: 540,
            top: 1010,
            transformStyle: 'preserve-3d',
            transform: `translate(-50%, -50%) translateZ(${(1 - enter) * -800 - 120}px) rotateX(16deg) rotateY(-16deg) rotateZ(4deg) translate(${-camX}px, ${-camY}px)`,
            display: 'grid',
            gridTemplateColumns: `repeat(2, ${TILE_W}px)`,
            gap: GAP,
          }}
        >
          {TILES.map((tile, i) => {
            const meta = clips[tile.clip];
            const first = meta.events[0]?.frame ?? 40;
            const at = actives[i];
            // Start each demo so its first interaction lands just after it lights up.
            const lead = 34;
            let hold = at + 14 - lead / RATE;
            let from = Math.max(0, first - lead);
            if (hold < 0) {
              from = Math.max(0, from - hold * RATE);
              hold = 0;
            }
            const on = i === active ? tween(frame, [at, at + 12], [0, 1], ease.out) : i === active - 1 ? tween(frame, [actives[active], actives[active] + 12], [1, 0], ease.out) : 0;
            return (
              <div
                key={tile.clip}
                style={{
                  transformStyle: 'preserve-3d',
                  transform: `translateZ(${on * 130}px)`,
                  opacity: 0.62 + on * 0.38,
                }}
              >
                <Screen
                  clip={tile.clip}
                  width={TILE_W}
                  view={fit(tile.clip)}
                  chrome="none"
                  radius={22}
                  from={from}
                  hold={hold}
                  rate={RATE}
                  depth={10}
                  cursorScale={0.8}
                />
                <div
                  style={{
                    marginTop: 12,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    fontFamily: sans,
                    fontSize: 26,
                    fontWeight: 500,
                    color: on > 0.5 ? ink.fg : ink.mutedFg,
                    padding: '0 4px',
                  }}
                >
                  <span>{tile.title}</span>
                  <span style={{ fontFamily: mono, fontSize: 21, color: ink.dim }}>{tile.tag}</span>
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: `linear-gradient(180deg, ${ink.bg} 6%, transparent 22%, transparent 74%, ${ink.bg} 90%)` }} />
      {/* The active demo's name, big, so it reads on a phone. */}
      <div style={{ position: 'absolute', left: RAIL + 22, right: RAIL + 22, top: 1592, height: 120, overflow: 'hidden' }}>
        {TILES.map((tile, i) => {
          const at = actives[i];
          const next = actives[i + 1] ?? Infinity;
          if (frame < at || frame >= next + 10) return null;
          const p = tween(frame, [at + 5, at + 20], [1, 0], ease.out);
          const q = Number.isFinite(next) ? tween(frame, [next - 4, next + 6], [0, 1], ease.in) : 0;
          return (
            <div
              key={tile.clip}
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'baseline',
                gap: 22,
                transform: `translateY(${(p - q) * 110}%)`,
              }}
            >
              <span style={{ fontFamily: sans, fontSize: 88, fontWeight: 620, letterSpacing: '-0.045em', color: ink.fg, whiteSpace: 'nowrap' }}>{tile.title}</span>
              <span style={{ fontFamily: mono, fontSize: 26, color: ink.dim, letterSpacing: '0.06em' }}>{String(i + 1).padStart(2, '0')}/08</span>
            </div>
          );
        })}
      </div>
      <Label text="// live demos · captured from the site" at={4} size={24} style={{ position: 'absolute', left: RAIL + 22, top: 228 }} />
    </AbsoluteFill>
  );
};
