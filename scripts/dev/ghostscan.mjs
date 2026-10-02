// Compare encoded video frames against freshly rendered stills to find compositor artifacts.
//   node scripts/dev/ghostscan.mjs out/showreel-video.mp4 t1 t2 ...
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition, openBrowser } from '@remotion/renderer';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const [video, ...times] = process.argv.slice(2);
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });
const browser = await openBrowser('chrome', {
  browserExecutable: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',
  chromiumOptions: { gl: 'swangle' },
});
const composition = await selectComposition({ serveUrl, id: 'Showreel', puppeteerInstance: browser });
const dir = fs.mkdtempSync('/tmp/claude-0/ghost-');
for (const t of times) {
  const frame = Math.round(Number(t) * 60);
  const still = path.join(dir, `s${frame}.png`);
  const vid = path.join(dir, `v${frame}.png`);
  await renderStill({ composition, serveUrl, output: still, frame, scale: 0.5, puppeteerInstance: browser });
  execFileSync('ffmpeg', ['-v', 'error', '-i', video, '-vf', `select=eq(n\\,${frame}),scale=540:960`, '-frames:v', '1', '-y', vid]);
  const out = execFileSync('python3', ['-c', `
from PIL import Image, ImageChops
import numpy as np
a = np.asarray(Image.open('${still}').convert('L'), dtype=np.float32)
b = np.asarray(Image.open('${vid}').convert('L'), dtype=np.float32)
d = np.abs(a - b)
print(f'{d.mean():.2f} {np.percentile(d, 99.5):.1f} {(d > 40).mean() * 100:.2f}')
`]).toString().trim();
  console.log(`${String(t).padStart(6)}s f${frame}  mean/p99.5/%>40: ${out}`);
}
await browser.close({ silent: true });
