const fs = require("fs");
const os = require("os");
const path = require("path");

const LAST_STATUS_FILE = path.join(os.tmpdir(), "gdgoc-hozai-last-status.json");

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

	const data = readJson(LAST_STATUS_FILE);

	if (!data) {
		return res.status(200).json({ ok: true, has_payload: false, message: "No status update received yet." });
	}

	return res.status(200).json({ ok: true, has_payload: true, ...data });
};
