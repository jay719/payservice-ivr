import { query } from "../db";

export type SessionState = {
  authed?: boolean;
  caller?: string;

  // flow-related keys
  step?: string;
  confirmationCode?: string;
  amountCents?: number;
  targetMemberId?: string;
  recipientCode?: string;
  memberId?: string;
  pin?: string;

  [key: string]: any;
};

export async function getState(callSid: string): Promise<SessionState | null> {
  const rows = await query<{ state: any }>(
    `SELECT state FROM call_sessions WHERE call_sid = $1`,
    [callSid]
  );

  if (!rows || rows.length === 0) return null;
  return (rows[0]?.state ?? {}) as SessionState;
}

export async function ensureSession(callSid: string) {
  await query(
    `
    INSERT INTO call_sessions (call_sid, state)
    VALUES ($1, '{}'::jsonb)
    ON CONFLICT (call_sid) DO NOTHING
    `,
    [callSid]
  );
}

export async function setState(callSid: string, partial: Partial<SessionState>) {
  await ensureSession(callSid);

  const current = (await getState(callSid)) || {};

  // If we are changing steps, clear old flow keys but keep auth.
  const isStepChange =
    typeof partial.step === "string" && partial.step !== current.step;

  const base: SessionState = isStepChange
    ? { authed: current.authed, caller: current.caller }
    : current;

  const merged: SessionState = { ...base, ...partial };

  await query(`UPDATE call_sessions SET state = $2 WHERE call_sid = $1`, [
    callSid,
    merged,
  ]);
}

export async function setAuthed(callSid: string, caller: string) {
  await setState(callSid, { authed: true, caller });
}

export function requireAuthed(state: SessionState | null) {
  return Boolean(state?.authed && state?.caller);
}

export async function isAuthed(callSid: string): Promise<boolean> {
  const state = await getState(callSid);
  return requireAuthed(state);
}

export async function getAuthedCaller(callSid: string): Promise<string | null> {
  const state = await getState(callSid);
  const caller = state?.caller;
  return typeof caller === "string" && caller.length > 0 ? caller : null;
}

export async function clearFlow(callSid: string) {
  const current = (await getState(callSid)) || {};

  const cleared: SessionState = {
    authed: current.authed,
    caller: current.caller,
  };

  await query(`UPDATE call_sessions SET state = $2 WHERE call_sid = $1`, [
    callSid,
    cleared,
  ]);
}
