// apps/api/src/ivr/authState.ts
import { getState, setState } from "./state";

export async function setAuthed(callSid: string, caller: string) {
  const existing = (await getState(callSid)) ?? {};
  await setState(callSid, {
    ...existing,
    authed: true,
    caller,
  });
}

export async function isAuthed(callSid: string): Promise<boolean> {
  const state = await getState(callSid);
  return Boolean(state?.authed);
}

export async function getAuthedCaller(callSid: string): Promise<string | null> {
  const state = await getState(callSid);
  const caller = state?.caller;
  return typeof caller === "string" && caller.length > 0 ? caller : null;
}
