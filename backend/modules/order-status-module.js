const { LAST_STATUS_FILE } = require("../helpers/constants");
const { writeJson } = require("../helpers/storage");

const statusMap = {
  confirm: "processing",
  cancelled: "returned_fake",
  manual: "pending_verification",
};

const productStateMap = {
  confirm: "sold",
  cancelled: "available",
};

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

module.exports = {
  validateStatusPayload,
  processOrderStatus,
};
