/**
 * exportSave test — proves the shared file-save primitive actually delivers a file on the
 * web/desktop path (the recurring "export does nothing" complaint). Guards against a
 * regression to the old browser-only no-op: if saveFile stops invoking a real download/
 * share mechanism, this fails the build.
 *
 * Run: npx tsx tests/exportSave.test.mjs   (or: npm test)
 */

let passed = 0;
const assert = (c, m) => { if (!c) throw new Error(`ASSERT FAILED: ${m}`); passed++; console.log(`  ok - ${m}`); };

async function main() {
  console.log('exportSave — cross-platform file delivery');

  // Import BEFORE mocking globals so tsx's own module resolver (which uses the real URL
  // constructor) is untouched.
  const { saveFile } = await import('../src/shared/export/saveFile.ts');

  // ─── Minimal browser globals: non-Capacitor, non-standalone desktop/web ───
  let clicked = false;
  let createdUrl = false;
  let revokedUrl = false;
  const anchor = { href: '', download: '', rel: '', style: {}, click() { clicked = true; } };

  globalThis.window = {
    Capacitor: undefined,
    matchMedia: () => ({ matches: false }),
    navigator: { standalone: false },
  };
  globalThis.document = {
    createElement: (tag) => (tag === 'a' ? anchor : {}),
    body: { appendChild() {}, removeChild() {} },
  };
  // Augment (do NOT replace) the real URL so tsx keeps working.
  globalThis.URL.createObjectURL = () => { createdUrl = true; return 'blob:mock'; };
  globalThis.URL.revokeObjectURL = () => { revokedUrl = true; };
  globalThis.Blob = class { constructor(parts, opts) { this.parts = parts; this.type = opts?.type || ''; } };

  // Web/desktop (no Capacitor, not standalone) → must use a real anchor download.
  const res = await saveFile(new Blob(['a,b,c'], { type: 'text/csv' }), 'report.csv', 'text/csv');

  assert(res.method === 'download', "web/desktop path resolves to a real 'download' (not a no-op)");
  assert(createdUrl === true, 'a blob object URL was created for the download');
  assert(clicked === true, 'the download anchor was actually clicked (file delivered)');
  assert(anchor.download === 'report.csv', 'the download uses the correct filename');

  // Give the deferred revoke (setTimeout) a tick, then confirm cleanup wiring exists.
  await new Promise((r) => setTimeout(r, 1600));
  assert(revokedUrl === true, 'the blob URL is revoked after download (no leak)');

  console.log(`\nAll ${passed} assertions passed.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
