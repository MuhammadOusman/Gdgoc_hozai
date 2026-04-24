const fs = require("fs");

function writeJson(filePath, payload) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
    return true;
  } catch (error) {
    console.error(`Failed to write JSON file ${filePath}:`, error);
    return false;
  }
}

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

module.exports = {
  writeJson,
  readJson,
};
