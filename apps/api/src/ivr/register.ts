import twilio from "twilio";
import type { FastifyReply, FastifyRequest } from "fastify";
import { clearFlow, getState, setState } from "./state";
import { createAccount } from "./accounts";
import { setAuthed } from "./state";
import {
  getCallSid,
  getDigits,
  getCaller,
  isDigits,
  urlJoin,
  type TwilioVoiceWebhookBody,
} from "./utils";
import { guardCallSid } from "./guardCallSid";

const { VoiceResponse } = twilio.twiml;

type TwilioReq = FastifyRequest<{ Body: TwilioVoiceWebhookBody }>;

function getBaseUrl(): string {
  const port = Number(process.env.PORT || 3001);
  return process.env.BASE_URL || `http://localhost:${port}`;
}

function sendXml(reply: FastifyReply, vr: twilio.twiml.VoiceResponse) {
  return reply.type("text/xml").send(vr.toString());
}

function sayDigitsSlow(vr: twilio.twiml.VoiceResponse, digits: string) {
  vr.say(digits.split("").join(" "));
}

export async function ivrRegisterStart(req: TwilioReq, reply: FastifyReply) {
  const vr = new VoiceResponse();
  const baseUrl = getBaseUrl();

  const callSid = getCallSid(req.body);
if (!guardCallSid(callSid, reply, baseUrl)) return;
  await setState(callSid, { step: "register_id" });

  const gather = vr.gather({
    numDigits: 8,
    action: urlJoin(baseUrl, "/twilio/register/id"),
    method: "POST",
    timeout: 12,
  });

  gather.say("To create your account, enter your 8 digit I D number now.");

  vr.say("No input received.");
  vr.redirect({ method: "POST" }, urlJoin(baseUrl, "/twilio/voice"));
  return sendXml(reply, vr);
}

export async function ivrRegisterId(req: TwilioReq, reply: FastifyReply) {
  const vr = new VoiceResponse();
  const baseUrl = getBaseUrl();
  const callSid = getCallSid(req.body);
  if (!guardCallSid(callSid, reply, baseUrl)) return;
  const state = await getState(callSid);
  const digitsRaw = getDigits(req.body);

  if (!state || state.step !== "register_id") {
    vr.say("Session expired. Returning to the main menu.");
    vr.redirect({ method: "POST" }, urlJoin(baseUrl, "/twilio/voice"));
    return sendXml(reply, vr);
  }

  if (!isDigits(digitsRaw) || digitsRaw.length !== 8) {
    vr.say("That I D number is not valid. Please try again.");
    vr.redirect({ method: "POST" }, urlJoin(baseUrl, "/twilio/register"));
    return sendXml(reply, vr);
  }

  const memberId = digitsRaw;
  await setState(callSid, { step: "register_pin", memberId });

  const gather = vr.gather({
    numDigits: 3,
    action: urlJoin(baseUrl, "/twilio/register/pin"),
    method: "POST",
    timeout: 12,
  });

  gather.say("Create a 3 digit PIN now.");

  vr.say("No input received.");
  vr.redirect({ method: "POST" }, urlJoin(baseUrl, "/twilio/voice"));
  return sendXml(reply, vr);
}

export async function ivrRegisterPin(req: TwilioReq, reply: FastifyReply) {
  const vr = new VoiceResponse();
  const baseUrl = getBaseUrl();

  const callSid = getCallSid(req.body);
  if (!guardCallSid(callSid, reply, baseUrl)) return;
  const state = await getState(callSid);
  const digitsRaw = getDigits(req.body);

  if (!state || state.step !== "register_pin") {
    vr.say("Session expired. Returning to the main menu.");
    vr.redirect({ method: "POST" }, urlJoin(baseUrl, "/twilio/voice"));
    return sendXml(reply, vr);
  }

  if (!isDigits(digitsRaw) || digitsRaw.length !== 3) {
    vr.say("That PIN is not valid. Please try again.");
    vr.redirect({ method: "POST" }, urlJoin(baseUrl, "/twilio/register"));
    return sendXml(reply, vr);
  }

  await setState(callSid, {
    step: "register_pin_confirm",
    memberId: state.memberId,
    pin: digitsRaw,
  });

  const gather = vr.gather({
    numDigits: 3,
    action: urlJoin(baseUrl, "/twilio/register/pin/confirm"),
    method: "POST",
    timeout: 12,
  });

  gather.say("Re enter your 3 digit PIN to confirm.");

  vr.say("No input received.");
  vr.redirect({ method: "POST" }, urlJoin(baseUrl, "/twilio/voice"));
  return sendXml(reply, vr);
}

export async function ivrRegisterPinConfirm(req: TwilioReq, reply: FastifyReply) {
  const vr = new VoiceResponse();
  const baseUrl = getBaseUrl();

  const callSid = getCallSid(req.body);
  if (!guardCallSid(callSid, reply, baseUrl)) return;
  const state = await getState(callSid);
  const digitsRaw = getDigits(req.body);

  if (!state || state.step !== "register_pin_confirm") {
    vr.say("Session expired. Returning to the main menu.");
    vr.redirect({ method: "POST" }, urlJoin(baseUrl, "/twilio/voice"));
    return sendXml(reply, vr);
  }

  if (!isDigits(digitsRaw) || digitsRaw.length !== 3) {
    vr.say("That confirmation PIN is not valid.");
    await clearFlow(callSid);
    vr.redirect({ method: "POST" }, urlJoin(baseUrl, "/twilio/voice"));
    return sendXml(reply, vr);
  }

 if (digitsRaw !== state.pin) {
  vr.say("Those P I N numbers did not match. Please try again.");
  await clearFlow(callSid);
  vr.pause({ length: 1 });
  vr.redirect({ method: "POST" }, urlJoin(baseUrl, "/twilio/register"));
  return sendXml(reply, vr);
}

const caller = getCaller(req.body);

// ✅ Guard state fields before createAccount
const memberId = state.memberId;
const pin = state.pin;

if (!isDigits(memberId) || memberId.length !== 8 || !isDigits(pin) || pin.length !== 3) {
  vr.say("Session expired. Please try registering again.");
  await clearFlow(callSid);
  vr.pause({ length: 1 });
  vr.redirect({ method: "POST" }, urlJoin(baseUrl, "/twilio/register"));
  return sendXml(reply, vr);
}

const acct = await createAccount({
  caller,
  memberId,
  pin,
});

  // Auto-auth after signup
  await setAuthed(callSid, caller);

  vr.say("Your account is created.");
  vr.pause({ length: 1 });

  vr.say("To finalize your account, email this confirmation code to support.");
  vr.say("Your confirmation code is.");
  sayDigitsSlow(vr, acct.confirmationCode);

  await setState(callSid, {
    step: "register_code_menu",
    confirmationCode: acct.confirmationCode,
  });

  vr.pause({ length: 1 });

  const gather = vr.gather({
    numDigits: 1,
    action: urlJoin(baseUrl, "/twilio/register/code/input"),
    method: "POST",
    timeout: 8,
  });

  gather.say("Press 1 to repeat the confirmation code. Press 9 for the main menu.");

  vr.redirect({ method: "POST" }, urlJoin(baseUrl, "/twilio/menu"));
  return sendXml(reply, vr);
}

export async function ivrRegisterCodeMenu(req: TwilioReq, reply: FastifyReply) {
  const vr = new VoiceResponse();
  const baseUrl = getBaseUrl();

  const callSid = getCallSid(req.body);
  if (!guardCallSid(callSid, reply, baseUrl)) return;
  const state = await getState(callSid);

  if (!state || state.step !== "register_code_menu") {
    vr.redirect({ method: "POST" }, urlJoin(baseUrl, "/twilio/menu"));
    return sendXml(reply, vr);
  }

  const gather = vr.gather({
    numDigits: 1,
    action: urlJoin(baseUrl, "/twilio/register/code/input"),
    method: "POST",
    timeout: 8,
  });

  gather.say("Press 1 to repeat the confirmation code. Press 9 for the main menu.");

  vr.redirect({ method: "POST" }, urlJoin(baseUrl, "/twilio/menu"));
  return sendXml(reply, vr);
}

export async function ivrRegisterCodeInput(req: TwilioReq, reply: FastifyReply) {
  const vr = new VoiceResponse();
  const baseUrl = getBaseUrl();

  const callSid = getCallSid(req.body);
  if (!guardCallSid(callSid, reply, baseUrl)) return;
  const digitsRaw = getDigits(req.body);
  const digits = isDigits(digitsRaw) ? digitsRaw : "";
  const state = await getState(callSid);

  if (!state || state.step !== "register_code_menu") {
    vr.say("Session expired.");
    await clearFlow(callSid);
    vr.redirect({ method: "POST" }, urlJoin(baseUrl, "/twilio/menu"));
    return sendXml(reply, vr);
  }

  if (digits === "1") {
    const code = state.confirmationCode;

    if (!code) {
      vr.say("Your confirmation code is not available right now.");
      vr.pause({ length: 1 });
      vr.redirect({ method: "POST" }, urlJoin(baseUrl, "/twilio/register/code/menu"));
      return sendXml(reply, vr);
    }

    vr.say("Your confirmation code is.");
    sayDigitsSlow(vr, code);
    vr.pause({ length: 1 });
    vr.redirect({ method: "POST" }, urlJoin(baseUrl, "/twilio/register/code/menu"));
    return sendXml(reply, vr);
  }

  if (digits !== "9") {
    vr.say("Invalid option.");
    vr.pause({ length: 1 });
    vr.redirect({ method: "POST" }, urlJoin(baseUrl, "/twilio/register/code/menu"));
    return sendXml(reply, vr);
  }

  await clearFlow(callSid);
  vr.redirect({ method: "POST" }, urlJoin(baseUrl, "/twilio/menu"));
  return sendXml(reply, vr);
}
