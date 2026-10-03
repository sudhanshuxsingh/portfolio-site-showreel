import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { Grain, SheetOverlay, type Tone } from './components/Sheet';
import { ease, tween } from './lib/anim';
import { DURATION, PUNCH, scene, sec, T, type SceneId } from './timeline';
import { Hook } from './scenes/Hook';
import { Reveal } from './scenes/Reveal';
import { FirstLook } from './scenes/FirstLook';
import { Signals } from './scenes/Signals';
import { Scroll } from './scenes/Scroll';
import { Cmdk } from './scenes/Cmdk';
import { Theme } from './scenes/Theme';
import { Sound } from './scenes/Sound';
import { CraftIntro, CraftWall } from './scenes/Craft';
import { Registry } from './scenes/Registry';
import { EggsIntro, Haki, Morph, Press } from './scenes/Eggs';
import { Details } from './scenes/Details';
import { Yours } from './scenes/Yours';
import { Outro } from './scenes/Outro';
import { ink } from './theme';

/** Scene → component, title-block caption and sheet tone. */
const SCENES: { id: SceneId; fig: string; tone?: Tone; overlay?: boolean; C: React.FC }[] = [
  { id: 'hook', fig: 'Fig. 00 — The problem', C: Hook, overlay: false },
  { id: 'reveal', fig: 'Fig. 01 — The mark', C: Reveal },
  { id: 'firstLook', fig: 'Fig. 02 — First look', C: FirstLook },
  { id: 'signals', fig: 'Fig. 03 — Signals', C: Signals },
  { id: 'scroll', fig: 'Fig. 04 — Sections', C: Scroll },
  { id: 'cmdk', fig: 'Fig. 05 — Command menu', C: Cmdk },
  { id: 'theme', fig: 'Fig. 06 — Theme', C: Theme, overlay: false },
  { id: 'sound', fig: 'Fig. 07 — Sound', C: Sound },
  { id: 'craftIntro', fig: 'Fig. 08 — Craft', C: CraftIntro },
  { id: 'craftWall', fig: 'Fig. 08 — Craft', C: CraftWall },
  { id: 'registry', fig: 'Fig. 09 — Registry', C: Registry },
  { id: 'eggsIntro', fig: 'Fig. 10 — Easter eggs', C: EggsIntro },
  { id: 'morph', fig: 'Fig. 10a — Morphing logo', C: Morph },
  { id: 'press', fig: 'Fig. 10b — Tactile mark', C: Press },
  { id: 'haki', fig: 'Fig. 10c — Pixel avatar', C: Haki, overlay: false },
  { id: 'details', fig: 'Fig. 11 — Details', C: Details },
  { id: 'yours', fig: 'Fig. 12 — Make it yours', C: Yours },
  { id: 'outro', fig: 'Fig. 13 — Visit', C: Outro, overlay: false },
];

const Overlay: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / 60;
  const index = SCENES.findIndex(({ id }) => t >= T[id][0] && t < T[id][1]);
  const current = SCENES[Math.max(0, index)];
  if (current.overlay === false) return null;
  return (
    <SheetOverlay
      tone={current.tone ?? 'dark'}
      sheet={Math.max(1, index)}
      of={SCENES.length - 1}
      fig={current.fig}
      progress={frame / sec(DURATION)}
    />
  );
};

/** The cut lands with a zoom punch: in at 104.5 %, settling over a quarter second. */
const Punch: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const p = tween(frame, [0, 15], [0, 1], ease.out);
  return <AbsoluteFill style={{ transform: p < 1 ? `scale(${1.045 - 0.045 * p})` : undefined }}>{children}</AbsoluteFill>;
};

export const Showreel: React.FC<{ soundtrack?: string }> = ({ soundtrack }) => (
  <AbsoluteFill style={{ background: ink.bg }}>
    {SCENES.map(({ id, C }) => (
      <Sequence key={id} {...scene(id)} name={id}>
        {PUNCH.includes(id) ? (
          <Punch>
            <C />
          </Punch>
        ) : (
          <C />
        )}
      </Sequence>
    ))}
    <Overlay />
    <Grain />
    {soundtrack ? <Audio src={staticFile(soundtrack)} /> : null}
  </AbsoluteFill>
);
