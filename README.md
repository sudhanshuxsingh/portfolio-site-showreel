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
| 0:00 | Cold open | Four hard-cut flashes of what is coming, a hit on each: the red avatar burst, the theme wipe, the live demos, the press of the mark. A sub drop into the hook. |
| 0:00.7 | 00 — The problem | A 3D wall of identical “centred avatar + two buttons” templates. *Most dev portfolios look the same. This one doesn’t.* Music slowed and soft, the only stretch with the song’s vocals. |
| 0:08 | 01 — The mark | The drop: on the song’s downbeat, the site’s SpotlightLogo builds itself. The dashed guides run out, the SS outline traces on, the hatch settles in and a cursor light sweeps the edges to the site’s rest spot. Name, shimmer tagline, green *Open to new roles*. |
| 0:14 | 02 — First look | The real hero in a 3D browser: the cursor-lit mark, then the tactile press. |
| 0:18 | 03 — Signals | One camera move across the overview rows: *One green signal. Your time. Their time. One-click copy.* |
| 0:22 | 04 — Sections | The phone scroll-through, Hero → Footer, with a rolling section index. |
| 0:30 | 05 — Command menu | Isometric ⌘ K keycaps, then the real palette: filter, arrow keys, copy email (toast), switch to light. |
| 0:35 | 06 — Theme | Circular wipe from the real theme toggle: *Light. Dark. System.* |
| 0:39 | 07 — Sound | The site’s synthesized click, drawn as an oscilloscope. |
| 0:41 | 08 — Craft | *Craft (10)*, then a 3D wall of eight live demos with the camera locking onto each. |
| 0:49 | 09 — Registry | `pnpm dlx shadcn@latest add …/r/ai-prompt-input.json`, then the real install tabs. |
| 0:55 | 10 — Easter eggs | *Now, the easter eggs.* The morphing pixel logo, the logo’s tactile press (cursor light and spring), and the pixel avatar: one click and the palette breaks to red, with the site’s own sound sample. |
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

**Type.** Geist carries every statement. The key word of each headline is set
in Instrument Serif italic, a luxury serif, against it: *Most dev portfolios
look the same.*, *Developer Portfolio.* Single-word titles (*Craft.*, the
theme names, the rolling section index) are set in the serif alone.

**Cuts.** Most scenes land with a zoom punch (104.5 % settling in a quarter
second) and a thump.

**Sound.** The effects lead and the music stays underneath. `src/cues.ts`
turns the timeline and the capture event logs into 264 timed cues.
`scripts/mix.py` synthesizes every effect in numpy: keys, wide stereo
whooshes, trailer hits for the cold open, sub drops, reverse swells into the
big moments, risers, glitches, a wooden knock on each headline and a soft
glint on its serif word. The UI click is the site's exact Web Audio recipe
(sine 900 → 500 Hz, 55 ms). The master is limited to -15 LUFS under a -1 dBFS
ceiling.

## Music

**“Mere Paas Aao Mere Dosto”**, as background music.

- **Start:** the slowed hook (0:43–0:49) with its vocals, soft, under the
  cold open and the hook. The sung line ends at ~7 s; these are the only
  vocals in the reel.
- **From the drop to the outro:** one continuous bed, with no gaps, cuts,
  ducking or tape-stops. It loops whole bars of the song's own vocal-free
  groove passages: the band's entry (0:35), the strings' glide after the
  first chorus (1:00) and the organ-and-strings build (2:35). Nothing is
  separated from the vocals, so nothing sounds hollow. Each join is matched
  by rhythm and crossfaded onto a downbeat, so the groove carries on in
  time. The bed is ridden to one constant low level, with room carved out
  for the effects (low cut at 90 Hz, a dip at 2.5 kHz). Its first downbeat
  lands on the logo at 0:08.
- **End:** the band's groove, slowed and soft, picks up on the last bar of
  the bed.
- **`--no-slow` variant:** keeps the start and end soft but at normal speed. To
  use it, run `npm run mux -- public/audio/soundtrack-noslow.wav`.

The song is a commercial track, so it is not in this public repo. To re-mix,
place it at `public/audio/music/mere-paas-aao.mp3`. The mixed soundtrack is
committed as `public/audio/soundtrack.m4a`, so the reel renders without it.

## Commands

```sh
npm install
pip install numpy scipy pillow pyloudnorm   # mixer + dev tools

# 1. Footage (optional, already committed in public/capture)
pnpm --dir ../www build && pnpm --dir ../www start
npm run capture                           # or: npm run capture -- cmdk hero-haki

# 2. Soundtrack (needs the song, see Music)
npm run mix                               # python3 scripts/mix.py --stems also writes out/music.wav + out/sfx.wav

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
  mix.py             music edit + sound design + master
  export-cues.ts     timeline → out/cues.json
  mux.sh             final encodes
  splice.py          swap re-rendered frame ranges into a finished render
public/
  capture/           recordings + stills of the real site (+ cursor/event JSON)
  audio/             the site's avatar sample, mixed soundtrack
  fonts/             Geist, Geist Mono, Instrument Serif (all OFL)
```
