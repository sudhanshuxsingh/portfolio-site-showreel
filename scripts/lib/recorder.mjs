import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

export const FPS = 60;
const DT = 1000 / FPS;

const easeInOut = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
export const eases = { inOut: easeInOut, out: easeOut, linear: (t) => t };

/**
 * Steps a page one virtual frame at a time, screenshots each frame over CDP and
 * pipes it straight into ffmpeg. Also logs the cursor and input events per
 * frame so the showreel can draw its own cursor and land sound cues exactly.
 */
export async function createRecorder(page, { name, outDir, clip, dpr }) {
  const cdp = await page.context().newCDPSession(page);
  await fs.mkdir(outDir, { recursive: true });
  const file = path.join(outDir, `${name}.mp4`);
  const width = Math.round(clip.width * dpr);
  const height = Math.round(clip.height * dpr);
  if (width % 2 || height % 2)
    throw new Error(`${name}: clip ${width}x${height} must be even`);

  const ffmpeg = spawn(
    'ffmpeg',
    [
      '-v', 'error', '-y',
      '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '12',
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart', file,
    ],
    { stdio: ['pipe', 'inherit', 'inherit'] }
  );
  const exited = new Promise((resolve, reject) => {
    ffmpeg.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`))
    );
  });

  const state = {
    frame: 0,
    x: clip.x + clip.width * 0.85,
    y: clip.y + clip.height * 1.1,
    down: false,
    cursor: [],
    events: [],
  };

  let pipeError = null;
  ffmpeg.stdin.on('error', (error) => {
    pipeError = error;
  });
  const write = (buffer) =>
    new Promise((resolve, reject) => {
      if (pipeError) return reject(pipeError);
      if (ffmpeg.stdin.write(buffer)) resolve();
      else ffmpeg.stdin.once('drain', resolve);
    });

  async function tick() {
    await page.evaluate((dt) => {
      window.__vt.frame(dt);
      return window.__vt.settle();
    }, DT);
    // CDP clips are in document coordinates; ours are viewport-relative.
    const scroll = await page.evaluate(() => {
      window.__vt.sync();
      return [window.scrollX, window.scrollY];
    });
    const { data } = await cdp.send('Page.captureScreenshot', {
      format: 'png',
      optimizeForSpeed: true,
      clip: { ...clip, x: clip.x + scroll[0], y: clip.y + scroll[1], scale: dpr },
    });
    await write(Buffer.from(data, 'base64'));
    state.cursor.push([
      +(state.x - clip.x).toFixed(2),
      +(state.y - clip.y).toFixed(2),
      state.down ? 1 : 0,
    ]);
    state.frame += 1;
  }

  const rec = {
    state,
    get frame() {
      return state.frame;
    },
    event(type, extra = {}) {
      state.events.push({ frame: state.frame, type, ...extra });
    },
    /** Capture frames with the cursor resting. */
    async wait(frames) {
      for (let i = 0; i < frames; i++) await tick();
    },
    /** Glide the cursor to (x, y) in viewport px along a gentle arc. */
    async move(x, y, frames = 36, { ease = easeInOut, arc = 0.12 } = {}) {
      const [x0, y0] = [state.x, state.y];
      const [dx, dy] = [x - x0, y - y0];
      for (let i = 1; i <= frames; i++) {
        const t = ease(i / frames);
        const bow = Math.sin(Math.PI * t) * arc;
        state.x = x0 + dx * t - dy * bow;
        state.y = y0 + dy * t + dx * bow;
        await page.mouse.move(state.x, state.y);
        await tick();
      }
    },
    /** Teleport without capturing (used before a clip starts). */
    async place(x, y) {
      state.x = x;
      state.y = y;
      await page.mouse.move(x, y);
    },
    async click({ hold = 5, after = 0 } = {}) {
      state.down = true;
      await page.mouse.down();
      this.event('click', { x: state.x - clip.x, y: state.y - clip.y });
      await this.wait(hold);
      state.down = false;
      await page.mouse.up();
      await this.wait(after);
    },
    async press(keys, { after = 0 } = {}) {
      this.event('key', { keys });
      await page.keyboard.press(keys);
      await this.wait(after);
    },
    async type(text, { every = 6 } = {}) {
      for (const char of text) {
        this.event('type', { char });
        await page.keyboard.type(char);
        await this.wait(every);
      }
    },
    async scrollTo(y, frames, ease = easeInOut) {
      const from = await page.evaluate(() => window.scrollY);
      for (let i = 1; i <= frames; i++) {
        const target = from + (y - from) * ease(i / frames);
        await page.evaluate((top) => window.scrollTo(0, top), target);
        await tick();
      }
    },
    async finish(meta = {}) {
      ffmpeg.stdin.end();
      await exited;
      const json = {
        name,
        fps: FPS,
        frames: state.frame,
        dpr,
        width,
        height,
        css: { width: clip.width, height: clip.height },
        cursor: state.cursor,
        events: state.events,
        ...meta,
      };
      await fs.writeFile(
        path.join(outDir, `${name}.json`),
        JSON.stringify(json)
      );
      await cdp.detach();
      return json;
    },
  };
  return rec;
}
