import { loadFont } from '@remotion/fonts';
import { staticFile } from 'remotion';

// Geist ships as variable fonts: one file covers every weight we use. Instrument
// Serif (OFL) is the luxury accent set against it.
export const fontsReady = Promise.all([
  loadFont({
    family: 'Geist',
    url: staticFile('fonts/Geist-Variable.woff2'),
    weight: '100 900',
    format: 'woff2',
  }),
  loadFont({
    family: 'Geist Mono',
    url: staticFile('fonts/GeistMono-Variable.woff2'),
    weight: '100 900',
    format: 'woff2',
  }),
  loadFont({
    family: 'Instrument Serif',
    url: staticFile('fonts/InstrumentSerif-Italic.woff2'),
    style: 'italic',
    weight: '400',
    format: 'woff2',
  }),
  loadFont({
    family: 'Instrument Serif',
    url: staticFile('fonts/InstrumentSerif-Regular.woff2'),
    style: 'normal',
    weight: '400',
    format: 'woff2',
  }),
]);
