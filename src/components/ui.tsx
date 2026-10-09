import Link from "next/link";

export function DeskBar({ action }: { action?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-[#070b10]/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center rounded-md border border-navy/40 bg-navy/10 font-mono text-[11px] font-medium text-navy">
            W
          </span>
          <span>
            <span className="block text-sm font-semibold tracking-tight">Witness</span>
            <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Restricted desk</span>
          </span>
        </Link>
        {action}
      </div>
    </header>
  );
}

export function VideoFrame({ source, label }: { source: string; label?: string }) {
  const src = `/api/stream?source=${encodeURIComponent(source)}`;
  return (
    <div className="overflow-hidden rounded-xl bg-black ring-1 ring-white/10">
      <video key={src} className="aspect-video w-full bg-black" controls playsInline preload="metadata" aria-label={label}>
        <source src={src} type="video/mp4" />
      </video>
    </div>
  );
}
