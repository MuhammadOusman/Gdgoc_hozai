const fs = require("fs");
const os = require("os");
const path = require("path");

const LAST_WEBHOOK_FILE = path.join(os.tmpdir(), "gdgoc-hozai-last-webhook.json");

function readJson(filePath) {
	try {
		if (!fs.existsSync(filePath)) {
			return null;
		}
		const raw = fs.readFileSync(filePath, "utf8");
		return JSON.parse(raw);
	} catch (error) {
		console.error(`Failed to read JSON file ${filePath}:`, error);
		return null;
	}
}

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
