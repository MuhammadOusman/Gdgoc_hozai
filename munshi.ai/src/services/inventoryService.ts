const API_BASE = '';

const normalizeInventoryItem = (item: any, index: number) => ({
  id: String(item.id ?? item.slug ?? index + 1),
  name: String(item.name ?? [item.brand, item.model].filter(Boolean).join(' ') ?? 'Unknown item'),
  size: String(item.size ?? item.size_eur ?? item.size_us ?? item.variant ?? ''),
  price: Number(item.price ?? item.sale_price ?? item.amount ?? 0),
  stock: Number(item.stock ?? (item.status === 'available' ? 1 : 0)),
  category: String(item.category ?? item.brand ?? item.type ?? 'Uncategorized'),
  description: String(item.description ?? item.condition ?? item.condition_grade ?? ''),
  _original: item,
});

export const fetchInventory = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/inventory`);
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    if (!Array.isArray(data)) {
      return [];
    }
    return data.map(normalizeInventoryItem);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    throw error;
  }
};

export const syncOrder = async (payload: any) => {
  try {
    const response = await fetch('/api/inventory', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Network response was not ok');
    return await response.json();
  } catch (error) {
    console.error('Error syncing order:', error);
    throw error;
  }
};
