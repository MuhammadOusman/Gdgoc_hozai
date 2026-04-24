const { validatePayload } = require("../backend/webhook-handler");
const { processWebhook } = require("../backend/modules/order-webhook-module");

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

	const result = await processWebhook(payload);
	return res.status(200).json(result);
};
