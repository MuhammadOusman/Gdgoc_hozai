const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fetch = require('node-fetch');
const express = require('express');
const cors = require('cors');

const SHEETDB_URL = 'https://script.google.com/macros/s/AKfycbxPNhvPdHM29jTWgMFUHO-Zs-8gcgxfVM8t-TbSdLzaBar9aPmvkKiCfCdp6NOeGSmSSQ/exec';
const GEMINI_API_KEY = 'AIzaSyBFX21Ry4tkI1Imh9RKsIJbYQFmJk_lhkg';

// ⚡ INIT MODEL ONCE (not on every message)
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// ⚡ CACHE INVENTORY (refresh every 5 min)
let cachedInventory = null;
let inventoryExpiry = 0;

function normalizeInventoryItem(item, index) {
  return {
    id: String(item.id || item.slug || index + 1),
    name: String(item.name || [item.brand, item.model].filter(Boolean).join(' ') || 'Unknown item'),
    size: String(item.size || item.size_eur || item.size_us || item.variant || ''),
    price: Number(item.price || item.sale_price || item.amount || 0),
    stock: Number(item.stock ?? (item.status === 'available' ? 1 : 0)),
    category: String(item.category || item.brand || item.type || 'Uncategorized'),
    description: String(item.description || item.condition || item.condition_grade || ''),
    _original: item,
  };
}

// Chat storage
let chatThreads = {}; // key: chatId, value: { id, customerName, messages: [], unreadCount }

const app = express();
app.use(express.json());
app.use(cors());

// API Endpoints
app.get('/api/chats', (req, res) => {
  const threads = Object.values(chatThreads).map(thread => ({
    id: thread.id,
    customerName: thread.customerName,
    lastMessage: thread.messages.length > 0 ? thread.messages[thread.messages.length - 1].content : '',
    timestamp: thread.messages.length > 0 ? thread.messages[thread.messages.length - 1].timestamp : Date.now(),
    unreadCount: thread.unreadCount || 0,
    messages: thread.messages
  }));
  res.json(threads);
});

app.post('/api/send', async (req, res) => {
  try {
    const { chatId, message } = req.body;
    const chat = await client.getChatById(chatId);
    await chat.sendMessage(message);
    // Add to messages
    if (chatThreads[chatId]) {
      chatThreads[chatId].messages.push({
        id: Date.now().toString(),
        role: 'assistant',
        content: message,
        timestamp: Date.now()
      });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/inventory', async (req, res) => {
  try {
    const inventory = await getInventory();
    const normalized = Array.isArray(inventory)
      ? inventory.map(normalizeInventoryItem).filter(item => item.name.trim() !== 'Unknown item' && item.id.trim() !== '')
      : [];
    res.json(normalized);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const client = new Client({
  authStrategy: new LocalAuth(),
  webVersionCache: {
    type: 'none'
  },
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ]
  }
});

client.on('qr', (qr) => {
  console.clear();
  console.log('\n╔═══════════════════════════════╗');
  console.log('║  FlipSide - Scan QR Code      ║');
  console.log('╚═══════════════════════════════╝\n');
  qrcode.generate(qr, { small: true });
  console.log('\n✅ Scan & wait 30 seconds...\n');
});

client.on('ready', () => {
  console.log('\n✅ Bot is LIVE! Ready for orders.\n');
});

client.on('disconnected', () => {
  console.log('Bot disconnected.');
});

// ⚡ FETCH INVENTORY WITH CACHE
async function getInventory() {
  const now = Date.now();
  if (cachedInventory && now < inventoryExpiry) {
    return cachedInventory; // Use cached data (5 min)
  }
  try {
    const res = await fetch(`${SHEETDB_URL}?sheet=Inventory`);
    cachedInventory = await res.json();
    inventoryExpiry = now + 5 * 60 * 1000; // Cache 5 minutes
    return cachedInventory;
  } catch (err) {
    console.error('❌ Inventory fetch failed:', err.message);
    return cachedInventory || []; // Return old cache on error
  }
}

client.on('message', async (msg) => {
  try {
    console.log('📨 Message:', msg.body);

    const chatId = msg.from;

    // Initialize thread if not exists
    if (!chatThreads[chatId]) {
      chatThreads[chatId] = {
        id: chatId,
        customerName: msg._data.notifyName || msg.from,
        messages: [],
        unreadCount: 0
      };
    }

    // Add user message
    chatThreads[chatId].messages.push({
      id: msg.id.id,
      role: 'user',
      content: msg.body,
      timestamp: msg.timestamp * 1000
    });

    // ⚡ Get cached inventory (no re-fetch if recent)
    const inventory = await getInventory();
    
    // ⚡ SIMPLE PROMPT (faster processing)
    const prompt = `You are FlipSide Karachi thrift store bot. JSON ONLY:

Policies: ❌ NO RETURN • 📦 KARACHI ONLY • 🚚 FREE DELIVERY RS1000+
Inventory: ${JSON.stringify(inventory)}
Customer: "${msg.body}"

{"reply": "message", "booked": true/false, "name": "", "phone": "", "address": "", "item": ""}`;

    const result = await model.generateContent(prompt);
    let text = String(result.response?.text?.() || result.response?.text || '');
    text = text.replace(/```json|```|`/g, '').trim();

    const data = JSON.parse(text);
    
    // Send reply to customer
    await msg.reply(data.reply || '📝 Kya chahayein?');
    console.log(`✅ Reply sent to customer.`);

    // Add assistant message
    chatThreads[chatId].messages.push({
      id: Date.now().toString(),
      role: 'assistant',
      content: data.reply || '📝 Kya chahayein?',
      timestamp: Date.now()
    });

    // ⚡ Save order asynchronously (don't wait)
    if (data.booked === true && data.name && data.phone) {
      const orderData = {
        name: data.name,
        phone: data.phone,
        address: data.address || '',
        item: data.item || '',
        message: msg.body,
        timestamp: new Date().toLocaleString('en-PK'),
      };

      // Fire and forget - don't block response
      fetch(SHEETDB_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      }).then(() => console.log('✅ Order saved!')).catch(e => console.error('❌ Sheet error:', e.message));

      await msg.reply('📋 Admin ko order details send kar diya! ✅');

      // Add order confirmation message
      chatThreads[chatId].messages.push({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '📋 Admin ko order details send kar diya! ✅',
        timestamp: Date.now()
      });
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
    msg.reply('Maaf kijiye, kuch error aya. Dobara try karein please.');
  }
});

// ⚡ OPTIMIZED START (faster retries)
let attempt = 0;
async function start() {
  try {
    console.log('🚀 FlipSide Bot Starting...\n');

    // Set a hard timeout
    const timeout = setTimeout(() => {
      console.error('❌ Hard timeout reached - forcing exit');
      process.exit(1);
    }, 45000); // 45 seconds

    // Add timeout to prevent hanging
    const initPromise = client.initialize();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Connection timeout - check internet')), 30000)
    );

    await Promise.race([initPromise, timeoutPromise]);
    clearTimeout(timeout); // Clear if successful
  } catch (err) {
    attempt++;
    console.error(`❌ Attempt ${attempt}/5: ${err.message}`);
    if (attempt < 5) {
      console.log('⏳ Retrying in 3 seconds...\n');
      setTimeout(start, 3000);
    } else {
      console.error('❌ All attempts failed. Possible issues:');
      console.error('   - Internet connection problem');
      console.error('   - WhatsApp Web changes (try updating whatsapp-web.js)');
      console.error('   - Browser cache issues');
      console.error('\n💡 Try: npm install whatsapp-web.js@latest\n');
      process.exit(1);
    }
  }
}

start();

// Start API server
app.listen(3001, () => {
  console.log('API server running on port 3001');
});
