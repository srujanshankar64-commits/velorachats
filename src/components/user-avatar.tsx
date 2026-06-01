import { memo, useMemo } from "react";

const GRADIENTS = [
  { from: "#e8845a", to: "#c45a8a", ringFrom: "#f0a070", ringTo: "#d46a9a" },
  { from: "#4a90d4", to: "#8b58c8", ringFrom: "#60a8e0", ringTo: "#9b70d4" },
  { from: "#3ab868", to: "#2a8898", ringFrom: "#50c878", ringTo: "#3a9aaa" },
  { from: "#e0a830", to: "#d06020", ringFrom: "#f0c040", ringTo: "#e07830" },
];

function hashIndex(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % GRADIENTS.length;
}

export function avatarGradientFor(id: string) {
  return GRADIENTS[hashIndex(id)];
}

export const UserAvatar = memo(function UserAvatar({
  id,
  name,
  online = false,
  size = 46,
  ringWidth = 2,
  showOnlineDot = true,
  onlineRingColor = "#201c14",
}: {
  id: string;
  name?: string | null;
  online?: boolean;
  size?: number;
  ringWidth?: number;
  showOnlineDot?: boolean;
  onlineRingColor?: string;
}) {
  const g = useMemo(() => avatarGradientFor(id), [id]);
  const gradId = useMemo(() => `grad-${id.replace(/[^a-zA-Z0-9_-]/g, "")}`, [id]);
  const initial = (name || "·").trim()[0]?.toUpperCase() ?? "·";
  const dotSize = Math.max(10, Math.round(size * 0.24));

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="rounded-full flex items-center justify-center text-white font-semibold select-none"
        style={{
          width: size,
          height: size,
          background: `linear-gradient(135deg, ${g.from}, ${g.to})`,
          fontSize: Math.round(size * 0.4),
        }}
        aria-hidden
      >
        {initial}
      </div>
      <svg
        className="absolute pointer-events-none"
        style={{ top: -2, left: -2 }}
        width={size + 4}
        height={size + 4}
        viewBox={`0 0 ${size + 4} ${size + 4}`}
        aria-hidden
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={g.ringFrom} />
            <stop offset="100%" stopColor={g.ringTo} />
          </linearGradient>
        </defs>
        <circle
          cx={(size + 4) / 2}
          cy={(size + 4) / 2}
          r={(size + 4) / 2 - ringWidth / 2 - 0.5}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={ringWidth}
        />
      </svg>
      {showOnlineDot && online && (
        <span
          className="absolute rounded-full"
          style={{
            width: dotSize,
            height: dotSize,
            bottom: 0,
            right: 0,
            background: "#6dbf6a",
            border: `2px solid ${onlineRingColor}`,
          }}
        />
      )}
    </div>
  );
});
