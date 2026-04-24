# Gdgoc_hozai

Production-ready webhook receiver and callback bridge deployed on Vercel.

## What This Service Does

- Receives order webhooks from the store at `/order-webhook`
- Validates incoming payloads
- Logs and exposes the latest received webhook for on-screen debugging
- Sends a status callback to the store endpoint with hardcoded status `manual` (temporary)
- Accepts store status updates at `/order-status`

## Repository Structure

```text
api/
  health.js          # Thin wrapper to backend route
  last-status.js     # Thin wrapper to backend route
  last-webhook.js    # Thin wrapper to backend route
  order-status.js    # Thin wrapper to backend route
  order-webhook.js   # Thin wrapper to backend route
backend/
  helpers/
    constants.js     # Shared constants (files, callback URL)
    storage.js       # JSON read/write utilities
  modules/
    order-status-module.js   # Status API business logic
    order-webhook-module.js  # Webhook processing + outbound callback logic
  webhook-handler.js # Shared payload validation helpers
index.html           # Simple UI to view and test webhook activity
package.json         # Project scripts
vercel.json          # Route rewrites
```

## API Endpoints

- `GET /health`
- `POST /order-webhook`
- `GET /api/last-webhook`
- `POST /order-status`
- `GET /api/last-status`

## Current Callback Behavior

On every valid `/order-webhook` event, this service sends:

- `POST https://flipsidepk.netlify.app/api/order/status`
- Payload includes `order_id`, `status`, `reason`, `timestamp`, `source`
- `status` is currently hardcoded to `manual`

## Local Development

```bash
npm install -g vercel
npm run dev
```

Open:
- `http://localhost:3000`

## Deploy

Connect this repo to Vercel with root directory set to `./`.

Production URLs:
- `https://gdgoc-hozai.vercel.app`
- `https://gdgoc-hozai.vercel.app/order-webhook`
- `https://gdgoc-hozai.vercel.app/order-status`
