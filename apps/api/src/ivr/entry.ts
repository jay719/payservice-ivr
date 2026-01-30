import twilio from "twilio";
import type { FastifyReply, FastifyRequest } from "fastify";
import { urlJoin, type TwilioVoiceWebhookBody } from "./utils";

const { VoiceResponse } = twilio.twiml;

type TwilioReq = FastifyRequest<{ Body: TwilioVoiceWebhookBody }>;

function getBaseUrl(): string {
  const port = Number(process.env.PORT || 3001);
  return process.env.BASE_URL || `http://localhost:${port}`;
}

function sendXml(reply: FastifyReply, vr: twilio.twiml.VoiceResponse) {
  return reply.type("text/xml").send(vr.toString());
}

export function ivrEntry(req: TwilioReq, reply: FastifyReply) {
  const vr = new VoiceResponse();
  const baseUrl = getBaseUrl();

  const gather = vr.gather({
    numDigits: 4,
    finishOnKey: "#",
    actionOnEmptyResult: true,
    action: urlJoin(baseUrl, "/twilio/auth"),
    method: "POST",
    timeout: 10,
  });

  gather.say(
    "Welcome to your Rich Fit MyiBot. " +
      "Please enter your 4 digit PIN now. " +
      "Or press the pound key to create a new account."
  );

  vr.say("No input received.");
  vr.redirect({ method: "POST" }, urlJoin(baseUrl, "/twilio/voice"));
  return sendXml(reply, vr);
}
