import { inr } from "../utils/formatters";

export default function TreeNode({ x, y, width, height, name, gain, fill }) {
  if (!width || !height) return null;
  return (
    <g>
      <rect
        x={x + 1} y={y + 1}
        width={Math.max(width - 2, 0)}
        height={Math.max(height - 2, 0)}
        fill={fill || "#333"}
        rx={4}
      />
      {width > 60 && height > 24 && (
        <text
          x={x + width / 2} y={y + height / 2 - 6}
          textAnchor="middle" fill="#fff"
          fontSize={Math.min(11, width / 7)}
          fontFamily="'Syne',sans-serif"
          fontWeight={600}
        >
          {name}
        </text>
      )}
      {width > 60 && height > 36 && (
        <text
          x={x + width / 2} y={y + height / 2 + 10}
          textAnchor="middle"
          fill={(gain ?? 0) >= 0 ? "#6ee7b7" : "#fca5a5"}
          fontSize={Math.min(9, width / 9)}
          fontFamily="'Syne',sans-serif"
        >
          {(gain ?? 0) >= 0 ? "+" : ""}{inr(Math.abs(gain ?? 0))}
        </text>
      )}
    </g>
  );
}
