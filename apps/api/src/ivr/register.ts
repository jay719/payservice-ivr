import twilio from "twilio";
import type { FastifyReply, FastifyRequest } from "fastify";
import { clearState, getState, setState } from "./state";
import { createAccount } from "./accounts";
import { setAuthed } from "./authState";
import {
  getCallSid,
  getDigits,
  getCaller,
  isDigits,
  urlJoin,
  type TwilioVoiceWebhookBody,
} from "./utils";

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

export function ivrRegisterStart(req: TwilioReq, reply: FastifyReply) {
  const vr = new VoiceResponse();
  const baseUrl = getBaseUrl();

  const callSid = getCallSid(req.body);
  setState(callSid, { step: "register_id" });

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

export function ivrRegisterId(req: TwilioReq, reply: FastifyReply) {
  const vr = new VoiceResponse();
  const baseUrl = getBaseUrl();

  const callSid = getCallSid(req.body);
  const state = getState(callSid);
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
  setState(callSid, { step: "register_pin", memberId });

  const gather = vr.gather({
    numDigits: 3,
    action: urlJoin(baseUrl, "/twilio/register/pin"),
    method: "POST",
    timeout: 12,
  });

  gather.say("Create a 4 digit PINnow.");

  vr.say("No input received.");
  vr.redirect({ method: "POST" }, urlJoin(baseUrl, "/twilio/voice"));
  return sendXml(reply, vr);
}

export function ivrRegisterPin(req: TwilioReq, reply: FastifyReply) {
  const vr = new VoiceResponse();
  const baseUrl = getBaseUrl();

  const callSid = getCallSid(req.body);
  const state = getState(callSid);
  const digitsRaw = getDigits(req.body);

  if (!state || state.step !== "register_pin") {
    vr.say("Session expired. Returning to the main menu.");
    vr.redirect({ method: "POST" }, urlJoin(baseUrl, "/twilio/voice"));
    return sendXml(reply, vr);
  }

  if (!isDigits(digitsRaw) || digitsRaw.length !== 4) {
    vr.say("That PINis not valid. Please try again.");
    vr.redirect({ method: "POST" }, urlJoin(baseUrl, "/twilio/register"));
    return sendXml(reply, vr);
  }

  setState(callSid, {
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

  gather.say("Re enter your 4 digit PINto confirm.");

  vr.say("No input received.");
  vr.redirect({ method: "POST" }, urlJoin(baseUrl, "/twilio/voice"));
  return sendXml(reply, vr);
}

export function ivrRegisterPinConfirm(req: TwilioReq, reply: FastifyReply) {
  const vr = new VoiceResponse();
  const baseUrl = getBaseUrl();

  const callSid = getCallSid(req.body);
  const state = getState(callSid);
  const digitsRaw = getDigits(req.body);

  if (!state || state.step !== "register_pin_confirm") {
    vr.say("Session expired. Returning to the main menu.");
    vr.redirect({ method: "POST" }, urlJoin(baseUrl, "/twilio/voice"));
    return sendXml(reply, vr);
  }

  if (!isDigits(digitsRaw) || digitsRaw.length !== 4) {
    vr.say("That confirmation PINis not valid.");
    clearState(callSid);
    vr.redirect({ method: "POST" }, urlJoin(baseUrl, "/twilio/voice"));
    return sendXml(reply, vr);
  }

  if (digitsRaw !== state.pin) {
    vr.say("Those PINnumbers did not match. Please try again.");
    clearState(callSid);
    vr.pause({ length: 1 });
    vr.redirect({ method: "POST" }, urlJoin(baseUrl, "/twilio/register"));
    return sendXml(reply, vr);
  }

  const caller = getCaller(req.body);
  const acct = createAccount({
    caller,
    memberId: state.memberId,
    pin: state.pin,
  });

  setAuthed(callSid, caller);

  vr.say("Your account is created.");
  vr.pause({ length: 1 });

  vr.say("To finalize your account, email this confirmation code to support.");
  vr.say("Your confirmation code is.");
  sayDigitsSlow(vr, acct.confirmationCode);

  setState(callSid, {
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
