import axios from "axios";

const GOOGLE_SHEET_API = "https://script.google.com/macros/s/AKfycbxPNhvPdHM29jTWgMFUHO-Zs-8gcgxfVM8t-TbSdLzaBar9aPmvkKiCfCdp6NOeGSmSSQ/exec";

export async function fetchInventory() {
  try {
    const response = await axios.get(`${GOOGLE_SHEET_API}?sheet=Inventory`);
    const rawData = response.data;

    if (!Array.isArray(rawData)) {
      throw new Error("Invalid data format received from Google Sheets");
    }

    return rawData.map((item, index) => ({
      id: item.slug || String(index + 1),
      name: `${item.brand} ${item.model}`,
      size: String(item.size_eur),
      price: Number(item.price),
      stock: item.status === 'available' ? 1 : 0,
      category: item.brand,
      description: `${item.brand} ${item.model} Condition: ${item.condition_grade}`,
      _original: item
    }));
  } catch (error: any) {
    console.error("Error fetching inventory:", error.message);
    throw error;
  }
}

export async function syncOrder(orderData: any) {
  try {
    const targetSheet = orderData.sheet_name || "Orders";
    const targetUrl = new URL(GOOGLE_SHEET_API);
    targetUrl.searchParams.set("sheet", targetSheet);

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
    });

    return response.data;
  } catch (error: any) {
    console.error("Sync Error:", error.message);
    throw error;
  }
}
