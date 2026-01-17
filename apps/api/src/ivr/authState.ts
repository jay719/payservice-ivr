const authedCalls = new Map<string, { caller: string }>(); // key: CallSid

export function setAuthed(callSid: string, caller: string) {
  authedCalls.set(callSid, { caller });
}

export function isAuthed(callSid: string): boolean {
  return authedCalls.has(callSid);
}

export function clearAuthed(callSid: string) {
  authedCalls.delete(callSid);
}

export function getAuthedCaller(callSid: string): string | undefined {
  return authedCalls.get(callSid)?.caller;
}
