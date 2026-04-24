const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 4010);
const WEBHOOK_PATH = process.env.WEBHOOK_PATH || "/order-webhook";
const WEBHOOK_BEARER_SECRET = process.env.WEBHOOK_BEARER_SECRET || "";

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const LOG_DIR = path.join(ROOT, "logs");
const PROCESSED_FILE = path.join(DATA_DIR, "processed-orders.json");
const EVENTS_LOG = path.join(LOG_DIR, "events.log");
const ERRORS_LOG = path.join(LOG_DIR, "errors.log");

function ensureDirs() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(LOG_DIR, { recursive: true });
  if (!fs.existsSync(PROCESSED_FILE)) {
    fs.writeFileSync(PROCESSED_FILE, JSON.stringify({ order_ids: [] }, null, 2));
  }
}

function appendLog(filePath, payload) {
  const line = `${new Date().toISOString()} ${payload}\n`;
  fs.appendFileSync(filePath, line, "utf8");
}

function readProcessedIds() {
  try {
    const raw = fs.readFileSync(PROCESSED_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.order_ids)) {
      return parsed.order_ids;
    }
    return [];
  } catch {
    return [];
  }
}

function writeProcessedIds(orderIds) {
  fs.writeFileSync(PROCESSED_FILE, JSON.stringify({ order_ids: orderIds }, null, 2));
}

function sendJson(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(json),
  });
  res.end(json);
}

function safeStr(value) {
  return typeof value === "string" ? value.trim() : "";
}

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
  if (!WEBHOOK_BEARER_SECRET) {
    return true;
  }
  const auth = req.headers.authorization || "";
  return auth === `Bearer ${WEBHOOK_BEARER_SECRET}`;
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("request body too large"));
        req.destroy();
      }
    });

    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(new Error("invalid json"));
      }
    });

    req.on("error", reject);
  });
}

async function handleWebhook(req, res) {
  if (!isAuthorized(req)) {
    appendLog(ERRORS_LOG, `401 unauthorized from ${req.socket.remoteAddress || "unknown"}`);
    return sendJson(res, 401, { ok: false, error: "unauthorized" });
  }

  let payload;
  try {
    payload = await parseJsonBody(req);
  } catch (error) {
    appendLog(ERRORS_LOG, `400 invalid json: ${error.message}`);
    return sendJson(res, 400, { ok: false, error: "invalid_json" });
  }

  const validationErrors = validatePayload(payload);
  if (validationErrors.length > 0) {
    appendLog(ERRORS_LOG, `422 validation: ${validationErrors.join("; ")}`);
    return sendJson(res, 422, { ok: false, error: "validation_failed", details: validationErrors });
  }

  const orderId = payload.order_id;
  const processedIds = readProcessedIds();

  if (processedIds.includes(orderId)) {
    console.log(`[receiver] duplicate webhook received for order_id=${orderId}`);
    appendLog(EVENTS_LOG, `duplicate order_id=${orderId}`);
    return sendJson(res, 200, {
      ok: true,
      accepted: false,
      duplicate: true,
      order_id: orderId,
    });
  }

  console.log(`[receiver] accepted webhook order_id=${orderId}`);
  console.log(JSON.stringify(payload, null, 2));
  appendLog(EVENTS_LOG, `accepted order_id=${orderId} payload=${JSON.stringify(payload)}`);

  processedIds.push(orderId);
  writeProcessedIds(processedIds);

  return sendJson(res, 200, {
    ok: true,
    accepted: true,
    order_id: orderId,
  });
}

function notFound(res) {
  sendJson(res, 404, { ok: false, error: "not_found" });
}

function methodNotAllowed(res) {
  sendJson(res, 405, { ok: false, error: "method_not_allowed" });
}

ensureDirs();

const server = http.createServer(async (req, res) => {
  if (req.url === "/health" && req.method === "GET") {
    return sendJson(res, 200, { ok: true });
  }

  if (req.url === WEBHOOK_PATH) {
    if (req.method !== "POST") {
      return methodNotAllowed(res);
    }

    try {
      return await handleWebhook(req, res);
    } catch (error) {
      appendLog(ERRORS_LOG, `500 internal: ${error.message}`);
      return sendJson(res, 500, { ok: false, error: "internal_error" });
    }
  }

  return notFound(res);
});

server.listen(PORT, () => {
  console.log(`[receiver] listening on http://localhost:${PORT}${WEBHOOK_PATH}`);
  console.log("[receiver] health check on /health");
});
