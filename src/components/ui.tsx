import Link from "next/link";

export function DeskBar({ action }: { action?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b border-[#5ee7ff]/15 bg-[#04070e]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="relative grid h-9 w-9 place-items-center text-navy">
            <svg viewBox="0 0 36 36" className="h-9 w-9" aria-hidden="true">
              <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeOpacity="0.35" />
              <circle cx="18" cy="18" r="6" fill="none" stroke="currentColor" />
              <path d="M18 2.5v4.5M18 29v4.5M2.5 18H7M29 18h4.5" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </span>
          <span>
            <span className="block text-sm font-semibold tracking-[0.18em] uppercase">Witness</span>
            <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-navy/80">City desk</span>
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
    <div className="overflow-hidden rounded-xl bg-black ring-1 ring-[#5ee7ff]/20">
      <video key={src} className="aspect-video w-full bg-black" controls playsInline preload="metadata" aria-label={label}>
        <source src={src} type="video/mp4" />
      </video>
    </div>
  );
}
