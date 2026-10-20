import { initials } from "@/lib/api";
import { useMediaUrl } from "@/lib/media";
import { useState } from "react";

export function UserAvatar({ src, name, className = "h-11 w-11" }: { src: string | null | undefined; name: string | null | undefined; className?: string }) {
  const url = useMediaUrl(src);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (url && url !== failedUrl) return <img src={url} alt="" onError={() => setFailedUrl(url)} className={`${className} shrink-0 rounded-full object-cover`} />;
  return <span className={`${className} grid shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-bold text-accent-foreground`}>{initials(name)}</span>;
}

export function MediaImage({ src, className }: { src: string | null | undefined; className?: string }) {
  const url = useMediaUrl(src);
  if (!src) return null;
  if (!url) return <div className={`${className} animate-pulse bg-muted`} />;
  return <img src={url} alt="" loading="lazy" className={className} />;
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="space-y-4" aria-label={label}>
      {[0, 1, 2].map((i) => (
        <div key={i} className="card-surface animate-pulse p-5">
          <div className="flex gap-3"><div className="h-11 w-11 rounded-full bg-muted" /><div className="flex-1 space-y-2"><div className="h-4 w-1/3 rounded bg-muted" /><div className="h-3 w-1/4 rounded bg-muted" /></div></div>
          <div className="mt-4 h-4 w-5/6 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

export function ErrorBox({ text = "We couldn't load this right now.", onRetry }: { text?: string; onRetry?: () => void }) {
  return (
    <div className="card-surface p-8 text-center">
      <p className="text-muted-foreground">{text}</p>
      {onRetry && <button onClick={onRetry} className="mt-3 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Try again</button>}
    </div>
  );
}

export function Empty({ title, text }: { title: string; text?: string }) {
  return (
    <div className="card-surface p-8 text-center">
      <p className="text-lg font-bold">{title}</p>
      {text && <p className="mt-1 text-muted-foreground">{text}</p>}
    </div>
  );
}
