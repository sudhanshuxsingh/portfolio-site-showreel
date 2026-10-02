/** A crisp macOS-style pointer with a click ripple, drawn in clip space. */
export const Cursor: React.FC<{
  x: number;
  y: number;
  /** Frames since the last mouse-down, or Infinity. */
  sinceDown?: number;
  down?: boolean;
  size?: number;
  opacity?: number;
}> = ({ x, y, sinceDown = Infinity, down = false, size = 34, opacity = 1 }) => {
  const ripple = sinceDown < 30 ? sinceDown / 30 : null;
  const press = down ? 0.86 : 1;
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: 0, height: 0, opacity, pointerEvents: 'none' }}>
      {ripple !== null && (
        <div
          style={{
            position: 'absolute',
            left: -size * 1.1,
            top: -size * 1.1,
            width: size * 2.2,
            height: size * 2.2,
            borderRadius: '50%',
            border: `${Math.max(2, size / 14)}px solid rgba(250,250,250,${0.85 * (1 - ripple)})`,
            transform: `scale(${0.35 + ripple * 0.9})`,
            boxShadow: `0 0 ${size}px rgba(250,250,250,${0.25 * (1 - ripple)})`,
          }}
        />
      )}
      <svg
        width={size}
        height={size * 1.4}
        viewBox="0 0 20 28"
        style={{
          position: 'absolute',
          left: -size * 0.12,
          top: -size * 0.08,
          transform: `scale(${press})`,
          transformOrigin: '10% 5%',
          filter: `drop-shadow(0 ${size * 0.08}px ${size * 0.18}px rgba(0,0,0,.55))`,
          overflow: 'visible',
        }}
      >
        <path
          d="M2 1.5 L2 22.5 L7.2 17.6 L10.6 25.6 L14 24.1 L10.7 16.4 L17.8 16.4 Z"
          fill="#0b0b0d"
          stroke="#fafafa"
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
