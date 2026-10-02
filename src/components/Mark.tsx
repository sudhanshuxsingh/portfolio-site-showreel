import { useMemo } from 'react';
import { buildMark, type Camera } from '../lib/mark3d';
import { ink } from '../theme';

export interface MarkProps {
  camera: Camera;
  /** 0–1: the outline traces itself on. */
  draw?: number;
  /** 0–1: flat outline → full extrusion. */
  extrude?: number;
  /** Grid units the front faces are pushed in (site max: depth × 0.55). */
  press?: number;
  /** Cursor light, px from the mark centre. */
  light?: [number, number];
  lightRadius?: number;
  /** 0–1 strength of the light pass. */
  lightOpacity?: number;
  hatchOpacity?: number;
  guidesOpacity?: number;
  /** 0 = line drawing (site hero), 1 = shaded solid (site header mark). */
  solid?: number;
  strokeWidth?: number;
  size: number;
  /** Length of the dashed isometric guide rails, in grid units. */
  guideLength?: number;
  color?: string;
  background?: string;
  id: string;
  style?: React.CSSProperties;
}

const mix = (a: string, b: string, t: number) => {
  const pa = a.match(/\w\w/g)!.map((h) => parseInt(h, 16));
  const pb = b.match(/\w\w/g)!.map((h) => parseInt(h, 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(',')})`;
};

/** Renders the SS mark in an SVG `size` px square centred on the mark. */
export const Mark: React.FC<MarkProps> = ({
  camera,
  draw = 1,
  extrude = 1,
  press = 0,
  light = [-120, -160],
  lightRadius = 520,
  lightOpacity = 1,
  hatchOpacity = 1,
  guidesOpacity = 0.55,
  solid = 0,
  strokeWidth = 2,
  size,
  guideLength = 40,
  color = ink.fg,
  background = ink.bg,
  id,
  style,
}) => {
  const mark = useMemo(
    () => buildMark(camera, { press, extrude, guideLength }),
    [camera.yaw, camera.pitch, camera.roll, camera.distance, camera.unit, press, extrude, guideLength]
  );
  const half = size / 2;
  const lineColor = mix(background, color, 0.2);
  const hatchColor = mix(background, color, 0.13);
  const guideColor = mix(background, color, 0.16);
  const lightDir = [-0.45, -0.75, -0.5];
  const shade = (n: [number, number, number]) => {
    const lambert = Math.max(0, -(n[0] * lightDir[0] + n[1] * lightDir[1] + n[2] * lightDir[2]));
    return mix(background, color, 0.18 + 0.5 * lambert);
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox={`${-half} ${-half} ${size} ${size}`}
      style={{ overflow: 'visible', ...style }}
    >
      <defs>
        <radialGradient id={`${id}-light`} gradientUnits="userSpaceOnUse" cx={light[0]} cy={light[1]} r={lightRadius}>
          <stop stopColor={color} />
          <stop offset="0.45" stopColor={color} stopOpacity="0.55" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </radialGradient>
        {mark.faces.map((face, i) =>
          face.kind !== 'side' ? (
            <clipPath key={i} id={`${id}-clip-${face.kind}-${face.glyph}`}>
              <path d={face.d} />
            </clipPath>
          ) : null
        )}
      </defs>

      {guidesOpacity > 0 && (
        <g stroke={guideColor} strokeWidth={1.5} strokeDasharray="10 8" opacity={guidesOpacity}>
          {mark.guides.map(([[x1, y1], [x2, y2]], i) => (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
          ))}
        </g>
      )}

      <g strokeLinejoin="round" strokeLinecap="round">
        {mark.faces.map((face, i) => {
          const cap = face.kind !== 'side';
          const fill =
            solid > 0
              ? cap
                ? mix(background, color, 0.94 * solid)
                : solid >= 1
                  ? shade(face.normal)
                  : background
              : background;
          const dash = draw < 1 ? { pathLength: 1, strokeDasharray: '1 1', strokeDashoffset: 1 - draw } : {};
          const hatch = mark.hatch.find((h) => h.glyph === face.glyph);
          return (
            <g key={i}>
              <path d={face.d} fill={fill} fillOpacity={Math.min(1, draw * 1.5)} stroke={lineColor} strokeWidth={strokeWidth} {...dash} />
              {cap && hatch && hatchOpacity > 0 && solid < 1 && (
                <g clipPath={`url(#${id}-clip-${face.kind}-${face.glyph})`} stroke={hatchColor} strokeWidth={1.4} opacity={hatchOpacity * (1 - solid)}>
                  {hatch.lines.map(([[x1, y1], [x2, y2]], j) => (
                    <line key={j} x1={x1} y1={y1} x2={x2} y2={y2} />
                  ))}
                </g>
              )}
              {lightOpacity > 0 && (
                <>
                  <path d={face.d} fill="none" stroke={`url(#${id}-light)`} strokeWidth={strokeWidth * 3.2} opacity={lightOpacity * 0.16} {...dash} />
                  <path d={face.d} fill="none" stroke={`url(#${id}-light)`} strokeWidth={strokeWidth} opacity={lightOpacity} {...dash} />
                </>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
};
