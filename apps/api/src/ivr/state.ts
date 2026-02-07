import { query } from "../db";

export async function getState(callSid: string) {
  const rows = await query<{ state: any }>(
    "SELECT state FROM call_sessions WHERE call_sid = $1",
    [callSid]
  );
  return rows[0]?.state ?? null;
}

export async function setState(callSid: string, state: any) {
  await query(
    `INSERT INTO call_sessions (call_sid, state)
     VALUES ($1, $2)
     ON CONFLICT (call_sid)
     DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()`,
    [callSid, state]
  );
}

export async function clearState(callSid: string) {
  await query("DELETE FROM call_sessions WHERE call_sid = $1", [callSid]);
}
