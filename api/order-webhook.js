const fs = require("fs");
const os = require("os");
const path = require("path");
const { validatePayload } = require("../backend/webhook-handler");

const LAST_WEBHOOK_FILE = path.join(os.tmpdir(), "gdgoc-hozai-last-webhook.json");
const STATUS_CALLBACK_URL = "https://flipsidepk.netlify.app/api/order/status";

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

async function sendStatusUpdate(orderId) {
  const statusPayload = {
    order_id: orderId,
    status: "manual", // hardcoded until real status logic is implemented
    reason: "manual status test",
    timestamp: new Date().toISOString(),
    source: "webhook_processor",
  };

  try {
    const response = await fetch(STATUS_CALLBACK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(statusPayload),
    });

    const responseBody = await response.json().catch(() => null);
    return {
      ok: response.ok,
      status: response.status,
      body: responseBody,
      payload: statusPayload,
    };
  } catch (error) {
    console.error("Failed to send status update:", error);
    return {
      ok: false,
      status: 500,
      body: { error: error.message },
      payload: statusPayload,
    };
  }
}

module.exports = async (req, res) => {
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

  const statusResult = await sendStatusUpdate(orderId);
  console.log("[order-webhook] status callback result:", statusResult);

  return res.status(200).json({
    ok: true,
    accepted: true,
    order_id: orderId,
    status_callback: {
      url: STATUS_CALLBACK_URL,
      status: statusResult.payload.status,
      success: statusResult.ok,
      response_status: statusResult.status,
      response_body: statusResult.body,
    },
  });
};
