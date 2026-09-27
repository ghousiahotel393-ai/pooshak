import { lazy, type ComponentType } from 'react';
import { isChunkLoadError, tryChunkReload } from './chunkReload';

/**
 * lazyWithRetry — drop-in replacement for React.lazy that self-heals stale-chunk failures.
 *
 * When a code-split chunk fails to load (typically right after a deploy rotated the hashed
 * filenames), instead of throwing straight to the error boundary we trigger ONE silent,
 * guarded reload (see chunkReload). After the reload the fresh index.html + chunk manifest
 * load the correct file. If it STILL fails right after a reload (persistent), the error is
 * rethrown so the ErrorBoundary fallback shows — no infinite loop.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err) {
      if (isChunkLoadError(err) && tryChunkReload()) {
        // A reload was started; return a never-resolving promise so nothing renders/throws
        // in the brief moment before the page navigates away.
        return new Promise<{ default: T }>(() => {});
      }
      throw err;
    }
  });
}
