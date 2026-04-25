const GOOGLE_SHEET_API = "https://script.google.com/macros/s/AKfycbxPNhvPdHM29jTWgMFUHO-Zs-8gcgxfVM8t-TbSdLzaBar9aPmvkKiCfCdp6NOeGSmSSQ/exec";

function normalizeInventoryItem(item, index) {
  return {
    id: String(item.id || item.slug || index + 1),
    name: String(item.name || [item.brand, item.model].filter(Boolean).join(" ") || "Unknown item"),
    size: String(item.size || item.size_eur || item.size_us || item.variant || ""),
    price: Number(item.price || item.sale_price || item.amount || 0),
    stock: Number(item.stock ?? (item.status === "available" ? 1 : 0)),
    category: String(item.category || item.brand || item.type || "Uncategorized"),
    description: String(item.description || item.condition || item.condition_grade || ""),
    _original: item,
  };
}

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  try {
    const response = await fetch(`${GOOGLE_SHEET_API}?sheet=Inventory`);
    const rawData = await response.json();

    if (!Array.isArray(rawData)) {
      return res.status(500).json({ ok: false, error: "invalid_inventory_format" });
    }

    const data = rawData
      .map((item, index) => normalizeInventoryItem(item, index))
      .filter((item) => item.name.trim() !== "Unknown item" && item.id.trim() !== "");

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ ok: false, error: "inventory_fetch_failed", details: error.message });
  }
};
