import Fastify from "fastify";
import dotenv from "dotenv";
import formbody from "@fastify/formbody";

import {
  ivrEntry,
  ivrAuth,
  ivrMenu,
  ivrTransferAmount,
  ivrTransferRecipient,
  ivrTransferConfirm,
  ivrRegisterStart,
  ivrRegisterId,
  ivrRegisterPin,
  ivrRegisterPinConfirm,
  ivrRegisterCodeMenu,
  ivrRegisterCodeInput,
  ivrBalance,
  ivrBalanceInput,
} from "./ivr";

dotenv.config();

const app = Fastify({ logger: true });

async function start() {
  await app.register(formbody);

  app.get("/health", async () => ({ status: "ok" }));

  app.post("/twilio/voice", ivrEntry);
  app.post("/twilio/auth", ivrAuth);

  app.post("/twilio/register", ivrRegisterStart);
  app.post("/twilio/register/id", ivrRegisterId);
  app.post("/twilio/register/pin", ivrRegisterPin);
  app.post("/twilio/register/pin/confirm", ivrRegisterPinConfirm);
  app.post("/twilio/register/code/menu", ivrRegisterCodeMenu);
  app.post("/twilio/register/code/input", ivrRegisterCodeInput);

  app.post("/twilio/menu", ivrMenu);

  app.post("/twilio/transfer/amount", ivrTransferAmount);
  app.post("/twilio/transfer/recipient", ivrTransferRecipient);
  app.post("/twilio/transfer/confirm", ivrTransferConfirm);

  app.post("/twilio/balance", ivrBalance);
  app.post("/twilio/balance/input", ivrBalanceInput);

  const port = Number(process.env.PORT || 3001);
  await app.listen({ port, host: "0.0.0.0" });
}

start().catch((err) => {
  app.log.error(err);
  process.exit(1);
});
