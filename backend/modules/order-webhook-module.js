const { LAST_WEBHOOK_FILE, STATUS_CALLBACK_URL } = require("../helpers/constants");
const { writeJson } = require("../helpers/storage");

function saveWebhookPayload(payload) {
  const record = {
    received_at: new Date().toISOString(),
    payload,
  };

  writeJson(LAST_WEBHOOK_FILE, record);
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

async function processWebhook(payload) {
  const orderId = payload.order_id;
  console.log(`[order-webhook] accepted webhook order_id=${orderId}`);
  console.log(JSON.stringify(payload, null, 2));

  saveWebhookPayload(payload);

  const statusResult = await sendStatusUpdate(orderId);
  console.log("[order-webhook] status callback result:", statusResult);

  return {
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
  };
}

module.exports = {
  processWebhook,
};
