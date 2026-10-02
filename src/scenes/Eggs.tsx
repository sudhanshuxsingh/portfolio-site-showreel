import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { ease, rand, springy, tween } from '../lib/anim';
import { ISO } from '../lib/mark3d';
import { Cursor } from '../components/Cursor';
import { HakiAvatar, hakiAt } from '../components/Haki';
import { Mark } from '../components/Mark';
import { MorphLogo, SHAPE_NAMES } from '../components/MorphLogo';
import { Backdrop, RAIL, SheetOverlay } from '../components/Sheet';
import { Label, Words, w } from '../components/Type';
import { DURATION, HAKI_CLICK, sec, T } from '../timeline';
import { ink, mono, sans } from '../theme';

/** Piecewise cursor path: [frame, x, y] keys, eased between. */
const path = (frame: number, keys: [number, number, number][]): [number, number] => {
  if (frame <= keys[0][0]) return [keys[0][1], keys[0][2]];
  for (let i = 1; i < keys.length; i++) {
    const [f1, x1, y1] = keys[i];
    const [f0, x0, y0] = keys[i - 1];
    if (frame <= f1) {
      const t = ease.inOut((frame - f0) / (f1 - f0));
      return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t];
    }
  }
  const last = keys[keys.length - 1];
  return [last[1], last[2]];
};

export const EggsIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const glitch = frame >= 50 && Math.floor(frame / 3) % 3 !== 0;
  const band = (seed: number) => [rand(seed) * 1920, 30 + rand(seed + 1) * 140] as const;
  const words = (
    <Words
      style={{ position: 'absolute', left: RAIL + 14, top: 640 }}
      size={190}
      weight={660}
      lines={[w('Now, the', [8, 16]), w('hidden', 28), [{ text: 'stuff.', at: 40, color: ink.mutedFg }]]}
    />
  );
  return (
    <AbsoluteFill>
      <Backdrop />
      <Label text="// 10 — easter eggs" at={0} cps={3} style={{ position: 'absolute', left: RAIL + 22, top: 580 }} />
      {words}
      {glitch &&
        [0, 1].map((k) => {
          const [y, h] = band(Math.floor(frame / 3) * 7 + k * 13);
          const dx = (rand(frame + k * 31) - 0.5) * 60;
          return (
            <AbsoluteFill key={k} style={{ clipPath: `inset(${y}px 0 ${1920 - y - h}px 0)`, transform: `translateX(${dx}px)`, opacity: 0.85 }}>
              <AbsoluteFill style={{ background: ink.bg }} />
              {words}
            </AbsoluteFill>
          );
        })}
    </AbsoluteFill>
  );
};

const MORPHS = [30, 66, 102, 138];

export const Morph: React.FC = () => {
  const frame = useCurrentFrame();
  const ms = (frame * 1000) / 60;
  const changes = MORPHS.map((f) => (f * 1000) / 60);
  const shape = MORPHS.filter((f) => frame >= f).length % 4;
  const since = Math.min(...MORPHS.map((f) => (frame >= f ? frame - f : Infinity)));
  const pulse = since === Infinity ? 0 : Math.exp(-since / 10);
  const [cx, cy] = path(frame, [
    [0, 960, 1640],
    [26, 600, 1060],
    [44, 900, 1420],
    [62, 470, 1000],
    [80, 250, 1420],
    [98, 640, 1030],
    [116, 900, 1480],
    [134, 520, 990],
    [168, 820, 1500],
  ]);
  const enter = tween(frame, [0, 24], [0, 1], ease.out);
  return (
    <AbsoluteFill>
      <Backdrop />
      <Label text="// egg 01 — morphing logo" at={0} cps={3} style={{ position: 'absolute', left: RAIL + 22, top: 228 }} />
      <Words style={{ position: 'absolute', left: RAIL + 14, top: 290 }} size={150} lines={[w('Hover', 2), w('the logo.', [12, 22])]} />
      <AbsoluteFill style={{ alignItems: 'center', top: 760, height: 560, transform: `scale(${(0.9 + 0.1 * enter) * (1 + pulse * 0.03)})`, opacity: enter }}>
        <MorphLogo ms={ms} changes={changes} size={800} glow={pulse * 24} />
      </AbsoluteFill>
      <div style={{ position: 'absolute', left: RAIL + 22, right: RAIL + 22, top: 1440, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontFamily: sans, fontSize: 72, fontWeight: 600, letterSpacing: '-0.04em', color: ink.fg }}>
          {['SS', 'Plus', 'Prompt >_', 'Face'][shape]}
        </span>
        <span style={{ fontFamily: mono, fontSize: 28, color: ink.dim, letterSpacing: '0.06em' }}>
          {String(shape + 1).padStart(2, '0')}/04 · 10×7 px
        </span>
      </div>
      <Label text="Hover, focus or tap · 12 ms cell stagger" at={30} size={25} color={ink.mutedFg} style={{ position: 'absolute', left: RAIL + 22, top: 1560 }} />
      <Cursor x={cx} y={cy} size={58} sinceDown={Infinity} />
      {SHAPE_NAMES.length === 0 && null}
    </AbsoluteFill>
  );
};

const DEPTH = 1.4;
/** The site's press spring: force = 520·Δ − 26·v (spotlight-logo.tsx). */
const pressAt = (frame: number, down: number, up: number) => {
  const target = DEPTH * 0.55;
  if (frame < down) return 0;
  const spring = { stiffness: 520, damping: 26 };
  if (frame < up) return target * springy(frame, down, spring);
  const held = target * springy(up, down, spring);
  return Math.max(0, held * (1 - springy(frame, up, spring)));
};

export const Press: React.FC = () => {
  const frame = useCurrentFrame();
  const [cx, cy] = path(frame, [
    [0, 980, 1700],
    [30, 620, 1100],
    [40, 560, 1080],
    [104, 560, 1080],
    [132, 900, 1500],
  ]);
  const down = 42;
  const up = 82;
  const press = pressAt(frame, down, up);
  const isDown = frame >= down && frame < up;
  // Mark is centred at (540, 1080); the light follows the cursor like on the site.
  const light: [number, number] = [cx - 540, cy - 1080];
  return (
    <AbsoluteFill>
      <Backdrop />
      <Label text="// egg 02 — tactile mark" at={0} cps={3} style={{ position: 'absolute', left: RAIL + 22, top: 228 }} />
      <Words style={{ position: 'absolute', left: RAIL + 14, top: 290 }} size={150} lines={[w('Press', 2), w('the mark.', [12, 22])]} />
      {/* Guides kept short: a far-overflowing SVG repainted every frame left stale compositor tiles. */}
      <div style={{ position: 'absolute', left: 40, top: 580, width: 1000, height: 1000 }}>
        <Mark id="press" size={1000} camera={{ ...ISO, distance: 26, unit: 70 }} press={press} light={light} lightRadius={420} strokeWidth={2.6} guidesOpacity={0.6} guideLength={13} />
      </div>
      <div style={{ position: 'absolute', left: RAIL + 22, top: 1600, fontFamily: mono, fontSize: 26, color: ink.mutedFg, letterSpacing: '0.04em', opacity: tween(frame, [down, down + 10], [0, 1]) }}>
        spring k 520 · c 26 · depth {press.toFixed(2)}
      </div>
      <Cursor x={cx} y={cy} size={58} down={isDown} sinceDown={frame >= down ? frame - down : Infinity} />
    </AbsoluteFill>
  );
};

const CLICK = sec(HAKI_CLICK);
const SHARDS = Array.from({ length: 28 }, (_, i) => ({
  angle: rand(i * 3.1) * Math.PI * 2,
  speed: 14 + rand(i * 5.7) * 26,
  size: 14 + rand(i * 2.3) * 34,
  spin: (rand(i * 9.1) - 0.5) * 20,
  sides: 4 + Math.floor(rand(i * 4.4) * 3),
}));

export const Haki: React.FC = () => {
  const frame = useCurrentFrame();
  const ms = ((frame - CLICK) * 1000) / 60;
  const state = hakiAt(ms);
  // Smooth the stepped power for grading the whole frame.
  const power = [-90, -45, 0, 45, 90].reduce((sum, d) => sum + hakiAt(ms + d).power, 0) / 5;
  const burstFrames = Number.isFinite(state.sinceBurst) ? (state.sinceBurst * 60) / 1000 : -1;
  const shaking = state.fx === 'burst' || state.fx === 'rage' || state.fx === 'aftershock';
  const k = state.fx === 'burst' ? 22 : shaking ? 9 : 0;
  const sx = shaking ? (rand(frame * 1.7) - 0.5) * k : 0;
  const sy = shaking ? (rand(frame * 2.3 + 5) - 0.5) * k : 0;
  const flash = burstFrames >= 0 && burstFrames < 40 ? 0.95 * Math.exp(-burstFrames / 9) : 0;
  const titleIn = burstFrames;
  const titleOut = tween(frame, [334, 362], [0, 1], ease.in);
  const [cx, cy] = path(frame, [
    [0, 980, 1760],
    [44, 560, 1150],
    [CLICK + 30, 600, 1200],
    [CLICK + 70, 980, 1780],
  ]);
  const red = Math.min(1, power * 1.15);
  const avatarW = 600;
  const avatarTop = 700;
  const centre: [number, number] = [540, avatarTop + 0.46 * avatarW * (435 / 290)];

  return (
    <AbsoluteFill style={{ background: ink.bg }}>
      <AbsoluteFill style={{ transform: `translate(${sx}px, ${sy}px)` }}>
        <Backdrop tone={red > 0.35 ? 'red' : 'dark'} />
        <AbsoluteFill
          style={{
            background: `radial-gradient(circle at 50% ${(centre[1] / 1920) * 100}%, rgba(255,36,20,${0.55 * red}) 0%, rgba(120,8,4,${0.4 * red}) 30%, rgba(9,9,11,0) 68%)`,
          }}
        />
        <Label text="// egg 03 — conqueror’s haki" at={0} cps={3} color={red > 0.35 ? '#ff6a5a' : ink.dim} style={{ position: 'absolute', left: RAIL + 22, top: 228 }} />
        <Words
          style={{ position: 'absolute', left: RAIL + 14, top: 290 }}
          size={150}
          lines={[w('Click', 4), w('the avatar.', [14, 26])]}
          exitAt={CLICK + 40}
        />

        {/* Full-frame shockwaves at the burst. */}
        {burstFrames >= 0 &&
          burstFrames < 90 &&
          [0, 10, 22].map((delay, i) => {
            const t = (burstFrames - delay) / 60;
            if (t < 0) return null;
            const e = 1 - Math.pow(2, -10 * Math.min(1, t));
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: centre[0],
                  top: centre[1],
                  width: 700,
                  height: 700,
                  marginLeft: -350,
                  marginTop: -350,
                  borderRadius: '50%',
                  border: `${6 - i * 1.5}px solid rgba(255,70,50,${(1 - e) * 0.9})`,
                  boxShadow: `0 0 60px rgba(255,30,20,${(1 - e) * 0.8}), inset 0 0 40px rgba(255,30,20,${(1 - e) * 0.5})`,
                  transform: `scale(${0.2 + e * 3.6})`,
                }}
              />
            );
          })}

        {/* Rocks lifting off. */}
        {burstFrames >= 0 &&
          burstFrames < 110 &&
          SHARDS.map((shard, i) => {
            const t = burstFrames;
            const d = shard.speed * t * (1 - t / 260);
            const x = centre[0] + Math.cos(shard.angle) * (180 + d);
            const y = centre[1] + Math.sin(shard.angle) * (180 + d) - t * 1.2;
            const o = tween(t, [70, 110], [1, 0]);
            const pts = Array.from({ length: shard.sides }, (_, j) => {
              const a = (j / shard.sides) * Math.PI * 2;
              const r = shard.size * (0.65 + rand(i * 11 + j) * 0.35);
              return `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`;
            }).join(' ');
            return (
              <svg
                key={i}
                width={shard.size * 2}
                height={shard.size * 2}
                viewBox={`${-shard.size} ${-shard.size} ${shard.size * 2} ${shard.size * 2}`}
                style={{ position: 'absolute', left: x - shard.size, top: y - shard.size, opacity: o, transform: `rotate(${shard.spin * t}deg)`, overflow: 'visible' }}
              >
                <polygon points={pts} fill="#160606" stroke="#ff3b2a" strokeWidth={2.5} strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 8px rgba(255,40,20,.8))' }} />
              </svg>
            );
          })}

        <div style={{ position: 'absolute', left: 540 - avatarW / 2, top: avatarTop }}>
          <div
            style={{
              position: 'absolute',
              inset: -30,
              borderRadius: 40,
              border: `2px solid rgba(255,80,60,${0.5 * red})`,
              boxShadow: `0 0 ${120 * red}px rgba(255,30,20,${0.5 * red})`,
            }}
          />
          <HakiAvatar ms={ms} width={avatarW} shakeScale={4} />
        </div>

        {Number.isFinite(titleIn) && titleIn >= 0 && (
          <AbsoluteFill style={{ opacity: 1 - titleOut, filter: `blur(${titleOut * 14}px)` }}>
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 230,
                textAlign: 'center',
                fontFamily: sans,
                fontWeight: 760,
                fontSize: 150,
                letterSpacing: '-0.05em',
                lineHeight: 0.92,
                color: '#fff5f2',
                textShadow: '0 0 40px rgba(255,40,20,0.9), 0 0 120px rgba(255,20,10,0.6)',
                transform: `scale(${1.6 - 0.6 * tween(titleIn, [0, 10], [0, 1], ease.out)})`,
                opacity: tween(titleIn, [0, 6], [0, 1]),
              }}
            >
              Conqueror’s
              <br />
              Haki.
            </div>
          </AbsoluteFill>
        )}
        <SheetOverlay
          tone={red > 0.35 ? 'red' : 'dark'}
          sheet={14}
          of={17}
          fig="Fig. 10c — Conqueror’s Haki"
          progress={(sec(T.haki[0]) + frame) / sec(DURATION)}
        />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: 'radial-gradient(circle at 50% 52%, #fff6f2, #ff3c28 45%, #5a0602 100%)', opacity: flash, mixBlendMode: 'screen' }} />
      {frame < CLICK + 70 && <Cursor x={cx} y={cy} size={58} down={frame >= CLICK && frame < CLICK + 5} sinceDown={frame >= CLICK ? frame - CLICK : Infinity} />}
      <AbsoluteFill style={{ background: ink.bg, opacity: tween(frame, [366, 384], [0, 1]) }} />
    </AbsoluteFill>
  );
};
