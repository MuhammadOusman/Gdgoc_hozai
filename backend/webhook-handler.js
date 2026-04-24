const safeStr = (value) => (typeof value === "string" ? value.trim() : "");

function validatePayload(payload) {
  const errors = [];

  if (!payload || typeof payload !== "object") {
    return ["payload must be an object"];
  }

  if (!safeStr(payload.order_id)) {
    errors.push("order_id is required");
  }

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
    if (typeof payload.customer_history.prior_orders !== "number") {
      errors.push("customer_history.prior_orders must be a number");
    }
    if (typeof payload.customer_history.prior_rto !== "number") {
      errors.push("customer_history.prior_rto must be a number");
    }
  }

  return errors;
}

function isAuthorized(req) {
  const secret = process.env.WEBHOOK_BEARER_SECRET || "";
  if (!secret) {
    return true;
  }
  const auth = req.headers.authorization || "";
  return auth === `Bearer ${secret}`;
}

module.exports = {
  validatePayload,
  isAuthorized,
};
