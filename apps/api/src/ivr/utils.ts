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

export function getCallSid(
  body: TwilioVoiceWebhookBody | undefined
): string | null {
  const cs = body?.CallSid;
  return typeof cs === "string" && cs.length > 0 ? cs : null;
}

export function getDigits(body: TwilioVoiceWebhookBody | undefined): unknown {
  return body?.Digits;
}

export function getCaller(body: TwilioVoiceWebhookBody | undefined): string {
  const from = body?.From;
  return typeof from === "string" && from.length > 0 ? from : "unknown";
}
