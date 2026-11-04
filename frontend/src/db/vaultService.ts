import { db } from './indexedDb';
import { decryptJson, deriveKey, encryptJson, hmacSha256, randomSalt, sha256 } from '../services/crypto/webCrypto';
import { AuthError } from '../types/auth.types';
import type { VaultPayload } from '../types/db.types';
import { ERR, OFFLINE_MAX_MS, TERMINAL_ID } from '../utils/constants';

/* Terminal-bound secret (FR-3.3). Replace with a server-provisioned terminal key (the "Offline Vault Key") when the API returns one. */
export const deviceFingerprint = async () =>
  'FP-' + (await sha256(`${TERMINAL_ID}|${navigator.userAgent}|${screen.width}x${screen.height}|${Intl.DateTimeFormat().resolvedOptions().timeZone}`)).slice(0, 12);

async function seal(payload: VaultPayload, salt: string) {
  const secret = await deviceFingerprint();
  const { iv, data } = await encryptJson(await deriveKey(secret, salt), payload);
  await db.vault.put({ id: 'vault', salt, iv, data, mac: await hmacSha256(secret + salt, iv + data) }); // NFR-2.2
}

export async function openVault(): Promise<VaultPayload | null> {
  const row = await db.vault.get('vault');
  if (!row) return null;
  const secret = await deviceFingerprint();
  if ((await hmacSha256(secret + row.salt, row.iv + row.data)) !== row.mac) throw new AuthError(ERR.TAMPER, 'Local data was modified. An admin must sign in online.');
  try { return await decryptJson<VaultPayload>(await deriveKey(secret, row.salt), row.iv, row.data); }
  catch { throw new AuthError(ERR.TAMPER); }
}

/** Call after every successful ONLINE cashier login so the terminal can sign in offline later. */
export async function rememberCashier(tenantCode: string, branchId: string, username: string, displayName: string, pin: string) {
  const salt = (await db.vault.get('vault'))?.salt ?? randomSalt();
  const cur = (await openVault().catch(() => null)) ?? { tenantCode, branchId, lastOnlineAt: 0, cashiers: [] };
  const pinHash = await sha256(pin + salt); // FR-3.4
  const cashiers = [...cur.cashiers.filter((c) => c.username !== username), { username, displayName, pinHash }];
  await seal({ tenantCode, branchId, lastOnlineAt: Date.now(), cashiers }, salt);
}

/** FR-3.2 to FR-3.5: cashier-only offline sign-in. Returns the display name and tenant on success. */
export async function offlineLogin(username: string, pin: string) {
  const v = await openVault();
  const row = await db.vault.get('vault');
  if (!v || !row) throw new AuthError('ERR_VAULT_EMPTY', 'This terminal has no offline access yet. Sign in online once first.');
  if (Date.now() - v.lastOnlineAt > OFFLINE_MAX_MS) throw new AuthError(ERR.VAULT_EXPIRED, 'Offline window (72 h) ended. Connect to the internet to sign in.');
  const c = v.cashiers.find((x) => x.username === username);
  if (!c || c.pinHash !== (await sha256(pin + row.salt))) throw new AuthError('ERR_BAD_CREDENTIALS');
  return { displayName: c.displayName, tenantCode: v.tenantCode, token: crypto.randomUUID() }; // OfflineSessionToken
}
