# Backend

This folder contains shared backend logic for webhook handling and future server-side features.

- `webhook-handler.js` contains request validation and webhook authorization logic.
- `api/order-webhook.js` is the Vercel serverless endpoint that receives the webhook.
- `api/health.js` is the Vercel health check endpoint.
