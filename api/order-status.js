const { processOrderStatus, validateStatusPayload } = require("../backend/modules/order-status-module");

module.exports = (req, res) => {
	if (req.method !== "POST") {
		return res.status(405).json({ ok: false, error: "method_not_allowed" });
	}

	const payload = req.body;
	const validationErrors = validateStatusPayload(payload);

	if (validationErrors.includes("invalid_json")) {
		return res.status(400).json({ ok: false, error: "invalid_json" });
	}

	if (validationErrors.length > 0) {
		return res.status(422).json({ ok: false, error: "validation_failed", details: validationErrors });
	}

	const result = processOrderStatus(payload);
	return res.status(200).json(result);
};
