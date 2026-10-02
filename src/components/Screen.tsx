import { AbsoluteFill, Freeze, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { clips, type ClipName } from '../lib/clips';
import { ink, mono, sans } from '../theme';
import { Cursor } from './Cursor';

export interface View {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ScreenProps {
  /** A recording from public/capture. */
  clip?: ClipName;
  /** Or a still from public/capture/stills (CSS size of its viewport required). */
  still?: string;
  stillCss?: { width: number; height: number };
  /** Capture frame shown at this sequence's frame 0. */
  from?: number;
  rate?: number;
  /** Hold the first frame this many frames before playing. */
  hold?: number;
  /** Display width in px. */
  width: number;
  /** Region of the capture to show, in CSS px. Defaults to all of it. */
  view?: View;
  chrome?: 'browser' | 'phone' | 'none';
  cursor?: boolean;
  cursorScale?: number;
  radius?: number;
  url?: string;
  /** Extruded slab thickness in px, for real 3D edges when rotated. */
  depth?: number;
  glare?: number;
  theme?: 'dark' | 'light';
  style?: React.CSSProperties;
}

const BAR = 0.075;

/** A floating device: browser window or phone, playing a capture of the real site. */
export const Screen: React.FC<ScreenProps> = ({
  clip,
  still,
  stillCss = { width: 820, height: 1180 },
  from = 0,
  rate = 1,
  hold = 0,
  width,
  view,
  chrome = 'browser',
  cursor = true,
  cursorScale = 1,
  radius,
  url = 'sudhanshuxsingh.in',
  depth = 18,
  glare = 1,
  theme = 'dark',
  style,
}) => {
  const frame = useCurrentFrame();
  const meta = clip ? clips[clip] : null;
  const css = meta ? meta.css : stillCss;
  const v = view ?? { x: 0, y: 0, w: css.width, h: css.height };
  const s = width / v.w;
  const contentH = v.h * s;
  const isPhone = chrome === 'phone';
  const bar = chrome === 'browser' ? Math.round(width * BAR) : isPhone ? Math.round(width * 0.12) : 0;
  const bezel = isPhone ? Math.round(width * 0.035) : 0;
  const outerW = width + bezel * 2;
  const outerH = contentH + bar + bezel * 2;
  const r = radius ?? (isPhone ? width * 0.15 : width * 0.035);
  const bg = theme === 'dark' ? ink.bg : '#ffffff';
  const fg = theme === 'dark' ? ink.fg : ink.bg;

  const captureFrame = Math.max(0, Math.min((meta?.frames ?? 1) - 1, Math.round(from + Math.max(0, frame - hold) * rate)));
  const point = meta?.cursor[captureFrame];
  let sinceDown = Infinity;
  if (meta && point) {
    for (let i = captureFrame; i > 0 && i > captureFrame - 40; i--) {
      if (meta.cursor[i][2] && !meta.cursor[i - 1][2]) {
        sinceDown = (captureFrame - i) / rate;
        break;
      }
    }
  }

  const slab = Array.from({ length: depth > 0 ? 10 : 0 }, (_, i) => (i + 1) * (depth / 10));

  return (
    <div style={{ position: 'relative', width: outerW, height: outerH, transformStyle: 'preserve-3d', ...style }}>
      {/* Extruded body: stacked layers form the device edge in 3D. */}
      {slab.map((z, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: r,
            background: i === slab.length - 1 ? '#050506' : isPhone ? '#1d1d20' : '#18181b',
            border: `1px solid ${isPhone ? '#2e2e33' : '#26262a'}`,
            transform: `translateZ(${-z}px)`,
            boxShadow: i === slab.length - 1 ? '0 80px 140px rgba(0,0,0,.65)' : undefined,
          }}
        />
      ))}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: r,
          overflow: 'hidden',
          background: isPhone ? '#0a0a0c' : bg,
          border: `1.5px solid ${isPhone ? '#3a3a40' : theme === 'dark' ? '#2a2a2e' : '#d4d4d8'}`,
          boxShadow: isPhone ? 'inset 0 0 0 2px #000, inset 0 0 0 4px #1f1f23' : undefined,
        }}
      >
        {chrome === 'browser' && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              height: bar,
              background: theme === 'dark' ? '#111113' : '#f4f4f5',
              borderBottom: `1px solid ${theme === 'dark' ? '#232326' : '#e4e4e7'}`,
              display: 'flex',
              alignItems: 'center',
              padding: `0 ${bar * 0.45}px`,
              gap: bar * 0.18,
            }}
          >
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ width: bar * 0.2, height: bar * 0.2, borderRadius: '50%', background: theme === 'dark' ? '#3f3f46' : '#d4d4d8' }} />
            ))}
            <div
              style={{
                marginLeft: bar * 0.4,
                flex: 1,
                height: bar * 0.56,
                borderRadius: bar * 0.28,
                background: theme === 'dark' ? '#1b1b1e' : '#ffffff',
                border: `1px solid ${theme === 'dark' ? '#2a2a2e' : '#e4e4e7'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: bar * 0.12,
                fontFamily: mono,
                fontSize: bar * 0.26,
                color: theme === 'dark' ? ink.mutedFg : ink.dim,
                letterSpacing: '0.01em',
              }}
            >
              <svg width={bar * 0.22} height={bar * 0.22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
              {url}
            </div>
            <div style={{ width: bar * 0.9 }} />
          </div>
        )}
        {isPhone && (
          <div
            style={{
              position: 'absolute',
              left: bezel,
              right: bezel,
              top: bezel,
              height: bar,
              background: bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: `0 ${width * 0.09}px`,
              fontFamily: sans,
              fontWeight: 600,
              fontSize: bar * 0.34,
              color: fg,
              borderTopLeftRadius: r - bezel,
              borderTopRightRadius: r - bezel,
            }}
          >
            <span>9:41</span>
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: bar * 0.24,
                width: width * 0.3,
                height: bar * 0.5,
                transform: 'translateX(-50%)',
                borderRadius: bar,
                background: '#000',
              }}
            />
            <span style={{ display: 'flex', gap: bar * 0.12, alignItems: 'center' }}>
              <svg width={bar * 0.4} height={bar * 0.28} viewBox="0 0 20 12" fill={fg}>
                <rect x="0" y="8" width="3" height="4" rx="1" />
                <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
                <rect x="10" y="3" width="3" height="9" rx="1" />
                <rect x="15" y="0" width="3" height="12" rx="1" />
              </svg>
              <svg width={bar * 0.6} height={bar * 0.3} viewBox="0 0 28 13">
                <rect x="0.5" y="0.5" width="23" height="12" rx="3.5" fill="none" stroke={fg} strokeOpacity={0.5} />
                <rect x="2.5" y="2.5" width="17" height="8" rx="2" fill={fg} />
                <rect x="25" y="4" width="2" height="5" rx="1" fill={fg} fillOpacity={0.5} />
              </svg>
            </span>
          </div>
        )}
        <div
          style={{
            position: 'absolute',
            left: bezel,
            top: bezel + bar,
            width,
            height: contentH,
            overflow: 'hidden',
            background: bg,
            borderBottomLeftRadius: isPhone ? r - bezel : 0,
            borderBottomRightRadius: isPhone ? r - bezel : 0,
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: -v.x * s,
              top: -v.y * s,
              width: css.width * s,
              height: css.height * s,
            }}
          >
            {meta && clip ? (
              frame < hold ? (
                <Freeze frame={0}>
                  <OffthreadVideo
                    src={staticFile(`capture/${clip}.mp4`)}
                    trimBefore={Math.max(0, Math.round(from))}
                    muted
                    style={{ width: '100%', height: '100%', display: 'block' }}
                  />
                </Freeze>
              ) : (
                <Sequence from={hold} layout="none">
                  <OffthreadVideo
                    src={staticFile(`capture/${clip}.mp4`)}
                    trimBefore={Math.max(0, Math.round(from))}
                    playbackRate={rate}
                    muted
                    style={{ width: '100%', height: '100%', display: 'block' }}
                  />
                </Sequence>
              )
            ) : still ? (
              <Img src={staticFile(`capture/stills/${still}.png`)} style={{ width: '100%', height: '100%', display: 'block' }} />
            ) : null}
            {cursor && point && (
              <Cursor
                x={point[0] * s}
                y={point[1] * s}
                down={Boolean(point[2])}
                sinceDown={sinceDown}
                size={Math.max(22, 13 * s) * cursorScale}
              />
            )}
          </div>
        </div>
        {glare > 0 && (
          <AbsoluteFill
            style={{
              borderRadius: r,
              background:
                'linear-gradient(118deg, rgba(255,255,255,0.075) 0%, rgba(255,255,255,0.02) 28%, rgba(255,255,255,0) 42%, rgba(255,255,255,0) 100%)',
              opacity: glare,
              pointerEvents: 'none',
            }}
          />
        )}
      </div>
    </div>
  );
};

/** Height in px a Screen will occupy for a given width/view, to lay out scenes. */
export const screenHeight = (props: Pick<ScreenProps, 'clip' | 'stillCss' | 'width' | 'view' | 'chrome'>) => {
  const css = props.clip ? clips[props.clip].css : props.stillCss ?? { width: 820, height: 1180 };
  const v = props.view ?? { x: 0, y: 0, w: css.width, h: css.height };
  const chrome = props.chrome ?? 'browser';
  const bar = chrome === 'browser' ? Math.round(props.width * BAR) : chrome === 'phone' ? Math.round(props.width * 0.12) : 0;
  const bezel = chrome === 'phone' ? Math.round(props.width * 0.035) : 0;
  return (v.h * props.width) / v.w + bar + bezel * 2;
};

/** Local px (inside the Screen element) of a CSS-px point in the capture. */
export const screenPoint = (
  props: Pick<ScreenProps, 'clip' | 'stillCss' | 'width' | 'view' | 'chrome'>,
  [cx, cy]: [number, number]
): [number, number] => {
  const css = props.clip ? clips[props.clip].css : props.stillCss ?? { width: 820, height: 1180 };
  const v = props.view ?? { x: 0, y: 0, w: css.width, h: css.height };
  const s = props.width / v.w;
  const chrome = props.chrome ?? 'browser';
  const bar = chrome === 'browser' ? Math.round(props.width * BAR) : chrome === 'phone' ? Math.round(props.width * 0.12) : 0;
  const bezel = chrome === 'phone' ? Math.round(props.width * 0.035) : 0;
  return [bezel + (cx - v.x) * s, bezel + bar + (cy - v.y) * s];
};

/** Linear blend of two views (for camera moves across the UI). */
export const lerpView = (a: View, b: View, t: number): View => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  w: a.w + (b.w - a.w) * t,
  h: a.h + (b.h - a.h) * t,
});
