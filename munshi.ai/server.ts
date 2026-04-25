import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GOOGLE_SHEET_API = "https://script.google.com/macros/s/AKfycbxPNhvPdHM29jTWgMFUHO-Zs-8gcgxfVM8t-TbSdLzaBar9aPmvkKiCfCdp6NOeGSmSSQ/exec";

function normalizeInventoryItem(item: any, index: number) {
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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Munshi.Ai Backend is live!" });
  });

  // Dynamic inventory API proxying to Google Sheets
  app.get("/api/inventory", async (req, res) => {
    try {
      // Adding ?sheet=Inventory parameter as required by the script
      const response = await axios.get(`${GOOGLE_SHEET_API}?sheet=Inventory`);
      const rawData = response.data;
      
      if (!Array.isArray(rawData)) {
        throw new Error("Invalid data format received from Google Sheets");
      }

      const mappedData = rawData
        .map((item: any, index: number) => normalizeInventoryItem(item, index))
        .filter((item: any) => item.name.trim() !== "Unknown item" && item.id.trim() !== "");
      res.json(mappedData);
    } catch (error: any) {
      console.error("Error fetching inventory:", error.message);
      res.status(500).json({ error: "Failed to fetch inventory", details: error.message });
    }
  });

  app.post("/api/inventory", async (req, res) => {
    try {
      const { sheet_name, ...orderData } = req.body;
      const targetSheet = sheet_name || "Orders";
      
      // Some scripts are case-sensitive or look for 'tab' vs 'sheet'
      const targetUrl = new URL(GOOGLE_SHEET_API);
      targetUrl.searchParams.set("sheet", targetSheet);
      targetUrl.searchParams.set("tab", targetSheet);
      targetUrl.searchParams.set("sheetName", targetSheet);
      
      console.log(`[SYNC] Targeting Sheet: ${targetSheet}`);
      
      // Multi-key alphabetizing approach for dumb scripts:
      // We prefix keys with v01, v02... because most Apps Scripts 
      // sort keys alphabetically before appending to the row.
      const alphabetizedData = {
        v01_tenant_id: orderData.tenant_id,
        v02_customer_name: orderData.customer_name,
        v03_phone: orderData.phone,
        v04_address: orderData.address,
        v05_city: orderData.city,
        v06_product_id: orderData.product_id,
        v07_payment_method: orderData.payment_method,
        v08_advance_paid: orderData.advance_paid,
        v09_order_status: orderData.order_status,
        v10_created_at: orderData.created_at
      };

      const response = await axios.post(targetUrl.toString(), alphabetizedData, {
        headers: { 'Content-Type': 'application/json' },
        maxRedirects: 10
      });
      
      const data = response.data;
      const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
      console.log("Sheet Response:", dataStr);
      
      res.json({ 
        success: true, 
        message: dataStr.toLowerCase().includes('success') ? "Sheet Updated" : "Sent", 
        details: data 
      });
    } catch (error: any) {
      console.error("Sync Error:", error.message);
      res.status(500).json({ error: "Sync failed", details: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
