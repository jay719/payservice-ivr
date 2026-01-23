MyiBot (PayService IVR)
Overview

MyiBot is a backend-only IVR application built on Twilio Voice for secure, DTMF-only phone interactions.
It is designed for low-bandwidth, high-latency environments such as correctional facilities and works without speech recognition or a web frontend.

The system currently supports:

Account creation via phone call

4-digit PIN authentication

Balance inquiry (mocked)

Money transfer flow (mocked submission)

Confirmation code generation for offline verification

The application is deployed on Fly.io and exposed via HTTPS for Twilio webhooks.

Core Design Constraints (Intentional)

These are non-negotiable design decisions already implemented:

No frontend UI

No speech recognition

DTMF input only

No email sent from IVR

No SMS flows

No plaintext PIN storage

Calm, predictable IVR pacing

Explicit redirects after every gather

Minimal state retained per call

Tech Stack (Current)
Runtime & Language

Node.js 20

TypeScript

Backend Framework

Fastify

IVR Provider

Twilio Voice

TwiML responses only

No Twilio SDK auth usage yet (no REST calls)

Hosting

Fly.io (single app deployed)

Docker-based deployment

State Management

In-memory Map keyed by CallSid

Used only for in-call flow state

Cleared on completion or cancellation

Account Storage

In-memory Map keyed by caller phone number

This is temporary and demo-only

Designed to be replaced with Postgres

Repository Structure (Current)
payservice/
├─ apps/
│  └─ api/
│     ├─ src/
│     │  ├─ index.ts               # Fastify server + route registration
│     │  ├─ ivr/
│     │  │  ├─ entry.ts            # Entry prompt (PIN or # for new account)
│     │  │  ├─ auth.ts             # PIN auth + redirect to register
│     │  │  ├─ register.ts         # Account creation flow
│     │  │  ├─ handlers.ts         # Menu, balance, transfer flows
│     │  │  ├─ state.ts            # In-memory per-call state
│     │  │  ├─ accounts.ts         # In-memory accounts store
│     │  │  ├─ authState.ts        # Authenticated CallSid tracking
│     │  │  └─ utils.ts            # Twilio helpers + type guards
│     ├─ tsconfig.json
│     ├─ package.json
│     └─ Dockerfile
├─ pnpm-workspace.yaml
├─ package.json
└─ README.md


No frontend directories exist by design.

Environment Variables
Required
PORT=3001
BASE_URL=https://myibot.fly.dev


BASE_URL must match the public HTTPS Fly.io domain.

Twilio webhooks rely on this for redirects.

Fly Secrets

These are set via:

fly secrets set BASE_URL=https://myibot.fly.dev
fly secrets set PORT=3001


Ngrok is no longer required.

IVR Call Flow (Implemented)
Entry (POST /twilio/voice)

Prompts user:

Enter 4-digit PIN

Press # to create a new account

Uses <Gather finishOnKey="#">

Authentication (POST /twilio/auth)

If digits empty or # → redirect to registration

Validates 4-digit PIN

Hash comparison only (no plaintext)

On success → menu

Registration Flow

Enter 6-digit inmate/member ID

Create 4-digit PIN

Confirm PIN

Account created in memory

6-digit confirmation code generated

Confirmation code spoken slowly

User can repeat code or continue

Main Menu

1 → Balance

2 → Send money

3 → Repeat menu

Balance

Mock balance response

Repeat or return to menu

Transfers

Amount entry (4 digits)

Recipient code entry (6 digits)

Confirm or cancel

Submission is mocked

Security Decisions (Current)

PINs are hashed before storage

No PIN is ever spoken back

No PIN logged

Caller phone number is the account key

Confirmation codes are time-agnostic for now

Not implemented yet:

Rate limiting

Account lockout

Fraud detection

Transfer settlement

Email verification

Deployment (Fly.io)
Docker

App runs entirely inside Docker

No persistent disk storage

Stateless by design

Status

App is live at:

https://myibot.fly.dev

Twilio Configuration

Voice webhook points to:

POST https://myibot.fly.dev/twilio/voice

What Is Explicitly NOT Implemented

This list exists to avoid confusion:

❌ Postgres database

❌ Prisma

❌ Stripe

❌ Email sending

❌ SMS

❌ Admin UI

❌ Multi-region DB

❌ Persistent account storage

❌ CI/CD pipelines

These are planned, not present.

Known Limitations (Accepted for MVP)

Restarting the app wipes all accounts

Confirmation codes are not expiring yet

Transfers are not settled

Single-region deployment

No analytics or logging dashboard

Next Planned Backend Phase (Confirmed Direction)

This will be the next step, not yet done:

Fly.io Postgres

Prisma schema + migrations

Argon2id for PIN hashing

Replace accounts.ts with DB access

Confirmation status persisted

Stripe customer linkage later

How to Run Locally
pnpm install
pnpm --filter api build
pnpm --filter api start


Local server listens on port 3001.

How to Deploy Updates
fly deploy

Important Notes for Future Contributors

Do not introduce speech recognition

Do not add frontend UI

Do not redesign IVR flow without explicit approval

Always validate DTMF strictly

Prefer clarity over cleverness

Status Summary

Current state:
✔ Deployed
✔ Call flow working
✔ Auth + registration working
✔ Ready for database integration

