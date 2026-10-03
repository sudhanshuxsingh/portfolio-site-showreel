# SS/ Developer Portfolio — vertical showreel

A cinematic, 85-second vertical (1080 × 1920, 60 fps) launch film for
[sudhanshuxsingh.in](https://www.sudhanshuxsingh.in/), the developer
portfolio in [`sudhanshuxsingh/www`](https://github.com/sudhanshuxsingh/www).
It sells the portfolio as a product: every section, every feature and every
easter egg, in the site's own visual language.

- **Master:** [`out/showreel.mp4`](out/showreel.mp4) (H.264 High, AAC 320k)
- **Web copy:** [`out/showreel-web.mp4`](out/showreel-web.mp4)

## The cut

| Time | Sheet | What it shows |
| --- | --- | --- |
| 0:00 | 00 — The problem | A 3D wall of identical “centred avatar + two buttons” templates. *Most dev portfolios look the same. This one doesn’t.* Music slowed and soft, the only stretch with the song’s vocals. |
| 0:08 | 01 — The mark | The drop: on the song’s downbeat, the site’s SpotlightLogo builds itself. The dashed guides run out, the SS outline traces on, the hatch settles in and a cursor light sweeps the edges to the site’s rest spot. Name, shimmer tagline, green *Open to new roles*. |
| 0:14 | 02 — First look | The real hero in a 3D browser: the cursor-lit mark, then the tactile press. |
| 0:18 | 03 — Signals | One camera move across the overview rows: *One green signal. Your time. Their time. One-click copy.* |
| 0:22 | 04 — Sections | The phone scroll-through, Hero → Footer, with a rolling section index. |
| 0:30 | 05 — Command menu | Isometric ⌘ K keycaps, then the real palette: filter, arrow keys, copy email (toast), switch to light. |
| 0:35 | 06 — Theme | Circular wipe from the real theme toggle: *Light. Dark. System.* |
| 0:39 | 07 — Sound | The site’s synthesized click, drawn as an oscilloscope. |
| 0:41 | 08 — Craft | *Craft (10)*, then a 3D wall of eight live demos with the camera locking onto each. |
| 0:49 | 09 — Registry | `pnpm dlx shadcn@latest add …/r/ai-prompt-input.json`, then the real install tabs. |
| 0:55 | 10 — Easter eggs | *Now, the easter eggs.* The music winds down like a turntable. The morphing pixel logo, the logo’s tactile press (cursor light and spring), and the pixel avatar: one click and the palette breaks to red, with the site’s own sound sample. |
| 1:08 | 11 — Details | Skip link · reduced motion · JSON-LD · OG images · 404 · keyboard-first. |
| 1:12 | 12 — Make it yours | `src/lib/site.ts` edited live, and the real hero swaps over. |
| 1:18 | 13 — Visit | The SpotlightLogo, *Developer Portfolio.*, the stack, **sudhanshuxsingh.in**. Music slowed and soft again. |

Every claim on screen comes from the portfolio’s source.

## How it is made

**Real footage, frame-perfect.** `scripts/capture.mjs` runs the actual site
(production build) in Playwright and records it on a *virtual clock*
(`scripts/lib/virtual-time.mjs`). `Date`, `performance.now`, timers and
`requestAnimationFrame` are stepped exactly 1/60 s per frame, and every CSS
or WAAPI animation is seeked to match through `document.getAnimations()`. The
site's framer-motion springs, the avatar sequencer, cmdk, sonner and next-themes
therefore play perfectly smoothly at 60 fps, however long each screenshot
takes. Each clip also stores the cursor path and input events per frame. The
reel draws its own cursor from these and syncs every sound to them.

**The site’s components, ported.** The scenes reuse the portfolio's own parts as
frame-driven Remotion components:

- `src/components/SpotlightLogo.tsx` is the site's SpotlightLogo, ported
  verbatim: the same SS polygons, isometric projection, extrusion, hatch,
  dashed guides, theme colours and cursor light. Only its inputs are
  frame-driven. The light eases 16 % a frame toward the cursor, as on the
  site, and the press uses the site's own spring (k 520, c 26).
- `src/components/Haki.tsx` carries the site's pixel-avatar sprite atlas, click
  sequence and effect keyframes.
- `src/components/MorphLogo.tsx` carries the pixel shapes and the 12 ms
  per-cell stagger.
- The palette, Geist type, hairline rails and 45° hatch bands come straight
  from the site's `globals.css`.

**Sound.** `src/cues.ts` turns the timeline and the capture event logs into
208 timed cues. `scripts/mix.py` synthesizes every effect in numpy: keys,
whooshes, impacts, risers and glitches. The UI click is the site's exact
Web Audio recipe (sine 900 → 500 Hz, 55 ms). The mixer also cuts the music to
the edit in `src/timeline.ts`, adds reverb, ducking and a tape-stop, and
masters the result.

## Music

**“Mere Paas Aao Mere Dosto”**: mostly **0:43–0:57**, plus **1:18–1:36** where
needed. Every scene boundary sits on a beat of that edit. The logo lands on the
song's downbeat at 0:43.279.

- **Vocals only at the start:** the sung line plays in the slowed intro and
  ends at ~7 s. From the drop on, every cut comes from a vocal-free
  instrumental, so the song sits under the picture as background music.
  `scripts/separate.py` makes the instrumental with UVR's MDX-Net “Inst HQ 3”
  model, run with numpy and onnxruntime. The model downloads from GitHub on
  the first run.
- **Start and end:** soft *and* slowed, like a turntable, with reverb and a
  low-pass.
- **Middle:** full speed and full volume.
- **`--no-slow` variant:** keeps the start and end soft but at normal speed. To
  use it, run `npm run mux -- public/audio/soundtrack-noslow.wav`.

The song is a commercial track, so it is not in this public repo. To re-mix,
place it at `public/audio/music/mere-paas-aao.mp3`. The mixed soundtrack is
committed as `public/audio/soundtrack.m4a`, so the reel renders without it.

## Commands

```sh
npm install
pip install numpy scipy pillow onnxruntime   # mixer, stem split, dev tools

# 1. Footage (optional, already committed in public/capture)
pnpm --dir ../www build && pnpm --dir ../www start
npm run capture                           # or: npm run capture -- cmdk hero-haki

# 2. Soundtrack (needs the song, see Music)
python3 scripts/separate.py               # once: instrumental + vocals stems (several minutes on CPU)
npm run mix

# 3. Picture + final files
npm run render:video                      # ~20 min on 4 cores
npm run mux                               # out/showreel.mp4 + out/showreel-web.mp4

# Fix one scene without a full re-render: render its frames, splice them in
npx remotion render Showreel out/seg.mp4 --frames=3564-3695 --muted
python3 scripts/splice.py out/showreel-video.mp4 out/seg.mp4:3564 && npm run mux

npm run studio                            # live preview with sound
```

Remotion uses the Chromium at `/opt/pw-browsers/...`. Set `REMOTION_BROWSER` to
point it elsewhere.

One rendering gotcha: with the ANGLE-on-SwiftShader GL backend (`swangle`),
headless Chromium sometimes reused stale compositor tiles while a large SVG
repainted every frame. That shows up as ghost copies of other parts of the
frame. `remotion.config.ts` therefore uses plain `swiftshader`, which renders
these frames cleanly and about 4× faster (~20 min for the whole reel on 4
cores). `scripts/dev/flicker.py` scans a render for frames that disagree with
both neighbours.

## Layout

```
src/
  timeline.ts        scenes, music edit, beat grid (single source of truth)
  cues.ts            sound cues derived from the timeline and capture logs
  Showreel.tsx       the composition
  scenes/            Hook · Reveal · FirstLook · Signals · Scroll · Cmdk · Theme ·
                     Sound · Craft · Registry · Eggs · Details · Yours · Outro
  components/        SpotlightLogo (the site's logo) · Haki (pixel avatar) · MorphLogo ·
                     Screen (3D devices) · Type (kinetic words, callouts) ·
                     Sheet (drawing frame) · Cursor
  lib/               clip registry, easing
scripts/
  capture.mjs        Playwright + virtual time recorder
  separate.py        splits the song into instrumental and vocals
  mix.py             music edit + sound design + master
  export-cues.ts     timeline → out/cues.json
  mux.sh             final encodes
  splice.py          swap re-rendered frame ranges into a finished render
public/
  capture/           recordings + stills of the real site (+ cursor/event JSON)
  audio/             the site's avatar sample, mixed soundtrack
  fonts/             Geist + Geist Mono (OFL)
```
