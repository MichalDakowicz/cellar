import { qrMatrix, qrPath, QUIET_ZONE } from "@/lib/qrMatrix";
import { COLORS } from "@/lib/designTokens";

export function QrCode({ payload, label }: { payload: string; label: string }) {
  const matrix = qrMatrix(payload);
  const size = matrix.length + QUIET_ZONE * 2;
  return (
    <svg
      className="pair-code"
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
    >
      <rect width={size} height={size} fill={COLORS.foreground} />
      <path
        transform={`translate(${QUIET_ZONE} ${QUIET_ZONE})`}
        d={qrPath(matrix)}
        fill={COLORS.background}
      />
    </svg>
  );
}
