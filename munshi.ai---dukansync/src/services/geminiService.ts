import { GoogleGenAI } from "@google/genai";
import { InventoryItem, SellerSettings } from "../types";

const defaultAi = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function chatWithDukanSync(
  message: string,
  history: { role: 'user' | 'model'; parts: { text: string }[] }[],
  inventory: InventoryItem[],
  settings: SellerSettings
) {
  const model = "gemini-3-flash-preview";
  
  // Use custom API key if provided, otherwise fallback to default
  const ai = settings.geminiApiKey 
    ? new GoogleGenAI({ apiKey: settings.geminiApiKey }) 
    : defaultAi;

  const inventoryContext = inventory
    .map(
      (item) =>
        `- ${item.name} (${item.size}): Price Rs. ${item.price}, Stock: ${item.stock}, Category: ${item.category}`
    )
    .join("\n");

  const systemInstruction = `
    You are "Munshi.Ai", an expert Roman Urdu salesman for a Pakistani small business called "${settings.storeName}".
    Your goal is to help customers, check inventory, and collect order details.

    STRICT PRICING POLICY:
    1. FIXED PRICE: All prices are strictly fixed. Do NOT offer discounts or bargain.
    2. If a customer asks for a discount ("Bhai thora discount kardo"), politely explain that prices are already very reasonable and fixed to ensure best quality.
    
    CONVERSATION GUIDELINES:
    1. Language: Use Roman Urdu (Urdu written in English alphabets) combined with some natural English words, exactly like how Pakistanis chat on WhatsApp (e.g., "Bhai, ye item stock mein hai?", "Delivery charges kitne hain?").
    2. Tone: ${settings.urduTone}. Be friendly but firm on prices.
    3. Inventory: Only sell items present in the inventory below. If something is out of stock, suggest an alternative.
    4. Order Collection: Once the customer decides to buy, ask for their full name, phone number, and delivery address.
    5. Culture: Understand local Pakistani culture and slang. Use "InshaAllah", "MashaAllah", "Bhai", "Ap" appropriately.
    6. No Menus: Do NOT use "Press 1 for X" menus. Have a fluid conversation.

    CURRENT INVENTORY:
    ${inventoryContext}

    STORE SETTINGS:
    - Fixed Price Store: Yes
    - Currency: ${settings.currency}

    If a customer provides their address, confirm the total bill including a standard Rs. 250 delivery charge.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        ...history,
        { role: 'user', parts: [{ text: message }] }
      ],
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    return response.text || "Sorry, mere system mein kuch masla agaya hai. Dobara try karein.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Maaf kijiye ga, abhi service down hai. Thori dair baad message karein.";
  }
}
