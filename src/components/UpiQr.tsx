import { useMemo } from 'react';
import { encode } from 'uqr';

/** Always black on white, whatever the theme, so every scanner can read it. */
export function UpiQr({ value, size = 208 }: { value: string; size?: number }) {
  const { modules, path } = useMemo(() => {
    const { size: count, data } = encode(value, { ecc: 'M', border: 2 });
    const cells = data.flatMap((row, y) => row.map((dark, x) => (dark ? `M${x} ${y}h1v1h-1z` : '')));
    return { modules: count, path: cells.join('') };
  }, [value]);

  return (
    <svg
      role="img"
      aria-label="UPI payment QR code"
      viewBox={`0 0 ${modules} ${modules}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className="rounded-xl"
    >
      <rect width={modules} height={modules} fill="#ffffff" />
      <path d={path} fill="#000000" />
    </svg>
  );
}
