/**
 * The portfolio's isometric SS monogram (src/registry/new-york/spotlight-logo.tsx
 * in sudhanshuxsingh/www), generalised from a fixed isometric projection to a
 * free perspective camera so the mark can be built, orbited and pressed on
 * camera. At yaw 45° / pitch 35.26° it is exactly the site's `stand` view.
 */
export type Point = [number, number];
type V3 = [number, number, number];

/** One letter of the pixel SS on a 5 × 7 grid (x right, y down), as on the site. */
export const S: Point[] = [
  [1, 0], [4, 0], [4, 1], [2, 1], [2, 3], [4, 3], [5, 4], [5, 6],
  [4, 7], [0, 7], [0, 6], [3, 6], [3, 4], [1, 4], [0, 3], [0, 1],
]; // prettier-ignore

export const SS_MARK: Point[][] = [S, S.map(([x, y]) => [x + 6, y] as Point)];

/** The site's camera: yaw 45°, pitch asin(1/√3). */
export const ISO = { yaw: 45, pitch: (Math.asin(1 / Math.sqrt(3)) * 180) / Math.PI };

export interface Camera {
  /** Degrees around the vertical axis. */
  yaw: number;
  /** Degrees around the horizontal axis (positive looks down on the mark). */
  pitch: number;
  /** Degrees around the view axis. */
  roll?: number;
  /** Perspective distance in grid units; Infinity is orthographic. */
  distance?: number;
  /** Grid units → px. */
  unit: number;
}

export interface Face {
  kind: 'side' | 'front' | 'back';
  d: string;
  /** Normal in camera space, for shading. */
  normal: V3;
  depth: number;
  glyph: number;
  /** Projected outline, for hatch clipping. */
  points: Point[];
}

export interface Mark3D {
  faces: Face[];
  /** Bounding box of the projection, in px around the mark centre. */
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  project: (p: V3) => Point;
  /** Hatch lines lying on the visible caps, already projected. */
  hatch: { glyph: number; lines: [Point, Point][] }[];
  guides: [Point, Point][];
}

const rad = (deg: number) => (deg * Math.PI) / 180;

function rotation(camera: Camera) {
  const [cy, sy] = [Math.cos(rad(camera.yaw)), Math.sin(rad(camera.yaw))];
  const [cp, sp] = [Math.cos(rad(camera.pitch)), Math.sin(rad(camera.pitch))];
  const [cr, sr] = [Math.cos(rad(camera.roll ?? 0)), Math.sin(rad(camera.roll ?? 0))];
  return ([x, y, z]: V3): V3 => {
    // yaw about y, then pitch about x, then roll about the view axis
    const x1 = x * cy + z * sy;
    const z1 = -x * sy + z * cy;
    const y2 = y * cp - z1 * sp;
    const z2 = y * sp + z1 * cp;
    return [x1 * cr - y2 * sr, x1 * sr + y2 * cr, z2];
  };
}

const path = (points: Point[]) =>
  `M${points.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join('L')}Z`;

export interface BuildOptions {
  glyphs?: Point[][];
  /** Extrusion depth in grid units (site: 1.4). */
  depth?: number;
  /** Push the front faces back into the extrusion (the tactile press). */
  press?: number;
  /** 0 → flat outline, 1 → full extrusion; for the build-on. */
  extrude?: number;
  hatchSpacing?: number;
  guideLength?: number;
}

/** Extrude the glyphs, cull back faces and sort the rest back to front. */
export function buildMark(camera: Camera, options: BuildOptions = {}): Mark3D {
  const {
    glyphs = SS_MARK,
    depth: fullDepth = 1.4,
    press = 0,
    extrude = 1,
    hatchSpacing = 0.32,
    guideLength = 40,
  } = options;
  const depth = Math.max(press + 0.0001, fullDepth * extrude);
  const rotate = rotation(camera);
  const distance = camera.distance ?? Infinity;

  // Centre the mark on the origin so the camera orbits its middle.
  const xs = glyphs.flat().map(([x]) => x);
  const ys = glyphs.flat().map(([, y]) => y);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const cz = fullDepth / 2;

  const toCamera = ([x, y, z]: V3): V3 => rotate([x - cx, y - cy, z - cz]);
  const projectCam = ([x, y, z]: V3): Point => {
    const k = Number.isFinite(distance) ? distance / (distance + z) : 1;
    return [x * k * camera.unit, y * k * camera.unit];
  };
  const project = (p: V3) => projectCam(toCamera(p));
  const eye: V3 = [0, 0, -distance];

  const faces: Face[] = [];
  const caps: Face[] = [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const grow = ([x, y]: Point) => {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  };

  const facing = (normal: V3, centre: V3) => {
    if (!Number.isFinite(distance)) return normal[2] < -1e-9;
    const view: V3 = [centre[0] - eye[0], centre[1] - eye[1], centre[2] - eye[2]];
    return normal[0] * view[0] + normal[1] * view[1] + normal[2] * view[2] < -1e-9;
  };

  glyphs.forEach((polygon, glyph) => {
    let area = 0;
    polygon.forEach(([x1, y1], i) => {
      const [x2, y2] = polygon[(i + 1) % polygon.length];
      area += x1 * y2 - x2 * y1;
    });

    polygon.forEach((p, i) => {
      const q = polygon[(i + 1) % polygon.length];
      const ex = q[0] - p[0];
      const ey = q[1] - p[1];
      const len = Math.hypot(ex, ey) || 1;
      // Outward normal on the letter plane (y down).
      const n2: V3 = area > 0 ? [ey / len, -ex / len, 0] : [-ey / len, ex / len, 0];
      const corners: V3[] = [
        [p[0], p[1], press],
        [q[0], q[1], press],
        [q[0], q[1], depth],
        [p[0], p[1], depth],
      ];
      const cam = corners.map(toCamera);
      const centre: V3 = [
        (cam[0][0] + cam[2][0]) / 2,
        (cam[0][1] + cam[2][1]) / 2,
        (cam[0][2] + cam[2][2]) / 2,
      ];
      const normal = rotate(n2);
      const points = cam.map(projectCam);
      points.forEach(grow);
      if (!facing(normal, centre)) return;
      faces.push({ kind: 'side', d: path(points), normal, depth: centre[2], glyph, points });
    });

    for (const [kind, z, nz] of [
      ['front', press, -1],
      ['back', depth, 1],
    ] as const) {
      const cam = polygon.map(([x, y]) => toCamera([x, y, z]));
      const centre = cam
        .reduce<V3>((a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], [0, 0, 0])
        .map((v) => v / cam.length) as V3;
      const normal = rotate([0, 0, nz]);
      const points = cam.map(projectCam);
      points.forEach(grow);
      if (!facing(normal, centre)) continue;
      caps.push({ kind, d: path(points), normal, depth: centre[2], glyph, points });
    }
  });

  faces.sort((a, b) => b.depth - a.depth);
  caps.sort((a, b) => b.depth - a.depth);

  // 45° hatch on each visible cap, in the cap's own plane so it turns with it.
  const hatch = caps.map((cap) => {
    const polygon = glyphs[cap.glyph];
    const z = cap.kind === 'front' ? press : depth;
    const px = polygon.map(([x]) => x);
    const py = polygon.map(([, y]) => y);
    const [x0, x1, y0, y1] = [Math.min(...px), Math.max(...px), Math.min(...py), Math.max(...py)];
    const lines: [Point, Point][] = [];
    for (let c = x0 + y0 - (y1 - y0); c <= x1 + y1; c += hatchSpacing) {
      // Line x + y = c clipped to the bounding box (clip-path trims to the glyph).
      const a: V3 = [c - y1, y1, z];
      const b: V3 = [c - y0, y0, z];
      lines.push([project(a), project(b)]);
    }
    return { glyph: cap.glyph, lines };
  });

  const top = Math.min(...ys);
  const base = Math.max(...ys);
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const far = guideLength;
  const guides: [Point, Point][] = [
    [project([-far, top, 0]), project([far, top, 0])],
    [project([-far, base, 0]), project([far, base, 0])],
    [project([left, base, -far]), project([left, base, far])],
    [project([right, top, -far]), project([right, top, far])],
  ];

  return { faces: [...faces, ...caps], bounds: { minX, minY, maxX, maxY }, project, hatch, guides };
}
