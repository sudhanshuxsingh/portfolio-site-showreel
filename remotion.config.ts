import { Config } from '@remotion/cli/config';

// Use the Chromium that ships with this environment instead of downloading one.
// Override with REMOTION_BROWSER=/path/to/chrome-headless-shell if needed.
const browser =
  process.env.REMOTION_BROWSER ??
  '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';

Config.setBrowserExecutable(browser);
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setCodec('h264');
Config.setCrf(16);
Config.setPixelFormat('yuv420p');
Config.setConcurrency(Number(process.env.REMOTION_CONCURRENCY ?? 4));
Config.setChromiumOpenGlRenderer('swangle');
Config.setOverwriteOutput(true);
Config.setEntryPoint('./src/index.ts');
