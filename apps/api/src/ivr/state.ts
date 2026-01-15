export type CallSid = string;

export type CallState =
  | { step: "transfer_amount" }
  | { step: "transfer_recipient"; amountCents: number }
  | { step: "transfer_confirm"; amountCents: number; recipientCode: string };

const callState = new Map<CallSid, CallState>();

export function getState(callSid: CallSid): CallState | undefined {
  return callState.get(callSid);
}

export function setState(callSid: CallSid, state: CallState): void {
  callState.set(callSid, state);
}

export function clearState(callSid: CallSid): void {
  callState.delete(callSid);
}
