import twilio from "twilio";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
  getCallSid,
  getDigits,
  getCaller,
  isDigits,
  urlJoin,
  type TwilioVoiceWebhookBody,
} from "./utils";
import { getAccount, verifyPin } from "./accounts";
import { setAuthed } from "./authState";

const { VoiceResponse } = twilio.twiml;

type TwilioReq = FastifyRequest<{ Body: TwilioVoiceWebhookBody }>;

function getBaseUrl(): string {
  const port = Number(process.env.PORT || 3001);
  return process.env.BASE_URL || `http://localhost:${port}`;
}

function sendXml(reply: FastifyReply, vr: twilio.twiml.VoiceResponse) {
  return reply.type("text/xml").send(vr.toString());
}

export async function ivrAuth(req: TwilioReq, reply: FastifyReply) {
  const vr = new VoiceResponse();
  const baseUrl = getBaseUrl();

  const callSid = getCallSid(req.body);
  const caller = getCaller(req.body);
  const digitsRaw = getDigits(req.body);

  // New member if they press # or send empty
  if (typeof digitsRaw === "string") {
    const trimmed = digitsRaw.trim();
    if (trimmed.length === 0 || trimmed === "#") {
      vr.redirect({ method: "POST" }, urlJoin(baseUrl, "/twilio/register"));
      return sendXml(reply, vr);
    }
  }

  if (!isDigits(digitsRaw)) {
    vr.say("Sorry, I did not get that.");
    vr.redirect({ method: "POST" }, urlJoin(baseUrl, "/twilio/voice"));
    return sendXml(reply, vr);
  }

  if (digitsRaw.length !== 3) {
    vr.say("Your PIN must be 3 digits.");
    vr.pause({ length: 1 });
    vr.redirect({ method: "POST" }, urlJoin(baseUrl, "/twilio/voice"));
    return sendXml(reply, vr);
  }

  // Demo override PIN
  if (digitsRaw === "222") {
    await setAuthed(callSid, caller);
    vr.say("Demo access granted.");
    vr.pause({ length: 1 });
    vr.redirect({ method: "POST" }, urlJoin(baseUrl, "/twilio/menu"));
    return sendXml(reply, vr);
  }

  const acct = await getAccount(caller);
  if (!acct) {
    vr.say(
      "No account was found for this phone number. " +
        "To create a new account, press the pound key without entering a PIN."
    );
    vr.pause({ length: 1 });
    vr.redirect({ method: "POST" }, urlJoin(baseUrl, "/twilio/voice"));
    return sendXml(reply, vr);
  }

  const ok = await verifyPin(caller, digitsRaw);
  if (!ok) {
    vr.say("Invalid PIN. Please try again.");
    vr.pause({ length: 1 });
    vr.redirect({ method: "POST" }, urlJoin(baseUrl, "/twilio/voice"));
    return sendXml(reply, vr);
  }

  await setAuthed(callSid, caller);
  vr.say("Access granted.");
  vr.pause({ length: 1 });
  vr.redirect({ method: "POST" }, urlJoin(baseUrl, "/twilio/menu"));
  return sendXml(reply, vr);
}
