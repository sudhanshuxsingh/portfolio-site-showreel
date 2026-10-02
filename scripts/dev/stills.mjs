// node scripts/dev/stills.mjs out/sheet.png 0.5 1.2 3.4 ...   (seconds; or f123 for frames)
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition, openBrowser } from '@remotion/renderer';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const [out, ...times] = process.argv.slice(2);
const comp = process.env.COMP ?? 'Showreel';
const scale = Number(process.env.SCALE ?? 0.5);
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts'), webpackOverride: (c) => c });
const browser = await openBrowser('chrome', {
  browserExecutable: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',
  chromiumOptions: { gl: 'swiftshader' },
});
const composition = await selectComposition({ serveUrl, id: comp, puppeteerInstance: browser });
const tmp = fs.mkdtempSync('/tmp/claude-0/stills-');
const files = [];
for (const t of times) {
  const frame = t.startsWith('f') ? Number(t.slice(1)) : Math.round(Number(t) * composition.fps);
  const file = path.join(tmp, `${String(frame).padStart(5, '0')}.png`);
  await renderStill({ composition, serveUrl, output: file, frame, scale, puppeteerInstance: browser });
  files.push([t, file]);
}
await browser.close({ silent: true });
execFileSync('python3', ['-c', `
import sys
from PIL import Image, ImageDraw
items = ${JSON.stringify(files)}
ims = [(t, Image.open(f).convert('RGB')) for t, f in items]
w, h = ims[0][1].size
cols = min(len(ims), int(${process.env.COLS ?? 4}))
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * w, rows * (h + 22)), (50, 50, 50))
d = ImageDraw.Draw(sheet)
for i, (t, im) in enumerate(ims):
    x, y = (i % cols) * w, (i // cols) * (h + 22)
    sheet.paste(im, (x, y + 22)); d.text((x + 6, y + 5), t, fill=(255, 220, 0))
sheet.save('${out}')
print('${out}', sheet.size)
`]);
