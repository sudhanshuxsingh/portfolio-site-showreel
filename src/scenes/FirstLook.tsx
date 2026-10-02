import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { ease, tween } from '../lib/anim';
import { Backdrop, RAIL } from '../components/Sheet';
import { lerpView, Screen, screenHeight, screenPoint, type ScreenProps } from '../components/Screen';
import { Callout, Label, Words, project3d, w } from '../components/Type';
import { ink } from '../theme';

const PERSPECTIVE = 2200;
const ORIGIN: [number, number] = [540, 1000];

export const FirstLook: React.FC = () => {
  const frame = useCurrentFrame();
  // Push in on the mark as it gets pressed.
  const push = tween(frame, [70, 150], [0, 1], ease.inOut);
  const view = lerpView({ x: 0, y: 0, w: 820, h: 800 }, { x: 250, y: 60, w: 480, h: 468.3 }, push);
  const props: ScreenProps = { clip: 'hero-spotlight', width: 940, view, chrome: 'browser' };
  const height = screenHeight(props);
  const enter = tween(frame, [0, 46], [0, 1], ease.out);
  const rx = 48 * (1 - enter) + tween(frame, [46, 240], [9, 4], ease.inOut);
  const ry = tween(frame, [0, 240], [-14, 7], ease.inOut);
  const ty = (1 - enter) * 520;
  const tz = (1 - enter) * -500;
  const x = (1080 - 940) / 2;
  const y = 660;
  const el = { x, y: y + ty, w: 940, h: height, rx, ry, tz };
  const at = (p: [number, number]) => project3d(screenPoint(props, p), el, PERSPECTIVE, ORIGIN);

  // hero-spotlight: presses at capture frames 234 and 318; play 40 → 360 at 1.33×.
  const from = 40;
  const rate = 1.33;
  const press = (234 - from) / rate;

  return (
    <AbsoluteFill>
      <Backdrop />
      <Label text="// 02 — first look" at={4} style={{ position: 'absolute', left: RAIL + 22, top: 228 }} />
      <Words style={{ position: 'absolute', left: RAIL + 14, top: 290 }} size={150} lines={[w('Lit like', [8, 24]), w('a stage.', [47, 70])]} />
      <AbsoluteFill style={{ perspective: PERSPECTIVE, perspectiveOrigin: `${ORIGIN[0]}px ${ORIGIN[1]}px` }}>
        <div
          style={{
            position: 'absolute',
            left: x,
            top: y,
            transformStyle: 'preserve-3d',
            transform: `translateY(${ty}px) translateZ(${tz}px) rotateX(${rx}deg) rotateY(${ry}deg)`,
            opacity: tween(frame, [0, 14], [0, 1]),
          }}
        >
          <Screen {...props} from={from} rate={rate} />
        </div>
      </AbsoluteFill>
      <Callout target={at([361 + 60, 112 + 70])} to={[600, 610]} label="Cursor-lit isometric mark" at={40} out={press - 10} align="left" />
      <Callout target={at([361 + 128, 112 + 150])} to={[560, 610]} label="Press it — it springs back" at={press + 2} align="left" />
      <AbsoluteFill style={{ pointerEvents: 'none', background: `radial-gradient(60% 40% at 50% 62%, transparent 60%, ${ink.bg} 100%)`, opacity: 0.0 }} />
    </AbsoluteFill>
  );
};
