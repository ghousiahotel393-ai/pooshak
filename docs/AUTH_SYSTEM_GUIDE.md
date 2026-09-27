# Auth System — Complete Portable Guide

> A self-contained, copy-into-any-project guide for the **username/password staff-account
> auth system** used in this POS. It is **Supabase-only, cloud-direct, server-authoritative**
> with a **local SQLite mirror + write-through sync queue**. No license keys, no P2P, no
> Supabase-Auth user sessions — the client uses the Supabase **ANON key**, and every staff
> credential is a **PBKDF2-SHA256 hash** stored in a synced `staff_users` table.
>
> This document covers: architecture, DB schema, crypto, the single write path (save/update),
> **create / edit / delete / change-password / recovery**, RBAC, the React context, the
> Supabase side (RLS + `apply_bundle` + verify), and a **step-by-step port checklist**.

---

## 0. Mental model (read this first)

```
┌─────────────────────────────────────────────────────────────────────┐
│ UI (React)                                                            │
│   PinLoginPage / FastLockModal / UserModal / PinChange                │
│        │  useAuth().signInWithPin(pin, identifier)                    │
│        ▼                                                              │
│ AuthContext  ── loginWithPin() / createUser() / updateUser() ...      │
│        │                                                              │
│        ▼                                                              │
│ localAuthService + userRepository   (business logic)                  │
│        │  hashPin() / verifyPin()  (pinCrypto — PBKDF2)               │
│        ▼                                                              │
│ Write path:  insertRow / updateRow  → atomicWrite → ONE sync_queue    │
│        │                                bundle (one operation_id)     │
│        ▼                                                              │
│ Local SQLite mirror  (staff_users)   ← reads are always local (fast)  │
│        │                                                              │
│        ▼  (background sync worker)                                    │
│ Supabase Postgres  ── apply_bundle(RPC, idempotent) → staff_users     │
│        ▲  (pull worker: server → mirror on every device)              │
└─────────────────────────────────────────────────────────────────────┘
```

Key decisions:

- **Login verification happens on-device** against the locally-mirrored `staff_users.password_hash`.
  This makes login **100% offline-accurate** and instant. The cloud is the source of truth; the
  mirror is kept in sync both ways (push + pull).
- **Passwords/PINs are never stored or transmitted in plaintext.** Only the PBKDF2 hash string
  (`salt:hash:fallback`) is stored, and it syncs like any other row.
- **One write path.** Every create/update/delete of a user goes through `insertRow`/`updateRow`
  (thin wrappers over `atomicWrite`) → local SQLite transaction + one `sync_queue` bundle →
  pushed to Supabase via the idempotent `apply_bundle` RPC. Never write `staff_users` any other way.
- **Auth is app-level, not Supabase-Auth.** The client talks to Supabase with the ANON key and no
  user session. RLS grants `anon` CRUD (acceptable for a single-shop product; see §11 Security).

---

## 1. Files that make up the system

Copy these into the new project (paths are from this repo):

| File | Responsibility |
|---|---|
| `src/lib/auth/pinCrypto.ts` | PBKDF2 hashing + verify, recovery-code generation |
| `src/lib/auth/localAuthService.ts` | login, lockout, first-launch, bootstrap admin, recovery reset |
| `src/lib/auth/recoveryService.ts` | change PIN, rotate recovery code, admin PIN reset |
| `src/lib/auth/actor.ts` | `resolveActorName(profile)` → who-did-it string for audit rows |
| `src/lib/services/users/userRepository.ts` | create/update/delete(disable)/list users + role/permission mapping |
| `src/lib/permissions.ts` | RBAC matrix + `can(role, action)` |
| `src/context/AuthContext.tsx` | React provider: `useAuth()`, session persistence |
| `src/data/writeThrough.ts` | `insertRow` / `updateRow` / `softDeleteRow` / `atomicWrite` |
| `src/data/localSchema.ts` | local SQLite schema + `SYNCED_TABLES` allowlist |
| `supabase/migrations/0007_users_roles_security.sql` | cloud `roles` + `staff_users` + `audit_logs` + default admin |
| `supabase/migrations/0008_rls_policies.sql` | RLS enable + policy for every table |

Dependencies: `@noble/hashes` (pure-JS PBKDF2 fallback), `@supabase/supabase-js`, and your
SQLite driver (this project uses sql.js/wasm + Capacitor/Electron native SQLite).

---

## 2. Data model

### 2.1 Cloud (Postgres) — `supabase/migrations/0007_users_roles_security.sql`

```sql
-- roles: config (non-additive)
create table if not exists public.roles (
  id           uuid primary key,
  operation_id uuid not null unique,       -- idempotency (see §4)
  code         text not null unique,       -- 'admin' | 'manager' | 'cashier' | 'salesman'
  name         text not null,
  permissions  text not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- staff_users: the auth table (non-additive)
create table if not exists public.staff_users (
  id                  uuid primary key,
  operation_id        uuid not null unique,   -- idempotency
  username            text not null unique,
  password_hash       text not null,          -- "salt:pbkdf2Hex:fallbackSha256" — NEVER plaintext
  role                text not null default 'cashier',
  full_name           text,
  email               text,
  avatar              text,
  is_active           integer not null default 1,   -- 0 = disabled (soft delete)
  can_view_expiry     integer not null default 1,
  require_pin_on_sale integer not null default 0,
  permissions         text not null default '{}',   -- per-user privilege JSON (added by later migration)
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_staff_users_username on public.staff_users(username);

-- server-clock updated_at (authoritative pull cursor)
create trigger trg_staff_users_updated_at before insert or update on public.staff_users
  for each row execute function public.set_updated_at();

-- audit_logs: append-only trail (optional but recommended)
create table if not exists public.audit_logs (
  id uuid primary key, operation_id uuid not null unique,
  user_id uuid, device_id text, action text not null,
  entity_type text, entity_id uuid, details text,
  created_at timestamptz not null default now()
);
```

**Default admin seed** (a *normal, editable* row — not hardcoded in app logic). `username='admin'`,
password `'admin'`, with a precomputed PBKDF2 hash compatible with `pinCrypto.ts`:

```sql
insert into public.staff_users (id, operation_id, username, password_hash, role, full_name,
  is_active, can_view_expiry, require_pin_on_sale, created_at, updated_at)
values (
  '33333333-3333-4333-8333-000000000001',
  '33333333-3333-4333-8333-a00000000001',
  'admin',
  '0123456789abcdef0123456789abcdef:ff4c24ac...4983:bb70727b...4390',  -- salt:pbkdf2:fallback for "admin"
  'admin', 'Administrator', 1, 1, 0, now(), now()
) on conflict (id) do nothing;
```

> To generate a seed hash for a different default password, run `hashPin('yourpassword', '0123456789abcdef0123456789abcdef')`
> (fixed salt) and paste the returned `fullHash`.

### 2.2 Local SQLite mirror — `src/data/localSchema.ts`

Mirror the cloud schema **1:1** (same table/column names) and register the table so it syncs:

```ts
CREATE TABLE IF NOT EXISTS staff_users (
  id TEXT PRIMARY KEY, operation_id TEXT UNIQUE, username TEXT NOT NULL,
  password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'cashier',
  full_name TEXT, email TEXT, avatar TEXT,
  is_active INTEGER NOT NULL DEFAULT 1, can_view_expiry INTEGER NOT NULL DEFAULT 1,
  require_pin_on_sale INTEGER NOT NULL DEFAULT 0, permissions TEXT NOT NULL DEFAULT '{}',
  created_at TEXT, updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_staff_users_username ON staff_users(username);

// allowlist → pushed AND pulled automatically
export const SYNCED_TABLES = [ /* ... */ 'roles', 'staff_users', 'audit_logs' ];
```

The `password_hash` format is three colon-separated parts: **`salt : pbkdf2Hex : fallbackSha256`**.

---

## 3. Cryptography — `src/lib/auth/pinCrypto.ts`

PBKDF2-SHA256, 100,000 iterations, 256-bit. Works in three environments (in priority order at
verify time): WebCrypto `crypto.subtle`, pure-JS `@noble/hashes` PBKDF2, and a fast SHA-256
fallback (so a hash created on a desktop still verifies on a mobile browser over plain HTTP LAN).

```ts
const PBKDF2_ITERATIONS = 100_000;
const KEY_LENGTH_BITS = 256;

// hash → "salt:pbkdf2Hex:fallbackSha256"
export async function hashPin(pin: string, existingSalt?: string):
  Promise<{ fullHash: string; salt: string; hash: string }> {
  const salt = existingSalt || generateSalt();
  const fallback = await sha256Hex(`PIN_SECURE_V1:${salt}:${pin}`);
  // WebCrypto PBKDF2 (falls back to @noble/hashes if crypto.subtle is unavailable)
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial, KEY_LENGTH_BITS);
  const hash = toHex(new Uint8Array(derivedBits));
  return { fullHash: `${salt}:${hash}:${fallback}`, salt, hash };
}

// verify against any of the 3 parts, constant-time compare
export async function verifyPin(pin: string, storedHashOrFull: string): Promise<boolean> { /* ... */ }

// 24-char emergency recovery code: XXXX-XXXX-XXXX-XXXX-XXXX-XXXX (Base32, no ambiguous chars)
export function generateRecoveryCode(): string { /* ... */ }
export async function hashRecoveryCode(code: string): Promise<string> { /* uses hashPin */ }
export async function verifyRecoveryCode(code: string, storedFullHash: string): Promise<boolean> { /* ... */ }
```

Copy this file **verbatim** — it has no app-specific dependencies except `@noble/hashes` and a
`sha256Hex` helper (a 3-line wrapper over `@noble/hashes/sha2`).

---

## 4. The single write path (SAVE / UPDATE) — `src/data/writeThrough.ts`

**Never** write `staff_users` with a raw SQL `INSERT/UPDATE` or a raw `supabase.from().insert()`.
Everything goes through these wrappers so it (a) commits atomically to local SQLite and (b) enqueues
exactly one sync bundle carrying a unique `operation_id` for idempotent cloud replay.

```ts
// INSERT one row as a one-op bundle (auto-fills id/operation_id/timestamps)
export async function insertRow<T>(table: SyncedTable, row: T): Promise<T & { id: string; operation_id: string }> {
  const operation_id = row.operation_id ?? safeRandomUUID();
  const result = await atomicWrite([{ table, op: 'insert', row: { ...row, operation_id } }],
    { operation_id, action: `insert_${table}` });
  return result.rows[0].payload;
}

// UPDATE a non-additive row by id as a one-op bundle
export async function updateRow<T>(table: SyncedTable, id: string, patch: T): Promise<void> {
  await atomicWrite([{ table, op: 'update', id, patch }], { action: `update_${table}` });
}

// SOFT delete (is_active = 0) — synced deletes must be tombstones, never hard DELETE
export async function softDeleteRow(table, id, activeColumn = 'active') { /* sets column = 0 */ }
```

`atomicWrite`: opens ONE SQLite transaction (serialized through a global mutex), applies all row
ops, writes ONE `sync_queue` entry, commits. Any error rolls back everything (no half-saved rows).
The background **sync worker** pushes each queued bundle as one `apply_bundle` RPC and retries on
network/5xx with the **same** `operation_id`.

---

## 5. Operations with full examples

All the following are already implemented in `userRepository.ts` / `localAuthService.ts` /
`recoveryService.ts`. Reads are always local (`localQuery`/`localQueryOne`); writes always go
through `insertRow`/`updateRow`.

### 5.1 First-launch bootstrap (create the first admin)

```ts
// localAuthService.ts
export async function bootstrapAdmin(config: SetupConfig): Promise<{ user: User; recoveryCode: string }> {
  const recoveryCode = generateRecoveryCode();
  const recoveryHash = await hashRecoveryCode(recoveryCode);
  localStorage.setItem('pos_master_recovery_hash', recoveryHash);   // device-local emergency reset
  // (optional) create store_settings row here
  const user = await createUser({
    name: config.adminName, username: config.adminUsername.toLowerCase(),
    pin: config.adminPin, role: 'admin',
  });
  return { user, recoveryCode };   // SHOW the recoveryCode ONCE, tell the user to save it
}
```

### 5.2 Create a user (ADD)

```ts
// userRepository.ts — createUser()
const { fullHash } = await hashPin(input.pin);          // hash first, never store plaintext
const row = await insertRow('staff_users', {
  username: input.username.trim().toLowerCase(),
  password_hash: fullHash,
  role: input.role,                                     // 'admin'|'manager'|'cashier'|'salesman'
  full_name: input.name.trim(),
  email: input.email?.trim() || null,
  avatar: input.avatar || null,
  is_active: 1,
  permissions: JSON.stringify(buildPermissions(input)), // per-user privilege overrides (JSON)
});
return mapRowToUser(row);
```
Guards: username required + unique (checked against the local mirror), password ≥ 4 chars.

### 5.3 Edit a user (name / role / status / per-user privileges)

```ts
// userRepository.ts — updateUser() builds a patch of only-changed columns, then:
await updateRow('staff_users', id, patch);
// role-only helper:
await updateUserRole(id, 'manager');
```
Per-user privilege flags (`canEditPrice`, `canGiveDiscount`, …) are merged into the
`permissions` JSON column so they sync to every device and override the role default.

### 5.4 Change password / reset PIN

```ts
// Self-service (verifies the CURRENT pin first) — recoveryService.changeUserPin()
export async function changeUserPin(userId, currentPin, newPin) {
  const row = await localQueryOne(`SELECT password_hash FROM staff_users WHERE id=?`, [userId]);
  if (!(await verifyPin(currentPin, row.password_hash))) throw new Error('Current PIN is incorrect.');
  const { fullHash } = await hashPin(newPin);
  await updateRow('staff_users', userId, { password_hash: fullHash });
}

// Admin reset (no current PIN needed) — userRepository.resetUserPin()
export async function resetUserPin(id, newPin) {
  const { fullHash } = await hashPin(newPin);
  await updateRow('staff_users', id, { password_hash: fullHash });
}
```

### 5.5 Delete / disable a user

Synced tables use **soft delete** (a tombstone), never a hard `DELETE`, so the change propagates to
other devices via pull (a hard delete would never reach them):

```ts
// disable (recommended) — keeps history intact, blocks login (login filters is_active = 1)
await setUserStatus(id, false);        // → updateRow('staff_users', id, { is_active: 0 })
// re-enable
await setUserStatus(id, true);
```
Local reads filter `WHERE is_active = 1`. Never physically remove a synced row.

### 5.6 Login + lockout

```ts
// localAuthService.loginWithPin(pin, identifier?)
//  - identifier given → look up by id/username/full_name/email, verify that row
//  - no identifier    → scan active users, find the one whose hash matches the pin
//  - 5 failed attempts → 30s lockout
const isValid = await verifyPin(pin, userRow.password_hash);

// React usage:
const { signInWithPin } = useAuth();
await signInWithPin(enteredPin, usernameOrUserId);   // throws on invalid → show toast
```

### 5.7 Verify PIN for a sensitive action (checkout override, void, etc.)

```ts
const ok = await verifyUserPin(userId, enteredPin);   // localAuthService — hash compare against staff_users
if (!ok) throw new Error('PIN verification failed');
```

### 5.8 Emergency recovery (lost admin PIN)

```ts
// resets ALL admin PINs after verifying the recovery code stored on this device
await resetAdminPinWithRecoveryCode(recoveryCode, newPin);
// rotate the recovery code (admin re-auth) → recoveryService.rotateRecoveryCode(adminPin)
```

---

## 6. RBAC — `src/lib/permissions.ts`

Single source of truth: a `Role → Permission → boolean` matrix plus a fail-closed `can()`:

```ts
export type Role = 'admin' | 'manager' | 'cashier' | 'salesman';
export function can(role: string | undefined | null, action: Permission): boolean {
  if (!role || !(role in PERMISSIONS)) return false;   // unknown role → DENY
  return PERMISSIONS[role as Role][action] === true;
}
```

Two enforcement layers:
1. **App layer** — a `RequireAccess` route guard + boolean flags (UX/instant). Bypassable.
2. **Server layer** — RPC role guards + RLS. Not bypassable. (In this single-shop build RLS is
   permissive for `anon`; harden per §11 for multi-tenant.)

```tsx
function RequireAccess({ action, children }: { action: Permission; children: React.ReactNode }) {
  const user = useUsersStore(s => s.currentUser);
  const allowed = !!user && user.active !== false && can(user.role, action);
  return allowed ? <>{children}</> : <Navigate to="/pos" replace />;
}
```

---

## 7. React integration — `src/context/AuthContext.tsx`

`AuthProvider` boots the DB + data layer, restores the saved session, and exposes `useAuth()`:

```ts
const { profile, loading, isFirstLaunch,
        signInWithPin, signOut, updateProfile, updatePassword } = useAuth();
```

- On mount: `initDb()` → `initDataLayer()` (mirror + push/pull workers) → `isFirstLaunch()`
  (if online and the mirror looks empty, it polls `pullNow()` up to ~12s so a fresh device waits
  for the first pull of `staff_users` before showing First-Time Setup).
- Session persistence: `localStorage['pos_active_user_id']` (+ session start). On boot it re-loads
  that user from the mirror and restores it if still `active`.
- `signOut()` just clears the in-memory + stored session (no server call needed).

---

## 8. Supabase side — save / update / verify

### 8.1 How a write reaches the cloud
1. `insertRow`/`updateRow` → local SQLite commit + one `sync_queue` bundle (`operation_id`).
2. Sync worker calls `supabase.rpc('apply_bundle', { ...bundle })`.
3. `apply_bundle` runs in **one Postgres transaction**, is **idempotent on `operation_id`** (a
   replay returns the original stored result instead of duplicating), and bumps `updated_at` via
   the `set_updated_at` trigger (server clock = authoritative pull cursor).
4. The pull worker (`pullSync`) pulls `staff_users` (and every `SYNCED_TABLES` entry) to every
   device on boot / interval / focus / reconnect, so a user created on Device A appears on Device B.

### 8.2 RLS — `supabase/migrations/0008_rls_policies.sql`
Every table (incl. `staff_users`) has RLS **enabled** with an explicit all-access policy for
`anon, authenticated` (single-shop model; the client uses the ANON key, no Supabase-Auth session).
The **service role** key (server-only) bypasses RLS.

```sql
alter table public.staff_users enable row level security;
create policy staff_users_all_access on public.staff_users
  for all to anon, authenticated using (true) with check (true);
```

### 8.3 Verify the cloud is correct
```sql
-- default admin present & hashed (never plaintext)
select username, role, is_active, left(password_hash, 20) || '…' as hash from public.staff_users;

-- no RLS-on table is missing a policy (must return zero rows)
select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r' and c.relrowsecurity
  and not exists (select 1 from pg_policy p where p.polrelid=c.oid);

-- cross-device: create a user on Device A, then on Device B:
select username, updated_at from public.staff_users order by updated_at desc;
```

---

## 9. Port-to-a-new-project checklist

1. **Install deps:** `@noble/hashes`, `@supabase/supabase-js`, your SQLite driver.
2. **Copy files** from §1 (keep relative paths or fix imports): `pinCrypto.ts`, `localAuthService.ts`,
   `recoveryService.ts`, `actor.ts`, `userRepository.ts`, `permissions.ts`, `AuthContext.tsx`, and the
   write/sync layer (`writeThrough.ts`, `syncQueue.ts`, `syncWorker.ts`, `pullSync.ts`, `localDb.ts`,
   `localSchema.ts`) — or your project's equivalent write-through + mirror layer.
3. **Cloud schema:** add migrations `0007` (roles + staff_users + audit_logs + default admin) and
   `0008` (RLS). Ensure a `set_updated_at()` trigger function exists. Ensure the `apply_bundle` RPC
   (idempotent on `operation_id`) exists — this is the generic bundle applier the sync worker calls.
4. **Local schema:** add the `staff_users` (+ `roles`, `audit_logs`) CREATE TABLE to `localSchema.ts`
   and add `'staff_users'`,`'roles'`,`'audit_logs'` to `SYNCED_TABLES`.
5. **Env:** put `SUPABASE_URL` + ANON key in `.env.local`. Run the migrations
   (`node scripts/supabase-migrate.mjs` or Supabase CLI).
6. **Wire the UI:** wrap the app in `<AuthProvider>`; render a login screen calling
   `signInWithPin`; gate routes with `RequireAccess` + `can()`; build a Users screen calling
   `createUser`/`updateUser`/`setUserStatus`/`resetUserPin`.
7. **Verify:** boot → default `admin`/`admin` logs in → create a user → it appears on a second
   device after pull → change its PIN → old PIN rejected, new PIN accepted → disable it → it can no
   longer log in. Run §8.3 SQL checks.

---

## 10. Do / Don't

- ✅ Always `hashPin()` before storing; store only `salt:hash:fallback`.
- ✅ Always write via `insertRow`/`updateRow` (one `operation_id` per action, idempotent replay).
- ✅ Soft-delete (`is_active = 0`) — never hard-`DELETE` a synced row.
- ✅ Read locally (`localQuery`) for instant, offline-accurate auth.
- ❌ No plaintext passwords anywhere (DB, logs, payloads).
- ❌ No raw `supabase.from('staff_users').insert/update/delete` and no raw SQL DML outside the
  write-through layer (add a guard test that fails the build if this appears).
- ❌ No hardcoded users/PINs in app logic — the default admin is a normal, editable DB row.

---

## 11. Security notes (important)

- This is a **single-shop** design: RLS grants the ANON key full CRUD, so anyone with the shipped
  ANON key can read/write these tables. That is acceptable **only** for single-tenant installs.
- **Hardening for multi-tenant / stricter deployments:** move to real **Supabase Auth** device
  sessions, revoke `anon`, and tighten policies to `auth.role() = 'authenticated'` (and per-tenant
  `tenant_id = auth.jwt() ->> 'tenant_id'`). The auth logic above (PBKDF2, staff_users, RBAC) stays
  the same; only the transport/RLS changes.
- PBKDF2 100k/SHA-256 is a reasonable local KDF; raise iterations for higher-value deployments.
- The emergency recovery **code hash** is device-local (`localStorage`) by design; treat the
  printed recovery code like a master key.
```
