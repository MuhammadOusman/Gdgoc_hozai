const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzpKshx6m_466vS10yKNoQOfpZ1_S_2zYI-r66YkQshh_W0u29_49-jY5mO78_49-j/exec';

export const fetchInventory = async () => {
  try {
    const response = await fetch(`${SCRIPT_URL}?action=getInventory`);
    if (!response.ok) throw new Error('Network response was not ok');
    return await response.json();
  } catch (error) {
    console.error('Error fetching inventory:', error);
    throw error;
  }
};

export const syncOrder = async (payload: any) => {
  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
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
