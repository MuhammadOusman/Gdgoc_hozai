const fs = require("fs");
const os = require("os");
const path = require("path");

const LAST_STATUS_FILE = path.join(os.tmpdir(), "gdgoc-hozai-last-status.json");

module.exports = (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  try {
    if (!fs.existsSync(LAST_STATUS_FILE)) {
      return res.status(200).json({ ok: true, has_payload: false, message: "No status update received yet." });
    }

    const raw = fs.readFileSync(LAST_STATUS_FILE, "utf8");
    const data = JSON.parse(raw);
    return res.status(200).json({ ok: true, has_payload: true, ...data });
  } catch (error) {
    console.error("Failed to read last status payload:", error);
    return res.status(500).json({ ok: false, error: "failed_to_read_status" });
  }
};
