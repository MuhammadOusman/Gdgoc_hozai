const fs = require("fs");
const os = require("os");
const path = require("path");

const LAST_WEBHOOK_FILE = path.join(os.tmpdir(), "gdgoc-hozai-last-webhook.json");

module.exports = (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  try {
    if (!fs.existsSync(LAST_WEBHOOK_FILE)) {
      return res.status(200).json({ ok: true, has_payload: false, message: "No webhook received yet." });
    }

    const raw = fs.readFileSync(LAST_WEBHOOK_FILE, "utf8");
    const data = JSON.parse(raw);
    return res.status(200).json({ ok: true, has_payload: true, ...data });
  } catch (error) {
    console.error("Failed to read last webhook payload:", error);
    return res.status(500).json({ ok: false, error: "failed_to_read_payload" });
  }
};
