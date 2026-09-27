import React from 'react';
import { isChunkLoadError, tryChunkReload } from '../../lib/pwa/chunkReload';

interface State { hasError: boolean; error?: Error; info?: string; recovering?: boolean; }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode; fallback?: React.ReactNode }, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(error: Error) {
    // Stale-chunk failures self-heal via a guarded reload — render a neutral placeholder
    // (not the red error screen) while we decide/reload.
    return { hasError: true, error, recovering: isChunkLoadError(error) };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info?.componentStack);
    // Safety net: if a stale-chunk error bubbled all the way here (not caught by
    // lazyWithRetry), attempt one guarded silent reload before showing any fallback.
    if (isChunkLoadError(error) && tryChunkReload()) return;
    this.setState({ info: info?.componentStack || '', recovering: false });
  }
  private reset = () => this.setState({ hasError: false, error: undefined, info: undefined, recovering: false });
  render() {
    if (this.state.hasError) {
      // A chunk-reload is in flight (or being decided) — don't flash the red screen.
      if (this.state.recovering) {
        return (
          <div className="flex items-center justify-center min-h-[240px] p-6">
            <div className="h-6 w-6 rounded-full border-2 border-neutral-300 border-t-primary animate-spin" />
          </div>
        );
      }
      if (this.props.fallback) return this.props.fallback;
      const msg = this.state.error?.message || String(this.state.error || 'Unknown error');
      const stack = `${this.state.error?.stack || ''}\n${this.state.info || ''}`.trim();
      return (
        <div className="flex flex-col items-center justify-center gap-3 min-h-[240px] p-6 text-center">
          <p className="text-[14px] font-semibold text-red-500">Something went wrong.</p>
          <p className="text-[12px] font-mono text-neutral-600 dark:text-neutral-300 max-w-lg break-words">{msg}</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={this.reset}
              className="h-8 px-3 text-[12px] font-medium rounded border border-neutral-300 dark:border-white/[0.12] text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/[0.06]"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="h-8 px-3 text-[12px] font-medium rounded bg-primary text-white hover:opacity-90"
            >
              Reload page
            </button>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(`${msg}\n\n${stack}`)}
              className="h-8 px-3 text-[12px] font-medium rounded border border-neutral-300 dark:border-white/[0.12] text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/[0.06]"
            >
              Copy details
            </button>
          </div>
          {stack && (
            <details className="w-full max-w-lg text-left">
              <summary className="text-[11px] text-neutral-400 cursor-pointer select-none">Technical details</summary>
              <pre className="mt-2 max-h-48 overflow-auto text-[10.5px] leading-relaxed font-mono text-neutral-500 dark:text-neutral-400 whitespace-pre-wrap bg-neutral-50 dark:bg-white/[0.03] rounded p-2 border border-neutral-200 dark:border-white/[0.06]">{stack}</pre>
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
