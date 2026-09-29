import React from 'react';
import { Search, ExternalLink, Loader2, ImageOff, Download, RotateCw } from 'lucide-react';
import { sonner } from '../lib/sonner';
import { cn } from '../lib/utils';
import { searchPhotos, PexelsError, type PexelsPhoto } from '../lib/services/pexelsService';
import { saveFromPexels } from '../lib/services/mediaService';

/**
 * Pexels search grid — used inside the Media picker. Search (debounced) or curated photos,
 * infinite "Load more", required credit on every card + a "Photos provided by Pexels" line.
 * "Use this image" downloads, compresses, saves to the Media library (bundle) and returns the
 * content hash (or the permanent Pexels link) to the caller. Needs an API key
 * (Settings → Integrations) and internet.
 */
export function PexelsSearchTab({ onPick }: { onPick: (imageValue: string) => void }) {
  const [query, setQuery] = React.useState('');
  const [photos, setPhotos] = React.useState<PexelsPhoto[]>([]);
  const [_page, setPage] = React.useState(1);
  const [nextPage, setNextPage] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [usingId, setUsingId] = React.useState<number | null>(null);
  const [failedId, setFailedId] = React.useState<number | null>(null);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const run = React.useCallback(async (q: string, p: number, append: boolean) => {
    setLoading(true); setError(null);
    try {
      const res = await searchPhotos(q, p);
      setPhotos((prev) => (append ? [...prev, ...res.photos] : res.photos));
      setNextPage(res.nextPage);
      setPage(res.page);
    } catch (e: any) {
      const msg = e instanceof PexelsError ? e.message : (e?.message || 'Search failed');
      setError(msg);
      if (!append) setPhotos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void run('', 1, false); }, [run]); // curated on open

  const onChange = (v: string) => {
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void run(v, 1, false), 400);
  };

  const use = async (photo: PexelsPhoto) => {
    setUsingId(photo.id);
    setFailedId(null);
    try {
      const asset = await saveFromPexels(photo);
      const value = asset.imageHash || asset.srcUrls.large || asset.srcUrls.large2x || asset.srcUrls.medium;
      if (value) { onPick(value); sonner.success('Image added to your library.'); }
      else { setFailedId(photo.id); sonner.error('Could not save this image.'); }
    } catch (e: any) {
      setFailedId(photo.id);
      sonner.error(e?.message || 'Failed to use image');
    } finally {
      setUsingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="sticky top-0 z-10 bg-white dark:bg-surface pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            value={query}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void run(query, 1, false); }}
            placeholder="Search Pexels photos… (e.g. jeans, coffee)"
            className="w-full h-9 pl-8 pr-3 rounded-md bg-neutral-50 dark:bg-app border border-neutral-200 dark:border-white/[0.08] text-[13px] text-neutral-900 dark:text-white focus:outline-none focus:border-primary"
          />
        </div>
        <a href="https://www.pexels.com/api" target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[11px] text-neutral-400 hover:text-primary">
          Photos provided by Pexels <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {error && (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
          <ImageOff className="w-6 h-6 text-neutral-400" />
          <p className="text-[13px] text-neutral-500 max-w-xs">{error}</p>
        </div>
      )}

      {!error && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {photos.map((p) => {
            const busy = usingId === p.id;
            const failed = failedId === p.id && !busy;
            return (
            <div key={p.id} className="group flex flex-col gap-1">
              {/*
                Select target is the ALWAYS-PRESENT card element (role=button), not the
                hover-reveal overlay. On touch there is no hover; gating the only tap target
                behind `group-hover` caused the "images show but can't be selected" bug (the
                first tap only applied synthetic :hover). The overlay is now purely visual —
                a single tap on the card fires `use()` on every device.
              */}
              <div
                role="button"
                tabIndex={0}
                aria-disabled={busy}
                aria-label={failed ? `Retry download: ${p.alt || 'Pexels photo'}` : `Use image: ${p.alt || 'Pexels photo'}`}
                onClick={() => { if (!busy) void use(p); }}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && !busy) { e.preventDefault(); void use(p); }
                }}
                className="relative aspect-square rounded-md overflow-hidden border border-neutral-200 dark:border-white/[0.08] cursor-pointer select-none"
                style={{ backgroundColor: p.avg_color || '#eee' }}
              >
                <img src={p.src.medium || p.src.tiny} alt={p.alt} loading="lazy" className="w-full h-full object-cover pointer-events-none" />
                {/* Always-visible corner affordance: download / spinner / retry (visual only;
                    the whole card is the tap target). */}
                <div
                  className={cn(
                    'absolute top-1.5 right-1.5 z-10 h-7 w-7 rounded-md flex items-center justify-center pointer-events-none shadow-sm ring-1 ring-white/20',
                    failed ? 'bg-rose-600 text-white' : 'bg-black/60 text-white'
                  )}
                >
                  {busy
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : failed
                      ? <RotateCw className="w-3.5 h-3.5" />
                      : <Download className="w-3.5 h-3.5" />}
                </div>
                {busy && <div className="absolute inset-0 bg-black/30 pointer-events-none" />}
                {failed && (
                  <div className="absolute inset-x-0 bottom-0 bg-rose-600/90 text-white text-[10px] font-medium text-center py-0.5 pointer-events-none">
                    Tap to retry
                  </div>
                )}
              </div>
              <a href={p.url} target="_blank" rel="noreferrer" className="text-[10px] text-neutral-400 hover:text-primary truncate" title={`Photo by ${p.photographer} on Pexels`}>
                Photo by <span className="underline">{p.photographer}</span>
              </a>
            </div>
            );
          })}
        </div>
      )}

      {loading && <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-neutral-400" /></div>}

      {!loading && !error && nextPage && (
        <button type="button" onClick={() => void run(query, (nextPage as number), true)} className="mx-auto my-2 rounded border border-neutral-200 dark:border-white/[0.08] px-3 py-1.5 text-[12px] hover:bg-neutral-50 dark:hover:bg-white/[0.04]">
          Load more
        </button>
      )}
    </div>
  );
}
