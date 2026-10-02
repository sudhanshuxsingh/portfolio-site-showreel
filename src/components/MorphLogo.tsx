import { ease } from '../lib/anim';

/**
 * Frame-driven port of the portfolio's MorphingLogo
 * (src/registry/new-york/morphing-logo.tsx): a 10 × 7 pixel monogram that
 * morphs SS → plus → prompt → face, each cell fading on a 12 ms stagger.
 */
export const SHAPES = [
  ['0111001110', '1100011000', '1100011000', '0111001110', '0001100011', '0001100011', '1110011100'],
  ['0000110000', '0000110000', '0011111100', '1111111111', '0011111100', '0000110000', '0000110000'],
  ['0100000000', '0010000000', '0001000000', '0000100000', '0001000000', '0010011110', '0100000000'],
  ['0011111100', '0111111110', '1101001011', '1101001011', '1111111111', '0110110110', '0011111100'],
].map((rows) => rows.join(''));

export const SHAPE_NAMES = ['SS', 'Plus', 'Prompt', 'Face'];

const DURATION = 300;

/**
 * @param changes ms timestamps at which the logo advances to the next shape.
 * @param ms current time in ms.
 */
export const MorphLogo: React.FC<{
  ms: number;
  changes: number[];
  size: number;
  color?: string;
  /** Glow on lit cells. */
  glow?: number;
}> = ({ ms, changes, size, color = '#fafafa', glow = 0 }) => {
  const past = changes.filter((t) => t <= ms);
  const shape = past.length % SHAPES.length;
  const prev = (shape + SHAPES.length - 1) % SHAPES.length;
  const since = past.length ? ms - past[past.length - 1] : Infinity;
  const cell = size / 10;

  return (
    <svg width={size} height={size * 0.7} viewBox="0 0 50 35" style={{ overflow: 'visible' }}>
      {SHAPES[0].split('').map((_, index) => {
        const delay = (index % 7) * 12;
        const p = since === Infinity ? 1 : ease.tw(Math.min(1, Math.max(0, (since - delay) / DURATION)));
        const from = SHAPES[prev][index] === '1' && past.length ? 1 : 0;
        const to = SHAPES[shape][index] === '1' ? 1 : 0;
        const opacity = past.length ? from + (to - from) * p : to;
        const rxFrom = prev === 3 ? 2 : 0.5;
        const rxTo = shape === 3 ? 2 : 0.5;
        const rx = past.length ? rxFrom + (rxTo - rxFrom) * p : rxTo;
        return (
          <rect
            key={index}
            x={(index % 10) * 5}
            y={Math.floor(index / 10) * 5}
            width={4.2}
            height={4.2}
            rx={rx}
            fill={color}
            opacity={opacity}
            style={glow ? { filter: `drop-shadow(0 0 ${glow * 0.6}px ${color})` } : undefined}
          />
        );
      })}
      {cell < 0 && null}
    </svg>
  );
};
