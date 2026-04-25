const fs = require("fs");
const os = require("os");
const path = require("path");

const LAST_WEBHOOK_FILE = path.join(os.tmpdir(), "gdgoc-hozai-last-webhook.json");
const STATUS_CALLBACK_URL = process.env.STATUS_CALLBACK_URL || "https://flipsidepk.netlify.app/api/order/status";

function writeJson(filePath, payload) {
	try {
		fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
	} catch (error) {
		console.error(`Failed to write JSON file ${filePath}:`, error);
	}
}

const safeStr = (value) => (typeof value === "string" ? value.trim() : "");

function validatePayload(payload) {
	const errors = [];

	if (!payload || typeof payload !== "object") {
		return ["payload must be an object"];
	}

	if (!safeStr(payload.order_id)) errors.push("order_id is required");

	if (!payload.customer || typeof payload.customer !== "object") {
		errors.push("customer is required");
	} else {
		if (!safeStr(payload.customer.name)) errors.push("customer.name is required");
		if (!safeStr(payload.customer.phone)) errors.push("customer.phone is required");
	}

	if (!payload.shipping || typeof payload.shipping !== "object") {
		errors.push("shipping is required");
	} else {
		if (!safeStr(payload.shipping.address)) errors.push("shipping.address is required");
		if (!safeStr(payload.shipping.city)) errors.push("shipping.city is required");
	}

	if (!payload.order || typeof payload.order !== "object") {
		errors.push("order is required");
	} else {
		if (!safeStr(payload.order.name)) errors.push("order.name is required");
		if (!safeStr(payload.order.size)) errors.push("order.size is required");
		if (typeof payload.order.qty !== "number") errors.push("order.qty must be a number");
	}

	if (!payload.customer_history || typeof payload.customer_history !== "object") {
		errors.push("customer_history is required");
	} else {
		if (typeof payload.customer_history.prior_orders !== "number") errors.push("customer_history.prior_orders must be a number");
		if (typeof payload.customer_history.prior_rto !== "number") errors.push("customer_history.prior_rto must be a number");
	}

	return errors;
}

function saveWebhookPayload(payload) {
	writeJson(LAST_WEBHOOK_FILE, {
		received_at: new Date().toISOString(),
		payload,
	});
}

async function sendStatusUpdate(orderId) {
	const statusPayload = {
		order_id: orderId,
		status: "manual",
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
	saveWebhookPayload(payload);

	const statusResult = await sendStatusUpdate(orderId);

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
