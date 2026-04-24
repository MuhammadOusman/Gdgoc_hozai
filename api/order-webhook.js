const fs = require("fs");
const os = require("os");
const path = require("path");
const { validatePayload } = require("../backend/webhook-handler");

const LAST_WEBHOOK_FILE = path.join(os.tmpdir(), "gdgoc-hozai-last-webhook.json");

function saveLastPayload(payload) {
  const record = {
    received_at: new Date().toISOString(),
    payload,
  };

  try {
    fs.writeFileSync(LAST_WEBHOOK_FILE, JSON.stringify(record, null, 2), "utf8");
  } catch (error) {
    console.error("Failed to save last webhook payload:", error);
  }
}

module.exports = (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  const payload = req.body;
  if (!payload || typeof payload !== "object") {
    return res.status(400).json({ ok: false, error: "invalid_json" });
  }

  const validationErrors = validatePayload(payload);
  if (validationErrors.length > 0) {
    return res.status(422).json({ ok: false, error: "validation_failed", details: validationErrors });
  }

  const orderId = payload.order_id;
  console.log(`[order-webhook] accepted webhook order_id=${orderId}`);
  console.log(JSON.stringify(payload, null, 2));
  saveLastPayload(payload);

  return res.status(200).json({ ok: true, accepted: true, order_id: orderId });
};
