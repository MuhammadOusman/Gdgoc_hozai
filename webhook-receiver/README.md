# Webhook Receiver (Third-Party Side)

This folder contains a standalone webhook receiver your external developer can run.

> Note: this is a legacy local receiver. The repo now also includes a Vercel-friendly backend under `api/` and shared validation logic under `backend/`.
>
> Use `api/order-webhook` with `vercel.json` rewrites for deployment.

It listens for order webhook events from your store and implements:

- JSON parsing
- required field validation
- optional bearer token auth
- idempotency by `order_id`
- request and event logging

## 1) Configure

Create `.env` in this folder (or set env vars in your shell):

```bash
PORT=4010
WEBHOOK_PATH=/order-webhook
WEBHOOK_BEARER_SECRET=
```

- `WEBHOOK_BEARER_SECRET` should match `THIRD_PARTY_WEBHOOK_SECRET` from your store.
- Leave it empty to disable auth checks.

## 2) Start

```bash
npm start
```

Or, if you prefer:

```bash
node receiver.js
```

You should see:

```text
[receiver] listening on http://localhost:4010/order-webhook
[receiver] health check on /health
```

When a valid webhook arrives, the receiver prints the parsed payload to the console so you can inspect it on screen.

## 3) Test locally

```bash
curl -X POST http://localhost:4010/order-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "order_id":"abc-123",
    "customer":{"name":"Ali Khan","phone":"03001234567"},
    "shipping":{"address":"Shahrah-e-Faisal, Karachi","city":"Karachi"},
    "order":{"name":"Nike Air Jordan 1 Mid","size":"41 EUR","qty":1},
    "customer_history":{"prior_orders":7,"prior_rto":0}
  }'
```

Expected response:

```json
{"ok":true,"accepted":true,"order_id":"abc-123"}
```

If you send same `order_id` again, response is still 200 but marked duplicate:

```json
{"ok":true,"accepted":false,"duplicate":true,"order_id":"abc-123"}
```

## 4) Files generated at runtime

- `data/processed-orders.json` : idempotency store
- `logs/events.log` : accepted and duplicate events
- `logs/errors.log` : malformed/unauthorized/processing errors

## 5) Point your store to this endpoint

On your store side, set:

```bash
THIRD_PARTY_WEBHOOK_URL=http://localhost:4010/order-webhook
THIRD_PARTY_WEBHOOK_SECRET=<same value as WEBHOOK_BEARER_SECRET>
```

For internet-facing use, expose this receiver behind HTTPS (e.g., Cloudflare Tunnel, ngrok, server deployment).
