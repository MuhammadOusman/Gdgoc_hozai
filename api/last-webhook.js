const { LAST_WEBHOOK_FILE } = require("../backend/helpers/constants");
const { readJson } = require("../backend/helpers/storage");

module.exports = (req, res) => {
	if (req.method !== "GET") {
		return res.status(405).json({ ok: false, error: "method_not_allowed" });
	}

	const data = readJson(LAST_WEBHOOK_FILE);

	if (!data) {
		return res.status(200).json({ ok: true, has_payload: false, message: "No webhook received yet." });
	}

	return res.status(200).json({ ok: true, has_payload: true, ...data });
};
