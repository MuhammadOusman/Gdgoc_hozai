const fs = require("fs");
const os = require("os");
const path = require("path");

const LAST_STATUS_FILE = path.join(os.tmpdir(), "gdgoc-hozai-last-status.json");

const statusMap = {
	confirm: "processing",
	cancelled: "returned_fake",
	manual: "pending_verification",
};

const productStateMap = {
	confirm: "sold",
	cancelled: "available",
};

function writeJson(filePath, payload) {
	try {
		fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
	} catch (error) {
		console.error(`Failed to write JSON file ${filePath}:`, error);
	}
}

function validateStatusPayload(payload) {
	const validationErrors = [];

	if (!payload || typeof payload !== "object") {
		validationErrors.push("invalid_json");
		return validationErrors;
	}

	if (!payload.order_id || typeof payload.order_id !== "string") {
		validationErrors.push("order_id is required");
	}

	if (!payload.status || typeof payload.status !== "string" || !statusMap[payload.status]) {
		validationErrors.push("status is required and must be one of confirm, cancelled, manual");
	}

	return validationErrors;
}

function processOrderStatus(payload) {
	const acceptedStatus = statusMap[payload.status];
	const productState = productStateMap[payload.status] || null;

	const record = {
		received_at: new Date().toISOString(),
		order_id: payload.order_id,
		status: payload.status,
		accepted_status: acceptedStatus,
		product_state: productState,
		reason: payload.reason || null,
		timestamp: payload.timestamp || null,
		source: payload.source || null,
	};

	writeJson(LAST_STATUS_FILE, record);

	return {
		ok: true,
		accepted: true,
		order_id: payload.order_id,
		status: payload.status,
		accepted_status: acceptedStatus,
		product_state: productState,
	};
}

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
