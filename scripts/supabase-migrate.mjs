/**
 * Supabase migration runner (cloud-direct architecture).
 * Applies every supabase/migrations/*.sql file, in numeric order, via the Management API
 * database/query endpoint. A public._migrations ledger prevents re-running an applied file.
 *
 * Usage:
 *   node scripts/supabase-migrate.mjs          # apply pending migrations
 *   node scripts/supabase-migrate.mjs --status # list applied/pending
 *
 * Requires .env.local: SUPABASE_MGMT_API_KEY, SUPABASE_REF.
 */

import fs from 'fs';
import path from 'path';

const DEFAULT_ENV_FILE = path.resolve(process.cwd(), '.env.local');
const MIGRATIONS_DIR = path.resolve(process.cwd(), 'supabase/migrations');
const API = 'https://api.supabase.com/v1';

function parseEnv(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i > 0) env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return env;
}

function findEnvTargets() {
  const targets = [];
  const seenRefs = new Set();

  const add = (filePath, defaultLabel) => {
    if (!fs.existsSync(filePath)) return;
    const env = parseEnv(filePath);
    const ref = env.SUPABASE_REF;
    const key = env.SUPABASE_MGMT_API_KEY;
    if (ref && key && !seenRefs.has(ref)) {
      seenRefs.add(ref);
      targets.push({
        label: env.SUPABASE_PROJECT_NAME || defaultLabel || path.basename(filePath),
        file: filePath,
        ref,
        key,
      });
    }
  };

  const envBackupsDir = path.resolve(process.cwd(), 'env backups');
  if (fs.existsSync(envBackupsDir)) {
    for (const f of fs.readdirSync(envBackupsDir)) {
      if (f.endsWith('.env') || f.endsWith('.backup') || f.includes('.env')) {
        add(path.join(envBackupsDir, f), f);
      }
    }
  }

  add(DEFAULT_ENV_FILE, '.env.local');
  return targets;
}

async function runSql(ref, key, query) {
  const res = await fetch(`${API}/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`SQL failed (HTTP ${res.status}): ${text}`);
  try { return JSON.parse(text); } catch { return text; }
}

async function ensureLedger(ref, key) {
  await runSql(ref, key, `
    create table if not exists public._migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    );`);
}

async function appliedSet(ref, key) {
  const rows = await runSql(ref, key, `select name from public._migrations order by name;`);
  return new Set((Array.isArray(rows) ? rows : []).map((r) => r.name));
}

function migrationFiles() {
  return fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
}

async function migrateTarget(target, isStatusOnly = false) {
  console.log(`\n======================================================`);
  console.log(`📦 Project: ${target.label} (${target.ref})`);
  console.log(`📄 File:    ${path.relative(process.cwd(), target.file)}`);
  console.log(`======================================================`);

  await ensureLedger(target.ref, target.key);
  const applied = await appliedSet(target.ref, target.key);
  const files = migrationFiles();

  if (isStatusOnly) {
    for (const f of files) console.log(`${applied.has(f) ? '[x]' : '[ ]'} ${f}`);
    return { target, applied: applied.size, total: files.length, newlyApplied: 0 };
  }

  let count = 0;
  for (const f of files) {
    if (applied.has(f)) {
      console.log(`skip  ${f} (already applied)`);
      continue;
    }
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8');
    process.stdout.write(`apply ${f} ... `);
    await runSql(target.ref, target.key, sql);
    await runSql(target.ref, target.key, `insert into public._migrations(name) values ('${f}') on conflict do nothing;`);
    console.log('ok');
    count++;
  }

  console.log(count ? `✅ Applied ${count} migration(s).` : `✅ Up to date (all ${files.length} migrations applied).`);
  return { target, applied: applied.size + count, total: files.length, newlyApplied: count };
}

async function main() {
  const isStatus = process.argv.includes('--status');
  const isAll = process.argv.includes('--all');
  const envArgIdx = process.argv.indexOf('--env');
  const specificEnv = envArgIdx !== -1 && process.argv[envArgIdx + 1] ? process.argv[envArgIdx + 1] : null;

  let targets = [];

  if (specificEnv) {
    const env = parseEnv(path.resolve(process.cwd(), specificEnv));
    if (!env.SUPABASE_REF || !env.SUPABASE_MGMT_API_KEY) {
      console.error(`ERROR: SUPABASE_REF and SUPABASE_MGMT_API_KEY required in ${specificEnv}`);
      process.exit(1);
    }
    targets = [{
      label: env.SUPABASE_PROJECT_NAME || path.basename(specificEnv),
      file: path.resolve(process.cwd(), specificEnv),
      ref: env.SUPABASE_REF,
      key: env.SUPABASE_MGMT_API_KEY,
    }];
  } else if (isAll) {
    targets = findEnvTargets();
  } else {
    // Default: if .env.local exists, use it. Otherwise, migrate all found targets.
    const defaultEnv = parseEnv(DEFAULT_ENV_FILE);
    if (defaultEnv.SUPABASE_REF && defaultEnv.SUPABASE_MGMT_API_KEY) {
      targets = [{
        label: defaultEnv.SUPABASE_PROJECT_NAME || '.env.local',
        file: DEFAULT_ENV_FILE,
        ref: defaultEnv.SUPABASE_REF,
        key: defaultEnv.SUPABASE_MGMT_API_KEY,
      }];
    } else {
      targets = findEnvTargets();
    }
  }

  if (targets.length === 0) {
    console.error('ERROR: No valid Supabase projects found in .env.local or "env backups/".');
    process.exit(1);
  }

  console.log(`Starting migration runner for ${targets.length} project(s)...`);
  const results = [];
  for (const t of targets) {
    try {
      const res = await migrateTarget(t, isStatus);
      results.push(res);
    } catch (e) {
      console.error(`❌ Failed migrating ${t.label} (${t.ref}):`, e.message);
      results.push({ target: t, error: e.message });
    }
  }

  console.log(`\n======================================================`);
  console.log(`📊 Multi-Project Migration Summary:`);
  for (const r of results) {
    if (r.error) {
      console.log(`  ❌ ${r.target.label}: FAILED — ${r.error}`);
    } else {
      console.log(`  ✅ ${r.target.label}: ${r.applied}/${r.total} migrations (${r.newlyApplied} newly applied)`);
    }
  }
  console.log(`======================================================\n`);
}

main().catch((e) => { console.error('\nMigration failed:', e.message); process.exit(1); });
