import { useMemo } from 'react';

/**
 * The portfolio's SpotlightLogo (src/registry/new-york/spotlight-logo.tsx in
 * sudhanshuxsingh/www), ported verbatim: same SS polygons, same isometric
 * `stand` projection, extrusion, press, hatch pattern, dashed guides, cursor
 * light and theme colours. Only the inputs are frame-driven (light position,
 * press) and strokes are sized like the site's 1 px hairline at its 256 px
 * hero width, so the mark looks identical at any size on video.
 */
type Point = [number, number];

const S: Point[] = [
  [1, 0], [4, 0], [4, 1], [2, 1], [2, 3], [4, 3], [5, 4], [5, 6],
  [4, 7], [0, 7], [0, 6], [3, 6], [3, 4], [1, 4], [0, 3], [0, 1],
]; // prettier-ignore

export const SS_MARK: Point[][] = [S, S.map(([x, y]) => [x + 6, y] as Point)];

const UNIT = 40;
const COS30 = Math.cos(Math.PI / 6);
const DEPTH = 1.4;

const project = (x: number, y: number, z: number): Point => [(x + z) * COS30 * UNIT, ((x - z) * 0.5 + y) * UNIT];
const facesCamera = (nx: number, ny: number) => nx - ny > 1e-9;
const nearness = (x: number, y: number, z: number) => x - y - z;
const toPath = (points: Point[]) => `M${points.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join('L')}Z`;

interface IsometricFace {
  kind: 'side' | 'front';
  d: string;
}

/** The site's buildIsometric(), `stand` orientation. */
function buildIsometric(glyphs: Point[][], depth: number, press: number) {
  const sides: (IsometricFace & { key: number })[] = [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const polygon of glyphs) {
    let area = 0;
    polygon.forEach(([x1, y1], i) => {
      const [x2, y2] = polygon[(i + 1) % polygon.length];
      area += x1 * y2 - x2 * y1;
    });
    polygon.forEach((p, i) => {
      const q = polygon[(i + 1) % polygon.length];
      const ex = q[0] - p[0];
      const ey = q[1] - p[1];
      const nx = area > 0 ? -ey : ey;
      const ny = area > 0 ? ex : -ex;
      for (const [x, y] of [p, q])
        for (const z of [0, depth]) {
          const [sx, sy] = project(x, y, z);
          minX = Math.min(minX, sx);
          maxX = Math.max(maxX, sx);
          minY = Math.min(minY, sy);
          maxY = Math.max(maxY, sy);
        }
      if (!facesCamera(nx, ny)) return;
      sides.push({
        kind: 'side',
        d: toPath([project(p[0], p[1], press), project(q[0], q[1], press), project(q[0], q[1], depth), project(p[0], p[1], depth)]),
        key: nearness((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (press + depth) / 2),
      });
    });
  }
  sides.sort((a, b) => a.key - b.key);
  const fronts: IsometricFace[] = glyphs.map((polygon) => ({
    kind: 'front',
    d: toPath(polygon.map(([x, y]) => project(x, y, press))),
  }));
  return {
    faces: [...sides.map(({ kind, d }) => ({ kind, d })), ...fronts],
    viewBox: [minX, minY, maxX - minX, maxY - minY] as [number, number, number, number],
  };
}

const BASE = buildIsometric(SS_MARK, DEPTH, 0);
export const LOGO_VIEWBOX = BASE.viewBox;
/** Where the site rests its light: 32 % across, 30 % down the mark. */
export const LIGHT_REST: Point = [0.32, 0.3];
/** The site's press: the faces sink to 55 % of the extrusion. */
export const PRESS_MAX = DEPTH * 0.55;

const GUIDE_FAR = 60;
const GUIDES = (() => {
  const ys = SS_MARK.flat().map(([, y]) => y);
  const xs = SS_MARK.flat().map(([x]) => x);
  const [top, base] = [Math.min(...ys), Math.max(...ys)];
  const [left, right] = [Math.min(...xs), Math.max(...xs)];
  return [
    [project(-GUIDE_FAR, top, 0), project(GUIDE_FAR, top, 0)],
    [project(-GUIDE_FAR, base, 0), project(GUIDE_FAR, base, 0)],
    [project(left, base, -GUIDE_FAR), project(left, base, GUIDE_FAR)],
    [project(right, top, -GUIDE_FAR), project(right, top, GUIDE_FAR)],
  ];
})();

/** The site's dark-theme tokens (globals.css), so color-mix() resolves identically. */
const TOKENS = {
  '--background': '#09090b',
  '--foreground': '#fafafa',
  '--border': '#27272a',
  '--line': 'color-mix(in oklab, var(--border) 64%, var(--background))',
  '--logo-stroke': 'color-mix(in oklab, var(--foreground) 17%, var(--background))',
  '--logo-hatch': 'color-mix(in oklab, var(--foreground) 12%, var(--background))',
  '--logo-light': '#ffffff',
} as React.CSSProperties;

export interface SpotlightLogoProps {
  id: string;
  /** Display width in px. */
  width: number;
  /** Light centre as a fraction of the mark's box; defaults to the site's rest. */
  light?: Point;
  /** Light radius in the site's units (default 240). */
  radius?: number;
  /** 0 → PRESS_MAX: the tactile press. */
  press?: number;
  /** Video only: 0–1 trace-on of the outline. */
  draw?: number;
  /** Video only: 0–1 for the guides and hatch to come in. */
  guides?: number;
  hatch?: number;
  /** Stroke in px; defaults to the site's 1 px at 256 px wide. */
  stroke?: number;
  style?: React.CSSProperties;
}

export const SpotlightLogo: React.FC<SpotlightLogoProps> = ({
  id,
  width,
  light = LIGHT_REST,
  radius = 240,
  press = 0,
  draw = 1,
  guides = 1,
  hatch = 1,
  stroke,
  style,
}) => {
  const { faces } = useMemo(() => buildIsometric(SS_MARK, DEPTH, press), [press]);
  const [vx, vy, vw, vh] = LOGO_VIEWBOX;
  const pxPerUnit = width / vw;
  const strokePx = stroke ?? Math.max(1, width / 256);
  const sw = strokePx / pxPerUnit;
  const dash = `${(4 * strokePx) / pxPerUnit} ${(3 * strokePx) / pxPerUnit}`;
  const cx = vx + vw * light[0];
  const cy = vy + vh * light[1];
  const trace = draw < 1 ? { pathLength: 1, strokeDasharray: '1 1', strokeDashoffset: 1 - draw } : {};

  return (
    <div style={{ ...TOKENS, width, height: (width * vh) / vw, ...style }}>
      <svg viewBox={`${vx} ${vy} ${vw} ${vh}`} width={width} height={(width * vh) / vw} fill="none" style={{ overflow: 'visible', display: 'block' }}>
        <defs>
          <pattern id={`${id}-hatch`} width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M-1 1l2-2M0 10L10 0M9 11l2-2" stroke="var(--logo-hatch)" />
          </pattern>
          <radialGradient id={`${id}-light`} gradientUnits="userSpaceOnUse" cx={cx} cy={cy} r={radius}>
            <stop stopColor="var(--logo-light)" />
            <stop offset="0.45" stopColor="var(--logo-light)" stopOpacity="0.55" />
            <stop offset="1" stopColor="var(--logo-light)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g stroke="var(--line)" strokeWidth={sw} strokeDasharray={dash} opacity={guides}>
          {GUIDES.map(([[x1, y1], [x2, y2]], index) => {
            // Guides grow out from the mark as they come in.
            const g = Math.min(1, guides * 1.2);
            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2;
            return <line key={index} x1={mx + (x1 - mx) * g} y1={my + (y1 - my) * g} x2={mx + (x2 - mx) * g} y2={my + (y2 - my) * g} />;
          })}
        </g>
        <g strokeLinejoin="round" strokeWidth={sw}>
          {faces.map((face, index) => (
            <g key={index}>
              <path d={face.d} fill="var(--background)" fillOpacity={Math.min(1, draw * 1.4)} stroke="var(--logo-stroke)" {...trace} />
              {face.kind === 'front' && hatch > 0 && <path d={face.d} fill={`url(#${id}-hatch)`} opacity={hatch} />}
              <path d={face.d} stroke={`url(#${id}-light)`} {...trace} />
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
};

/** Map a point in px (relative to the logo's top-left) to a light position. */
export const lightAt = (width: number, [x, y]: Point): Point => {
  const [, , vw, vh] = LOGO_VIEWBOX;
  const height = (width * vh) / vw;
  return [x / width, y / height];
};
