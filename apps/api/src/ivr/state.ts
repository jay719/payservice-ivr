// apps/api/src/ivr/state.ts

export type TransferState =
  | { step: "transfer_amount" }
  | { step: "transfer_recipient"; amountCents: number }
  | { step: "transfer_confirm"; amountCents: number; recipientCode: string };

export type RegisterState =
  | { step: "register_id" }
  | { step: "register_pin"; memberId: string }
  | { step: "register_pin_confirm"; memberId: string; pin: string }
  | { step: "register_code_menu"; confirmationCode: string };

export type CallState = TransferState | RegisterState;

const state = new Map<string, CallState>(); // key: CallSid

export function getState(callSid: string): CallState | undefined {
  return state.get(callSid);
}

export function setState(callSid: string, s: CallState): void {
  state.set(callSid, s);
}

export function clearState(callSid: string): void {
  state.delete(callSid);
}
