const { validatePayload } = require("../backend/webhook-handler");

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

  return res.status(200).json({ ok: true, accepted: true, order_id: orderId });
};
