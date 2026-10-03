import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { ease, tween } from '../lib/anim';
import { Backdrop, RAIL, SheetOverlay } from '../components/Sheet';
import { Screen, screenHeight, screenPoint, type ScreenProps } from '../components/Screen';
import { Label, Words, project3d } from '../components/Type';
import { DURATION, sec, T } from '../timeline';
import { ink, paper } from '../theme';

const PERSPECTIVE = 2200;
const ORIGIN: [number, number] = [540, 1120];
const RX = 9;
const RY = -9;

const World: React.FC<{ mode: 'light' | 'dark'; word: string; wordAt: number; system: boolean }> = ({ mode, word, wordAt, system }) => {
  const frame = useCurrentFrame();
  const props: ScreenProps = {
    still: `home-desktop-${mode}`,
    width: 920,
    view: { x: 0, y: 0, w: 820, h: 900 },
    chrome: 'browser',
  };
  const fg = mode === 'light' ? paper.fg : ink.fg;
  return (
    <AbsoluteFill>
      <Backdrop tone={mode} />
      <Label
        text={system ? '// 06 — follows your OS' : `// 06 — ${mode} theme`}
        at={0}
        cps={4}
        color={mode === 'light' ? paper.mutedFg : ink.dim}
        style={{ position: 'absolute', left: RAIL + 22, top: 228 }}
      />
      <Words key={word} style={{ position: 'absolute', left: RAIL + 14, top: 290 }} size={230} weight={660} color={fg} lines={[[{ text: word, at: wordAt, serif: true }]]} />
      <AbsoluteFill style={{ perspective: PERSPECTIVE, perspectiveOrigin: `${ORIGIN[0]}px ${ORIGIN[1]}px` }}>
        <div
          style={{
            position: 'absolute',
            left: 80,
            top: 700,
            transformStyle: 'preserve-3d',
            transform: `rotateX(${RX}deg) rotateY(${RY + tween(frame, [0, 187], [0, 6], ease.inOut)}deg)`,
          }}
        >
          <Screen {...props} theme={mode} cursor={false} />
        </div>
      </AbsoluteFill>
      <SheetOverlay
        tone={mode}
        sheet={6}
        of={17}
        fig="Fig. 06 — Theme"
        progress={(sec(T.theme[0]) + frame) / sec(DURATION)}
      />
    </AbsoluteFill>
  );
};

export const Theme: React.FC = () => {
  const frame = useCurrentFrame();
  const props: ScreenProps = { still: 'home-desktop-dark', width: 920, view: { x: 0, y: 0, w: 820, h: 900 }, chrome: 'browser' };
  const h = screenHeight(props);
  const ry = RY + tween(frame, [0, 187], [0, 6], ease.inOut);
  // The wipe starts at the real theme toggle (header, x 623 y 28 in CSS px).
  const [cx, cy] = project3d(screenPoint(props, [623, 28]), { x: 80, y: 700, w: 920, h, rx: RX, ry }, PERSPECTIVE, ORIGIN);
  const r = tween(frame, [47, 80], [0, 2300], ease.inOut);
  const split = tween(frame, [117, 147], [0, 1], ease.inOut);
  const system = frame >= 117;
  const clip =
    frame < 117
      ? `circle(${r}px at ${cx}px ${cy}px)`
      : `polygon(0 0, ${100 - 38 * split}% 0, ${100 - 62 * split}% 100%, 0 100%)`;

  return (
    <AbsoluteFill>
      <World mode="light" word={system ? 'System.' : 'Light.'} wordAt={system ? 117 : 2} system={system} />
      <AbsoluteFill style={{ clipPath: clip }}>
        <World mode="dark" word={system ? 'System.' : 'Dark.'} wordAt={system ? 117 : 52} system={system} />
      </AbsoluteFill>
      {frame >= 47 && frame < 84 && (
        <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0 }}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#a1a1aa" strokeOpacity={0.5} strokeWidth={3} />
        </svg>
      )}
    </AbsoluteFill>
  );
};
