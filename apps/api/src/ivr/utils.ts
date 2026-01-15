export type TwilioVoiceWebhookBody = {
  CallSid?: string;
  Digits?: string;
  From?: string;
  To?: string;
  [key: string]: unknown;
};

export function urlJoin(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

export function isDigits(value: unknown): value is string {
  return typeof value === "string" && /^[0-9]+$/.test(value);
}

export function getCallSid(body: TwilioVoiceWebhookBody | undefined): string {
  const cs = body?.CallSid;
  return typeof cs === "string" && cs.length > 0 ? cs : "unknown";
}

export function getDigits(body: TwilioVoiceWebhookBody | undefined): unknown {
  return body?.Digits;
}
