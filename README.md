# HibaKurdieh_214000820

# Business Logic Vulnerability Lab

A small Node.js/Express lab that demonstrates two **business logic vulnerabilities** in a subscription workflow, together with their **secure implementations**. The project is designed as a hands‑on Web Security exercise and can be run locally in a few steps.


## Features

- Simple subscription state machine (`REGISTERED → PLAN_SELECTED → PAYMENT_PENDING → ACTIVE`)
- Two vulnerable flows + two secure flows:
  - Payment callback bypass vs secure payment callback
  - Refund abuse vs secure refund with validation and idempotency
- Single‑page HTML UI to trigger normal, vulnerable, and secure flows
- JSON API exposing current state and a small in‑memory audit log

## Tech stack

- Node.js + Express
- TypeScript (compiled to `dist/server.js`)
- Static frontend: HTML, CSS, vanilla JavaScript

## Run locally

From the project root:

```bash
npm install
npm run build
npm run dev
```

Then open `http://localhost:3000` in your browser.

## Project layout (high‑level)

- `src/server.ts` — Express app and HTTP routes
- `src/subscription.ts` — subscription state, vulnerable + secure logic, audit log
- `src/state/subscriptionState.ts` — subscription state enum
- `public/index.html` — interactive demo UI
- `dist/` — compiled JavaScript (after `npm run build`)


