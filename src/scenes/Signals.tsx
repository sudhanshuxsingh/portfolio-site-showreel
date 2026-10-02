import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { ease, tween } from '../lib/anim';
import { Backdrop, RAIL } from '../components/Sheet';
import { lerpView, Screen, type View } from '../components/Screen';
import { Label, Words, w } from '../components/Type';
import { ink } from '../theme';

/**
 * One camera move across the real overview rows: the availability pill, the
 * owner's clock against the visitor's, then one-click copy of the email.
 * hero-copy clip: idle, then a click on the copy button (~frame 186).
 */
const VIEWS: View[] = [
  { x: 14, y: 0, w: 210, h: 210 },
  { x: 400, y: 600, w: 400, h: 420 },
  { x: 40, y: 640, w: 380, h: 400 },
];

export const Signals: React.FC = () => {
  const frame = useCurrentFrame();
  const m1 = tween(frame, [70, 100], [0, 1], ease.inOut);
  const m2 = tween(frame, [154, 184], [0, 1], ease.inOut);
  const view = m2 > 0 ? lerpView(VIEWS[1], VIEWS[2], m2) : lerpView(VIEWS[0], VIEWS[1], m1);
  const width = 940;
  // hero-copy idles 140 frames (the ping keeps pinging), clicks copy at ~186.
  const from = 0;
  const enter = tween(frame, [0, 26], [0, 1], ease.out);
  const sway = Math.sin(frame / 60) * 3;

  return (
    <AbsoluteFill>
      <Backdrop />
      <Label text="// 03 — before they scroll" at={2} style={{ position: 'absolute', left: RAIL + 22, top: 228 }} />
      <Words
        style={{ position: 'absolute', left: RAIL + 14, top: 290 }}
        size={150}
        lines={[w('One', 0), [{ text: 'green', at: 12, color: ink.signal }], w('signal.', 24)]}
        exitAt={76}
      />
      <Words style={{ position: 'absolute', left: RAIL + 14, top: 290 }} size={150} lines={[w('Your time.', [92, 104]), w('Their time.', [116, 128])]} exitAt={158} />
      <Words style={{ position: 'absolute', left: RAIL + 14, top: 290 }} size={150} lines={[w('One-click', 170), w('copy.', 184)]} />
      <AbsoluteFill style={{ perspective: 2000 }}>
        <div
          style={{
            position: 'absolute',
            left: (1080 - width) / 2,
            top: 780,
            transform: `translateY(${(1 - enter) * 300}px) rotateX(${8 + (1 - enter) * 30}deg) rotateY(${-6 + sway}deg)`,
            transformStyle: 'preserve-3d',
            opacity: enter,
          }}
        >
          <Screen clip="hero-copy" width={width} view={{ ...view, h: view.w * (900 / width) }} chrome="none" from={from} radius={34} cursorScale={0.7} />
        </div>
      </AbsoluteFill>
      <Label text="Status pill · motion-safe ping" at={14} out={70} size={24} color={ink.mutedFg} style={{ position: 'absolute', left: RAIL + 22, top: 1712 }} />
      <Label text="IST 09:41 · gap to your clock" at={100} out={154} size={24} color={ink.mutedFg} style={{ position: 'absolute', left: RAIL + 22, top: 1712 }} />
      <Label text="Clipboard API · instant feedback" at={186} size={24} color={ink.mutedFg} style={{ position: 'absolute', left: RAIL + 22, top: 1712 }} />
    </AbsoluteFill>
  );
};
