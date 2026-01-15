import Fastify from "fastify";
import dotenv from "dotenv";
import formbody from "@fastify/formbody";

import {
  ivrEntry,
  ivrMenu,
  ivrTransferAmount,
  ivrTransferRecipient,
  ivrTransferConfirm,
} from "./ivr";
import { ivrBalance, ivrBalanceInput } from "./ivr/handlers";

dotenv.config();

const app = Fastify({ logger: true });

async function start() {
  await app.register(formbody);

  app.get("/health", async () => ({ status: "ok" }));

  app.post("/twilio/voice", ivrEntry);
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
