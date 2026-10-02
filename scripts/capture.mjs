/**
 * Records the real portfolio (sudhanshuxsingh/www) for the showreel.
 *
 *   pnpm --dir ../www build && pnpm --dir ../www start   # or point at prod
 *   CAPTURE_BASE=http://localhost:3000 node scripts/capture.mjs [clip ...]
 *
 * Every clip is stepped on a virtual clock (see lib/virtual-time.mjs), so the
 * motion is frame-perfect at 60 fps. Output: public/capture/<clip>.mp4 plus a
 * <clip>.json with the cursor path and input events for each frame.
 */
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import { installVirtualTime } from './lib/virtual-time.mjs';
import { createRecorder } from './lib/recorder.mjs';

const BASE = process.env.CAPTURE_BASE ?? 'http://localhost:3000';
const OUT = 'public/capture';
// 09:41 in Kolkata. The visitor is in New York, so the site reads "9.5h ahead".
const EPOCH = Date.parse('2026-10-02T04:11:00Z');
const VISITOR_TZ = 'America/New_York';

const DESKTOP = { viewport: { width: 820, height: 1180 }, dpr: 2 };
const PHONE = { viewport: { width: 390, height: 844 }, dpr: 3, mobile: true };

const QUIET_CSS = `
  html { scrollbar-width: none; scroll-behavior: auto !important; }
  ::-webkit-scrollbar { display: none; }
  * { caret-color: transparent !important; }
  nextjs-portal { display: none !important; }
`;

async function open(browser, { device = DESKTOP, scheme = 'dark', url = '/', warm = 60 } = {}) {
  const context = await browser.newContext({
    viewport: device.viewport,
    deviceScaleFactor: device.dpr,
    isMobile: Boolean(device.mobile),
    hasTouch: Boolean(device.mobile),
    colorScheme: scheme,
    reducedMotion: 'no-preference',
    timezoneId: VISITOR_TZ,
    locale: 'en-US',
  });
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
    origin: BASE,
  });
  await context.addInitScript({
    content: `(${installVirtualTime.toString()})(${EPOCH});`,
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => console.warn(`  [page] ${error.message}`));
  await page.goto(BASE + url, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: QUIET_CSS });
  await page.evaluate(() =>
    document.querySelectorAll('img[loading="lazy"]').forEach((img) => {
      img.loading = 'eager';
    })
  );
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(async (frames) => {
    for (let i = 0; i < frames; i++) {
      window.__vt.frame(1000 / 60);
      await window.__vt.settle();
    }
  }, warm);
  await page.evaluate(() =>
    Promise.all(
      [...document.images].map((img) =>
        img.complete ? null : new Promise((r) => (img.onload = img.onerror = r))
      )
    )
  );
  return { context, page, device };
}

/** Run `frames` virtual frames without recording (state settles off camera). */
const idle = (page, frames) =>
  page.evaluate(async (n) => {
    for (let i = 0; i < n; i++) {
      window.__vt.frame(1000 / 60);
      await window.__vt.settle();
    }
  }, frames);

const viewportClip = ({ viewport }) => ({
  x: 0,
  y: 0,
  width: viewport.width,
  height: viewport.height,
});

async function box(page, selector) {
  const handle = page.locator(selector).first();
  const b = await handle.boundingBox();
  if (!b) throw new Error(`No box for ${selector}`);
  return { ...b, cx: b.x + b.width / 2, cy: b.y + b.height / 2 };
}

const finishClip = async (rec, context, meta) => {
  const result = await rec.finish(meta);
  await context.close();
  return result;
};

/** Preview area of a /craft/<slug> page, the live demo the visitor plays with. */
const PREVIEW = 'div.min-h-\\[22rem\\]';

async function craftClip(browser, slug, script, { pad = 0, dpr } = {}) {
  const { context, page, device } = await open(browser, { url: `/craft/${slug}`, warm: 40 });
  const area = await box(page, PREVIEW);
  const clip = {
    x: Math.round(area.x - pad),
    y: Math.round(area.y - pad),
    width: Math.round(area.width + pad * 2),
    height: Math.round(area.height + pad * 2),
  };
  const rec = await createRecorder(page, {
    name: `craft-${slug}`,
    outDir: OUT,
    clip,
    dpr: dpr ?? device.dpr,
  });
  await rec.place(clip.x + clip.width * 0.9, clip.y + clip.height * 0.95);
  await script({ page, rec, area, at: (sel) => box(page, `${PREVIEW} ${sel}`) });
  return finishClip(rec, context, { clipRect: clip, slug });
}

const clips = {
  /** Cursor light sweeps the isometric SS, then the mark is pressed. */
  async 'hero-spotlight'(browser) {
    const { context, page, device } = await open(browser, { warm: 30 });
    const mark = await box(page, 'figure svg');
    const rec = await createRecorder(page, {
      name: 'hero-spotlight',
      outDir: OUT,
      clip: viewportClip(device),
      dpr: device.dpr,
    });
    await rec.place(mark.x + mark.width * 1.2, mark.y + mark.height * 1.9);
    await rec.wait(10);
    await rec.move(mark.x - 40, mark.y + mark.height * 0.25, 54);
    await rec.move(mark.x + mark.width * 0.55, mark.y - 70, 46, { arc: 0.2 });
    await rec.move(mark.x + mark.width + 30, mark.y + mark.height * 0.45, 40, { arc: 0.2 });
    await rec.move(mark.x + mark.width * 0.62, mark.y + mark.height * 0.95, 40, { arc: 0.25 });
    await rec.move(mark.cx - 8, mark.cy - 10, 34);
    await rec.wait(10);
    await rec.click({ hold: 34, after: 50 });
    await rec.click({ hold: 8, after: 46 });
    await rec.move(mark.x - 90, mark.y + mark.height * 0.7, 48);
    await rec.wait(20);
    const meta = { mark: { x: mark.x, y: mark.y, w: mark.width, h: mark.height } };
    return finishClip(rec, context, meta);
  },

  /** Click the pixel avatar: the full Conqueror's Haki power-up. */
  async 'hero-haki'(browser) {
    const { context, page, device } = await open(browser, { warm: 200 });
    const avatar = await box(page, 'button[aria-label^="Play Sudhanshu"]');
    const rec = await createRecorder(page, {
      name: 'hero-haki',
      outDir: OUT,
      clip: viewportClip(device),
      dpr: device.dpr,
    });
    await rec.place(avatar.x + 380, avatar.y + 300);
    await rec.wait(6);
    await rec.move(avatar.cx + 10, avatar.cy + 6, 40);
    await rec.wait(8);
    await rec.click({ hold: 5 });
    await rec.wait(340);
    await rec.move(avatar.cx + 200, avatar.cy + 140, 40);
    await rec.wait(10);
    const meta = { avatar: { x: avatar.x, y: avatar.y, w: avatar.width, h: avatar.height } };
    return finishClip(rec, context, meta);
  },

  /** Overview rows: copy the email (check flips green), hover the résumé. */
  async 'hero-copy'(browser) {
    const { context, page, device } = await open(browser, { warm: 200 });
    const copy = await box(page, 'main button[aria-label="Copy email address"]');
    const resume = await box(page, 'main a:has-text("View résumé")');
    const rec = await createRecorder(page, {
      name: 'hero-copy',
      outDir: OUT,
      clip: viewportClip(device),
      dpr: device.dpr,
    });
    await rec.place(copy.cx + 160, copy.cy + 210);
    await rec.wait(140);
    await rec.move(copy.cx, copy.cy, 38);
    await rec.wait(8);
    await rec.click({ hold: 5 });
    await rec.wait(70);
    await rec.move(resume.x + 30, resume.cy, 34);
    await rec.wait(60);
    const meta = {
      copy: { x: copy.cx, y: copy.cy },
      resume: { x: resume.cx, y: resume.cy },
    };
    return finishClip(rec, context, meta);
  },

  /** ⌘K: open, filter, arrow to "Copy email address" (toast), then go light. */
  async cmdk(browser) {
    const { context, page, device } = await open(browser, { warm: 200 });
    const rec = await createRecorder(page, {
      name: 'cmdk',
      outDir: OUT,
      clip: viewportClip(device),
      dpr: device.dpr,
    });
    await rec.place(560, 860);
    await rec.wait(24);
    await rec.press('Control+K', { after: 34 });
    await rec.type('cr', { every: 8 });
    await rec.wait(26);
    for (let i = 0; i < 3; i++) await rec.press('ArrowDown', { after: 13 });
    await rec.wait(20);
    await rec.press('Enter', { after: 120 });
    await rec.press('Control+K', { after: 28 });
    await rec.type('light theme', { every: 5 });
    await rec.wait(24);
    await rec.press('Enter', { after: 100 });
    return finishClip(rec, context, {});
  },

  /** Phone: the whole page, top to bottom, pausing on every section. */
  async 'scroll-phone'(browser) {
    const { context, page, device } = await open(browser, { device: PHONE, warm: 12 });
    const sections = await page.evaluate(() =>
      ['about', 'stack', 'experience', 'projects', 'craft', 'contact'].map((id) => {
        const el = document.getElementById(id);
        return [id, Math.round(el.getBoundingClientRect().top + window.scrollY - 56)];
      })
    );
    const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    const rec = await createRecorder(page, {
      name: 'scroll-phone',
      outDir: OUT,
      clip: viewportClip(device),
      dpr: device.dpr,
    });
    const marks = [];
    await rec.wait(96);
    for (const [id, top] of sections) {
      await rec.scrollTo(Math.min(top, max), 44);
      marks.push({ id, frame: rec.frame });
      await rec.wait(id === 'projects' || id === 'craft' ? 58 : 40);
    }
    await rec.scrollTo(max, 44);
    marks.push({ id: 'footer', frame: rec.frame });
    await rec.wait(30);
    return finishClip(rec, context, { sections: marks });
  },

  /** Projects: hover the live Whisper preview so the screenshot lifts. */
  async projects(browser) {
    const { context, page, device } = await open(browser, { warm: 60 });
    await page.evaluate(() => {
      const el = document.getElementById('projects');
      window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 56);
    });
    await idle(page, 20);
    const preview = await box(page, 'a[aria-label="Open Whisper in a new tab"]');
    const rec = await createRecorder(page, {
      name: 'projects',
      outDir: OUT,
      clip: viewportClip(device),
      dpr: device.dpr,
    });
    await rec.place(preview.x + preview.width + 40, preview.y + preview.height + 220);
    await rec.wait(12);
    await rec.move(preview.cx + 60, preview.cy + 40, 44);
    await rec.wait(70);
    await rec.move(preview.cx + 120, preview.y + preview.height + 260, 40);
    await rec.wait(30);
    return finishClip(rec, context, {});
  },

  async 'craft-fluid-menu'(browser) {
    return craftClip(browser, 'fluid-menu', async ({ rec, at }) => {
      const open = await at('button[aria-label="Open menu"]');
      await rec.wait(10);
      await rec.move(open.cx, open.cy, 40);
      await rec.wait(8);
      await rec.click({ hold: 4, after: 40 });
      for (let i = 1; i <= 4; i++) {
        await rec.move(open.cx + 2, open.cy + i * 50, 16);
        await rec.wait(i === 4 ? 26 : 14);
      }
      await rec.move(open.cx, open.cy, 26);
      await rec.wait(8);
      await rec.click({ hold: 4, after: 50 });
      await rec.move(open.cx + 260, open.cy + 220, 36);
      await rec.wait(10);
    });
  },

  async 'craft-status-button'(browser) {
    return craftClip(browser, 'status-button', async ({ rec, at }) => {
      const button = await at('button');
      await rec.wait(10);
      await rec.move(button.cx + 30, button.cy + 6, 40);
      await rec.wait(10);
      await rec.click({ hold: 5 });
      await rec.move(button.cx + 230, button.cy + 160, 40);
      await rec.wait(470);
    });
  },

  async 'craft-animated-checkboxes'(browser) {
    return craftClip(browser, 'animated-checkboxes', async ({ page, rec }) => {
      const boxes = await page.locator(`${PREVIEW} button[role="checkbox"]`).all();
      await rec.wait(10);
      for (const [i, handle] of boxes.entries()) {
        const b = await handle.boundingBox();
        await rec.move(b.x + b.width / 2, b.y + b.height / 2, i === 0 ? 36 : 16);
        await rec.wait(4);
        await rec.click({ hold: 4, after: 16 });
      }
      await rec.wait(40);
      await rec.move(boxes.length ? 600 : 600, 820, 30);
      await rec.wait(10);
    });
  },

  async 'craft-animated-toggles'(browser) {
    return craftClip(browser, 'animated-toggles', async ({ page, rec, at }) => {
      const free = await at('button:has-text("Free")');
      const premium = await box(page, `${PREVIEW} div.cursor-pointer`);
      await rec.wait(10);
      await rec.move(premium.cx, premium.cy - 12, 40);
      await rec.wait(6);
      await rec.click({ hold: 4, after: 44 });
      const annual = await at('button:has-text("Anually")');
      await rec.move(annual.cx, annual.cy, 26);
      await rec.wait(6);
      await rec.click({ hold: 4, after: 44 });
      const monthly = await at('button:has-text("Monthly")');
      await rec.move(monthly.cx, monthly.cy, 22);
      await rec.wait(6);
      await rec.click({ hold: 4, after: 44 });
      await rec.move(free.cx, free.cy, 26);
      await rec.wait(6);
      await rec.click({ hold: 4, after: 50 });
    });
  },

  async 'craft-shared-layout-tabs'(browser) {
    return craftClip(browser, 'shared-layout-tabs', async ({ rec, at }) => {
      await rec.wait(10);
      for (const label of ['Card View', 'Pack View', 'List View']) {
        const tab = await at(`button:has-text("${label}")`);
        await rec.move(tab.cx, tab.cy, 30);
        await rec.wait(6);
        await rec.click({ hold: 4, after: 62 });
      }
    });
  },

  async 'craft-ai-prompt-input'(browser) {
    return craftClip(browser, 'ai-prompt-input', async ({ rec, at }) => {
      const field = await at('textarea');
      await rec.wait(10);
      await rec.move(field.x + 60, field.cy, 36);
      await rec.wait(6);
      await rec.click({ hold: 4, after: 10 });
      await rec.move(field.x + 300, field.cy + 70, 20);
      await rec.type('Build me a portfolio that gets me hired', { every: 3 });
      await rec.wait(24);
      await rec.press('Enter', { after: 90 });
    });
  },

  async 'craft-status-indicator'(browser) {
    return craftClip(browser, 'status-indicator', async ({ rec, at }) => {
      const run = await at('button:has-text("Run demo")');
      const fail = await at('label:has-text("Simulate an error response")');
      await rec.wait(10);
      await rec.move(run.cx, run.cy, 36);
      await rec.wait(6);
      await rec.click({ hold: 4, after: 120 });
      await rec.move(fail.x + 8, fail.cy, 26);
      await rec.wait(4);
      await rec.click({ hold: 4, after: 14 });
      await rec.move(run.cx, run.cy, 24);
      await rec.wait(4);
      await rec.click({ hold: 4, after: 130 });
    });
  },

  async 'craft-morphing-logo'(browser) {
    return craftClip(browser, 'morphing-logo', async ({ rec, at }) => {
      const logo = await at('button[aria-label="Change logo"]');
      await rec.wait(10);
      for (let i = 0; i < 4; i++) {
        await rec.move(logo.cx - 6 + i * 4, logo.cy - 4, i === 0 ? 34 : 14);
        await rec.wait(30);
        await rec.move(logo.cx + 120, logo.cy + 70 - i * 30, 14);
      }
      await rec.wait(20);
    });
  },

  async 'craft-haki-avatar'(browser) {
    return craftClip(
      browser,
      'haki-avatar',
      async ({ rec, at }) => {
        const avatar = await at('button');
        await rec.wait(10);
        await rec.move(avatar.cx + 10, avatar.cy + 20, 34);
        await rec.wait(6);
        await rec.click({ hold: 4, after: 340 });
      },
      { dpr: 3 }
    );
  },

  /** Component page: Code tab, install tabs per package manager, copy. */
  async 'craft-code'(browser) {
    const { context, page, device } = await open(browser, { url: '/craft/ai-prompt-input', warm: 40 });
    const rec = await createRecorder(page, {
      name: 'craft-code',
      outDir: OUT,
      clip: viewportClip(device),
      dpr: device.dpr,
    });
    const code = await box(page, 'button:has-text("Code")');
    await rec.place(code.cx + 300, code.cy + 400);
    await rec.wait(10);
    await rec.move(code.cx, code.cy, 34);
    await rec.wait(6);
    await rec.click({ hold: 4, after: 50 });
    const install = await page.evaluate(() => {
      const h = [...document.querySelectorAll('h2')].find((el) => el.textContent === 'Installation');
      return h.getBoundingClientRect().top + window.scrollY - 80;
    });
    await rec.scrollTo(install, 50);
    for (const pm of ['npm', 'bun', 'pnpm']) {
      const tab = await box(page, `button:has-text("${pm}")`);
      await rec.move(tab.cx, tab.cy, 22);
      await rec.wait(4);
      await rec.click({ hold: 4, after: 30 });
    }
    const copy = await box(page, 'button[aria-label="Copy command"]');
    await rec.move(copy.cx, copy.cy, 30);
    await rec.wait(6);
    await rec.click({ hold: 4, after: 70 });
    return finishClip(rec, context, {});
  },
};

/** Single frames: theme pairs for the wipe, full pages, 404, skip link, menu. */
async function stills(browser) {
  const dir = `${OUT}/stills`;
  await fs.mkdir(dir, { recursive: true });
  const shoot = async (page, device, file, full = false) => {
    const cdp = await page.context().newCDPSession(page);
    const height = full
      ? await page.evaluate(() => document.documentElement.scrollHeight)
      : device.viewport.height;
    const { data } = await cdp.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: full,
      clip: { x: 0, y: 0, width: device.viewport.width, height, scale: device.dpr },
    });
    await fs.writeFile(`${dir}/${file}.png`, Buffer.from(data, 'base64'));
    await cdp.detach();
  };
  for (const [deviceName, device] of [['desktop', DESKTOP], ['phone', PHONE]]) {
    for (const scheme of ['dark', 'light']) {
      const { context, page } = await open(browser, { device, scheme, warm: 200 });
      await shoot(page, device, `home-${deviceName}-${scheme}`);
      await shoot(page, device, `home-${deviceName}-${scheme}-full`, true);
      if (deviceName === 'phone' && scheme === 'dark') {
        await page.click('button[aria-label="Open menu"]');
        await idle(page, 20);
        await shoot(page, device, 'phone-menu-dark');
      }
      await context.close();
    }
  }
  {
    const { context, page } = await open(browser, { url: '/craft', warm: 200 });
    await shoot(page, DESKTOP, 'craft-desktop-dark-full', true);
    await context.close();
  }
  {
    const { context, page } = await open(browser, { url: '/this-page-does-not-exist', warm: 60 });
    await shoot(page, DESKTOP, 'not-found-desktop-dark');
    await context.close();
  }
  {
    const { context, page } = await open(browser, { warm: 60 });
    await page.keyboard.press('Tab');
    await idle(page, 10);
    await shoot(page, DESKTOP, 'skip-link-desktop-dark');
    await page.keyboard.press('Control+K');
    await idle(page, 40);
    await shoot(page, DESKTOP, 'cmdk-desktop-dark');
    await context.close();
  }
  return { frames: 0, width: 0, height: 0 };
}
clips.stills = stills;

/** The hero as it looks after editing src/lib/site.ts: name and email swapped. */
clips['stills-yours'] = async (browser) => {
  const dir = `${OUT}/stills`;
  await fs.mkdir(dir, { recursive: true });
  const { context, page } = await open(browser, { warm: 200 });
  await page.evaluate(() => {
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const swaps = [
      ['Sudhanshu Singh', 'Your Name'],
      ['contact@sudhanshuxsingh.in', 'hello@yourname.dev'],
      ['Tech Lead · Full-stack GenAI developer.', 'Design engineer · Building on the web.'],
      ['Tata Consultancy Services', 'Your Company'],
      ['Kolkata, India', 'Anywhere, Earth'],
    ];
    for (let node = walk.nextNode(); node; node = walk.nextNode())
      for (const [from, to] of swaps)
        if (node.nodeValue.includes(from)) node.nodeValue = node.nodeValue.replace(from, to);
  });
  await idle(page, 4);
  const cdp = await page.context().newCDPSession(page);
  const { data } = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    clip: { x: 0, y: 0, width: DESKTOP.viewport.width, height: DESKTOP.viewport.height, scale: DESKTOP.dpr },
  });
  await fs.writeFile(`${dir}/home-desktop-dark-yours.png`, Buffer.from(data, 'base64'));
  await context.close();
  return { frames: 0, width: 0, height: 0 };
};

async function main() {
  const wanted = process.argv.slice(2);
  const names = wanted.length ? wanted : Object.keys(clips);
  await fs.mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  try {
    for (const name of names) {
      if (!clips[name]) throw new Error(`Unknown clip ${name}`);
      const started = Date.now();
      process.stdout.write(`● ${name} … `);
      const result = await clips[name](browser);
      const seconds = ((Date.now() - started) / 1000).toFixed(1);
      console.log(`${result.frames} frames, ${result.width}x${result.height} in ${seconds}s`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
