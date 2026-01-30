// apps/api/src/ivr/handlers.ts
import twilio from "twilio";
import type { FastifyReply, FastifyRequest } from "fastify";
import { clearState, getState, setState } from "./state";
import {
  getCallSid,
  getDigits,
  isDigits,
  urlJoin,
  type TwilioVoiceWebhookBody,
} from "./utils";
import { isAuthed } from "./authState";

const { VoiceResponse } = twilio.twiml;

type TwilioReq = FastifyRequest<{ Body: TwilioVoiceWebhookBody }>;

function getBaseUrl(): string {
  const port = Number(process.env.PORT || 3001);
  return process.env.BASE_URL || `http://localhost:${port}`;
}

function sendXml(reply: FastifyReply, vr: twilio.twiml.VoiceResponse) {
  return reply.type("text/xml").send(vr.toString());
}

function requireAuthed(
  req: TwilioReq,
  reply: FastifyReply,
  vr: twilio.twiml.VoiceResponse,
  baseUrl: string
): boolean {
  const callSid = getCallSid(req.body);
  if (!isAuthed(callSid)) {
    vr.say("Please enter your PINfirst.");
    vr.redirect({ method: "POST" }, urlJoin(baseUrl, "/twilio/voice"));
    sendXml(reply, vr);
    return false;
  }
  return true;
}

// Menu (called after ivrAuth redirects here)
export function ivrMenu(req: TwilioReq, reply: FastifyReply) {
  const vr = new VoiceResponse();
  const baseUrl = getBaseUrl();

  if (!requireAuthed(req, reply, vr, baseUrl)) return;

  const callSid = getCallSid(req.body);
  const digitsRaw = getDigits(req.body);

  // If no digits, render the menu prompt + gather
  if (!isDigits(digitsRaw)) {
    const gather = vr.gather({
      numDigits: 1,
      action: urlJoin(baseUrl, "/twilio/menu"),
      method: "POST",
      timeout: 8,
    });

    gather.say(
      "Press 1 to hear your balance. " +
        "Press 2 to send money. " +
        "Press 3 to repeat this menu."
    );

    vr.say("No input received.");
    vr.redirect({ method: "POST" }, urlJoin(baseUrl, "/twilio/menu"));
    return sendXml(reply, vr);
  }

  // Handle menu input
  if (digitsRaw === "1") {
    vr.redirect({ method: "POST" }, urlJoin(baseUrl, "/twilio/balance"));
    return sendXml(reply, vr);
  }

  if (digitsRaw === "2") {
    setState(callSid, { step: "transfer_amount" });

    const gather = vr.gather({
      numDigits: 4,
      action: urlJoin(baseUrl, "/twilio/transfer/amount"),
      method: "POST",
      timeout: 10,
    });

    gather.say(
      "Enter the amount in dollars. For example, for 25 dollars, enter 0025."
    );

    vr.say("No input received.");
    vr.redirect({ method: "POST" }, urlJoin(baseUrl, "/twilio/menu"));
    return sendXml(reply, vr);
  }

  if (digitsRaw === "3") {
    vr.redirect({ method: "POST" }, urlJoin(baseUrl, "/twilio/menu"));
    return sendXml(reply, vr);
  }

  vr.say("Invalid choice.");
  vr.redirect({ method: "POST" }, urlJoin(baseUrl, "/twilio/menu"));
  return sendXml(reply, vr);
}

export function ivrTransferAmount(req: TwilioReq, reply: FastifyReply) {
  const vr = new VoiceResponse();
  const baseUrl = getBaseUrl();

  if (!requireAuthed(req, reply, vr, baseUrl)) return;

  const callSid = getCallSid(req.body);
  const digitsRaw = getDigits(req.body);

  if (!isDigits(digitsRaw) || digitsRaw.length !== 4) {
    vr.say("Invalid amount. Please try again.");
    vr.redirect({ method: "POST" }, urlJoin(baseUrl, "/twilio/menu"));
    return sendXml(reply, vr);
  }

  const amountDollars = parseInt(digitsRaw, 10);
  const amountCents = Math.max(0, Math.trunc(amountDollars)) * 100;

  setState(callSid, { step: "transfer_recipient", amountCents });

  const gather = vr.gather({
    numDigits: 6,
    action: urlJoin(baseUrl, "/twilio/transfer/recipient"),
    method: "POST",
    timeout: 12,
  });

  gather.say("Enter the 6 digit recipient code.");

  vr.say("No input received.");
  vr.redirect({ method: "POST" }, urlJoin(baseUrl, "/twilio/menu"));
  return sendXml(reply, vr);
}

export function ivrTransferRecipient(req: TwilioReq, reply: FastifyReply) {
  const vr = new VoiceResponse();
  const baseUrl = getBaseUrl();

  if (!requireAuthed(req, reply, vr, baseUrl)) return;

  const callSid = getCallSid(req.body);
  const digitsRaw = getDigits(req.body);
  const state = getState(callSid);

  if (!state || state.step !== "transfer_recipient") {
    vr.say("Session expired. Returning to main menu.");
    vr.redirect({ method: "POST" }, urlJoin(baseUrl, "/twilio/menu"));
    return sendXml(reply, vr);
  }

  if (!isDigits(digitsRaw) || digitsRaw.length !== 6) {
    vr.say("Invalid recipient code. Please try again.");
    vr.redirect({ method: "POST" }, urlJoin(baseUrl, "/twilio/menu"));
    return sendXml(reply, vr);
  }

  const recipientCode = digitsRaw;

  const gather = vr.gather({
    numDigits: 1,
    action: urlJoin(baseUrl, "/twilio/transfer/confirm"),
    method: "POST",
    timeout: 8,
  });

  gather.say(
    `You are sending ${Math.floor(state.amountCents / 100)} dollars to recipient ${recipientCode}. ` +
      "Press 1 to confirm. Press 2 to cancel."
  );

  setState(callSid, {
    step: "transfer_confirm",
    amountCents: state.amountCents,
    recipientCode,
  });

  vr.say("No input received.");
  vr.redirect({ method: "POST" }, urlJoin(baseUrl, "/twilio/menu"));
  return sendXml(reply, vr);
}

export function ivrTransferConfirm(req: TwilioReq, reply: FastifyReply) {
  const vr = new VoiceResponse();
  const baseUrl = getBaseUrl();

  if (!requireAuthed(req, reply, vr, baseUrl)) return;

  const callSid = getCallSid(req.body);
  const digitsRaw = getDigits(req.body);
  const state = getState(callSid);

  if (!state || state.step !== "transfer_confirm") {
    vr.say("Session expired. Returning to main menu.");
    vr.redirect({ method: "POST" }, urlJoin(baseUrl, "/twilio/menu"));
    return sendXml(reply, vr);
  }

  const digits = isDigits(digitsRaw) ? digitsRaw : "";

  if (digits === "1") {
    vr.say("Transfer submitted. Thank you.");
    clearState(callSid);
    vr.redirect({ method: "POST" }, urlJoin(baseUrl, "/twilio/menu"));
    return sendXml(reply, vr);
  }

  vr.say("Canceled.");
  vr.pause({ length: 1 });
  clearState(callSid);
  vr.redirect({ method: "POST" }, urlJoin(baseUrl, "/twilio/menu"));
  return sendXml(reply, vr);
}

export function ivrBalance(req: TwilioReq, reply: FastifyReply) {
  const vr = new VoiceResponse();
  const baseUrl = getBaseUrl();

  if (!requireAuthed(req, reply, vr, baseUrl)) return;

  // MVP: fake balance (replace later)
  const balanceCents = 1275;
  const dollars = Math.floor(balanceCents / 100);
  const cents = String(balanceCents % 100).padStart(2, "0");

  vr.say(`Your balance is ${dollars} dollars and ${cents} cents.`);
  vr.pause({ length: 1 });

  const gather = vr.gather({
    numDigits: 1,
    action: urlJoin(baseUrl, "/twilio/balance/input"),
    method: "POST",
    timeout: 7,
  });

  gather.say("Press 1 to repeat. Press 9 for the main menu.");

  vr.redirect({ method: "POST" }, urlJoin(baseUrl, "/twilio/menu"));
  return sendXml(reply, vr);
}

export function ivrBalanceInput(req: TwilioReq, reply: FastifyReply) {
  const vr = new VoiceResponse();
  const baseUrl = getBaseUrl();

  if (!requireAuthed(req, reply, vr, baseUrl)) return;

  const digitsRaw = getDigits(req.body);
  const digits = isDigits(digitsRaw) ? digitsRaw : "";

  if (digits === "1") {
    vr.pause({ length: 1 });
    vr.redirect({ method: "POST" }, urlJoin(baseUrl, "/twilio/balance"));
    return sendXml(reply, vr);
  }

  if (digits === "9") {
    vr.pause({ length: 1 });
    vr.redirect({ method: "POST" }, urlJoin(baseUrl, "/twilio/menu"));
    return sendXml(reply, vr);
  }

  vr.say("Invalid choice. Returning to the main menu.");
  vr.pause({ length: 1 });
  vr.redirect({ method: "POST" }, urlJoin(baseUrl, "/twilio/menu"));
  return sendXml(reply, vr);
}
