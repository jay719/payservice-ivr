import twilio from "twilio";
import type { FastifyReply } from "fastify";
import { urlJoin } from "./utils";

const { VoiceResponse } = twilio.twiml;

export function guardCallSid(
  callSid: string | null,
  reply: FastifyReply,
  baseUrl: string
): callSid is string {
  if (callSid) return true;

  const vr = new VoiceResponse();
  vr.say("A system error occurred. Please hang up and call again.");
  vr.redirect({ method: "POST" }, urlJoin(baseUrl, "/twilio/voice"));

  reply.type("text/xml").send(vr.toString());
  return false;
}
