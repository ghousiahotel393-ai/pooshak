import type { User } from '../../types/user';

/**
 * Single source of truth for "who performed this action", used by every write path
 * (sales, restock, adjust, purchase, void, refund) so the inventory/audit ledger always
 * records the REAL logged-in staff member — never a hardcoded "System" placeholder.
 *
 * Order: display name → username → email → 'System' (only when there is genuinely no
 * human actor, e.g. an automated baseline reset). Staff accounts often have an empty
 * `email`, which is why the old `profile?.email || 'System'` pattern wrongly wrote "System".
 */
export function resolveActorName(
  profile?: Pick<User, 'name' | 'username' | 'email'> | null
): string {
  const name = profile?.name?.trim();
  if (name) return name;
  const username = profile?.username?.trim();
  if (username) return username;
  const email = profile?.email?.trim();
  if (email) return email;
  return 'System';
}
