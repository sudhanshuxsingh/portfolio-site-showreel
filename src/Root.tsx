import { Composition, continueRender, delayRender } from 'remotion';
import { fontsReady } from './fonts';
import { Showreel } from './Showreel';
import { DURATION, sec } from './timeline';
import { FPS, HEIGHT, WIDTH } from './theme';

const fontHandle = delayRender('Loading Geist');
fontsReady.then(() => continueRender(fontHandle));

export const Root: React.FC = () => (
  <Composition
    id="Showreel"
    component={Showreel}
    durationInFrames={sec(DURATION)}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
    defaultProps={{ soundtrack: 'audio/soundtrack.m4a' as string | undefined }}
  />
);
