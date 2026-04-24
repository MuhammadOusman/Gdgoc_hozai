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

function saveLastStatus(record) {
  try {
    fs.writeFileSync(LAST_STATUS_FILE, JSON.stringify(record, null, 2), "utf8");
  } catch (error) {
    console.error("Failed to save last status payload:", error);
  }
}

module.exports = (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  const payload = req.body;
  if (!payload || typeof payload !== "object") {
    return res.status(400).json({ ok: false, error: "invalid_json" });
  }

  const { order_id, status, reason, timestamp, source } = payload;
  const validationErrors = [];

  if (!order_id || typeof order_id !== "string") {
    validationErrors.push("order_id is required");
  }

  if (!status || typeof status !== "string" || !statusMap[status]) {
    validationErrors.push("status is required and must be one of confirm, cancelled, manual");
  }

  if (validationErrors.length > 0) {
    return res.status(422).json({ ok: false, error: "validation_failed", details: validationErrors });
  }

  const acceptedStatus = statusMap[status];
  const productState = productStateMap[status] || null;
  const record = {
    received_at: new Date().toISOString(),
    order_id,
    status,
    accepted_status: acceptedStatus,
    product_state: productState,
    reason: reason || null,
    timestamp: timestamp || null,
    source: source || null,
  };

  saveLastStatus(record);

  return res.status(200).json({
    ok: true,
    accepted: true,
    order_id,
    status,
    accepted_status: acceptedStatus,
    product_state: productState,
  });
};
