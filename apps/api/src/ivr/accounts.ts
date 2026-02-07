// apps/api/src/ivr/accounts.ts
import crypto from "crypto";
import { query } from "../db";

export type Account = {
  caller: string;
  memberId: string;
  pinHash: string;
  confirmationCode: string | null;
  createdAtIso: string;
};

function hashPin(pin: string, caller: string): string {
  const salt = `myibot-demo:${caller}`;
  return crypto.createHash("sha256").update(`${salt}:${pin}`).digest("hex");
}

function generate6DigitCode(): string {
  const n = crypto.randomInt(0, 1_000_000);
  return String(n).padStart(6, "0");
}

export async function getAccount(caller: string): Promise<Account | null> {
  const rows = await query<{
    caller: string;
    member_id: string;
    pin_hash: string;
    confirmation_code: string | null;
    created_at: Date | string;
  }>(
    `SELECT caller, member_id, pin_hash, confirmation_code, created_at
     FROM accounts
     WHERE caller = $1`,
    [caller]
  );

  const r = rows[0];
  if (!r) return null;

  return {
    caller: r.caller,
    memberId: r.member_id,
    pinHash: r.pin_hash,
    confirmationCode: r.confirmation_code,
    createdAtIso:
      typeof r.created_at === "string" ? r.created_at : r.created_at.toISOString(),
  };
}

export async function verifyPin(caller: string, pin: string): Promise<boolean> {
  const acct = await getAccount(caller);
  if (!acct) return false;
  return acct.pinHash === hashPin(pin, caller);
}

/**
 * Creates or updates the caller's account.
 * Returns the generated confirmation code (6 digits).
 *
 * IMPORTANT:
 * Your register flow expects to read `confirmationCode`, so we return it.
 */
export async function createAccount(params: {
  caller: string;
  memberId: string; // should be 8 digits (validated in register.ts)
  pin: string;      // should be 3 digits (validated in register.ts)
}): Promise<{ confirmationCode: string }> {
  const confirmationCode = generate6DigitCode();
  const pinHash = hashPin(params.pin, params.caller);

  await query(
    `INSERT INTO accounts (caller, member_id, pin_hash, confirmation_code)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (caller)
     DO UPDATE SET
       member_id = EXCLUDED.member_id,
       pin_hash = EXCLUDED.pin_hash,
       confirmation_code = EXCLUDED.confirmation_code`,
    [params.caller, params.memberId, pinHash, confirmationCode]
  );

  return { confirmationCode };
}
