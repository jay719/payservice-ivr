import crypto from "crypto";

export type Account = {
  caller: string;            // Twilio From
  memberId: string;          // 6 digits (inmate/custom)
  pinHash: string;           // hashed
  confirmationCode: string;  // 6 digits
  createdAtIso: string;
};

const accounts = new Map<string, Account>(); // key: caller

function hashPin(pin: string, caller: string): string {
  const salt = `myibot-demo:${caller}`;
  return crypto.createHash("sha256").update(`${salt}:${pin}`).digest("hex");
}

function generate6DigitCode(): string {
  const n = crypto.randomInt(0, 1_000_000);
  return String(n).padStart(6, "0");
}

export function getAccount(caller: string): Account | undefined {
  return accounts.get(caller);
}

export function verifyPin(caller: string, pin: string): boolean {
  const acct = accounts.get(caller);
  if (!acct) return false;
  return acct.pinHash === hashPin(pin, caller);
}

export function createAccount(params: { caller: string; memberId: string; pin: string }): Account {
  const acct: Account = {
    caller: params.caller,
    memberId: params.memberId,
    pinHash: hashPin(params.pin, params.caller),
    confirmationCode: generate6DigitCode(),
    createdAtIso: new Date().toISOString(),
  };
  accounts.set(params.caller, acct);
  return acct;
}