const os = require("os");
const path = require("path");

const LAST_WEBHOOK_FILE = path.join(os.tmpdir(), "gdgoc-hozai-last-webhook.json");
const LAST_STATUS_FILE = path.join(os.tmpdir(), "gdgoc-hozai-last-status.json");
const STATUS_CALLBACK_URL = "https://flipsidepk.netlify.app/api/order/status";

module.exports = {
  LAST_WEBHOOK_FILE,
  LAST_STATUS_FILE,
  STATUS_CALLBACK_URL,
};
