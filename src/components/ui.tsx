import Link from "next/link";

export function DeskBar({ action }: { action?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b border-[#5ee7ff]/15 bg-[#04070e]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-3">
          <Mark className="h-12 w-12 text-navy" />
          <span>
            <span className="block font-serif text-[1.35rem] leading-none tracking-[-0.03em] text-ink">Witness</span>
            <span className="mt-[5px] flex items-center gap-1.5">
              <span className="h-px w-2.5 bg-navy" />
              <span className="font-mono text-[9px] uppercase tracking-[0.32em] text-navy">City desk</span>
            </span>
          </span>
        </Link>
        {action}
      </div>
    </header>
  );
}

function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M1 32Q32-16 63 32Q32 80 1 32ZM6 32Q32-6 58 32Q32 70 6 32ZM16.5 32a15.5 15.5 0 1 0 31 0 15.5 15.5 0 1 0-31 0ZM20.2 31.5h6.6V39h-6.6ZM21.2 28.5h4.6v3h-4.6ZM28.2 29h8V39h-8ZM29.8 23h4.8v6h-4.8ZM31.2 19.8h2V23h-2ZM37.6 32.5h6V39h-6Z"
      />
    </svg>
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
