/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface InventoryItem {
  id: string;
  name: string;
  size: string;
  price: number;
  stock: number;
  category: string;
  description: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatThread {
  id: string;
  customerName: string;
  lastMessage: string;
  timestamp: number;
  unreadCount?: number;
  isAiEnabled: boolean;
  messages: ChatMessage[];
}

export interface Order {
  id: string;
  customerName: string;
  address: string;
  items: { productId: string; quantity: number; price: number }[];
  totalPrice: number;
  status: 'pending' | 'verified' | 'delivered';
  timestamp: number;
}

export interface SellerSettings {
  storeName: string;
  currency: string;
  minMargin: number; // e.g. 0.1 for 10%
  urduTone: 'polite' | 'casual' | 'aggressive';
  geminiApiKey?: string;
}
