export const NODE_COUNT = 36;

const NODES = Array.from({ length: NODE_COUNT }, (_, id) => {
  const col = id % 6;
  const row = Math.floor(id / 6);
  const jitterX = ((id * 17) % 11) - 5;
  const jitterY = ((id * 13) % 9) - 4;
  return { id, x: 110 + col * 170 + jitterX * 6, y: 90 + row * 105 + jitterY * 5 };
});

const LINKS: [number, number][] = [];
for (const node of NODES) {
  const near = NODES.filter((other) => other.id !== node.id)
    .map((other) => ({ id: other.id, distance: Math.hypot(node.x - other.x, node.y - other.y) }))
    .filter((other) => other.distance < 240)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 2);
  for (const other of near) {
    if (other.id > node.id) LINKS.push([node.id, other.id]);
  }
}

const BY_ID = new Map(NODES.map((node) => [node.id, node]));

export function ClipField({
  gone,
  scanning = false,
  flare = false,
}: {
  gone: Set<number>;
  scanning?: boolean;
  flare?: boolean;
}) {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 1120 740"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <filter id="node-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {LINKS.map(([from, to]) => {
        const a = BY_ID.get(from);
        const b = BY_ID.get(to);
        if (!a || !b) return null;
        const live = !gone.has(from) && !gone.has(to);
        return (
          <line
            key={`${from}-${to}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={live ? "#5ee7ff" : "#143044"}
            strokeWidth={live ? 1.4 : 1}
            strokeOpacity={live ? (scanning || flare ? 0.85 : 0.35) : 0.35}
            className={live && scanning ? "link-flow" : undefined}
          />
        );
      })}
      {NODES.map((node) => {
        const live = !gone.has(node.id);
        const hot = live && (scanning || flare);
        return (
          <g key={node.id} className={hot ? "node-hot" : live ? "node-live" : undefined} style={{ animationDelay: `${(node.id % 8) * 80}ms` }}>
            {live ? (
              <circle cx={node.x} cy={node.y} r={hot ? 18 : 13} fill="none" stroke="#5ee7ff" strokeOpacity={hot ? 0.55 : 0.28} />
            ) : null}
            <circle
              cx={node.x}
              cy={node.y}
              r={live ? (hot ? 6.5 : 4.5) : 2.5}
              fill={live ? (flare ? "#f4fdff" : "#5ee7ff") : "#163246"}
              filter={live ? "url(#node-glow)" : undefined}
            />
          </g>
        );
      })}
    </svg>
  );
}
