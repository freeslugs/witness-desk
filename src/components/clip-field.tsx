const TILES = Array.from({ length: 42 }, (_, id) => ({
  id,
  hue: 198 + ((id * 13) % 36),
}));

export function flight(id: number) {
  const angle = ((id * 47) % 360) * (Math.PI / 180);
  const dist = 320 + (id % 5) * 70;
  return {
    "--dx": `${Math.round(Math.cos(angle) * dist)}px`,
    "--dy": `${Math.round(Math.sin(angle) * dist) - 120}px`,
    "--rot": `${(id % 2 === 0 ? -1 : 1) * (14 + (id % 18))}deg`,
    animationDelay: `${(id % 8) * 35}ms`,
  } as React.CSSProperties;
}

export function ClipField({ gone }: { gone: Set<number> }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="grid h-full grid-cols-3 gap-2 p-2 sm:grid-cols-4 sm:gap-3 sm:p-3 lg:grid-cols-6">
        {TILES.map((tile) => (
          <div
            key={tile.id}
            className={`relative min-h-24 overflow-hidden rounded-xl shadow-lg ${gone.has(tile.id) ? "tile-fly" : ""}`}
            style={{
              ...flight(tile.id),
              background: `linear-gradient(145deg, hsl(${tile.hue} 22% 28%), hsl(${tile.hue} 18% 12%))`,
            }}
          >
            <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,rgba(0,0,0,0.45))]" />
            <div className="absolute left-1/2 top-1/2 grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white">
              <span className="ml-0.5 text-xs">▶</span>
            </div>
            <span className="absolute left-2 top-2 text-[10px] font-medium tracking-wide text-white/70">CLIP {tile.id + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
