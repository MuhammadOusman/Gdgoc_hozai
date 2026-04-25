const API_BASE = import.meta.env.VITE_API_URL || window.location.origin;

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
  unreadCount: number;
  messages: ChatMessage[];
}

export async function fetchChats(): Promise<ChatThread[]> {
  const response = await fetch(`${API_BASE}/api/chats`);
  if (!response.ok) throw new Error('Failed to fetch chats');
  return response.json();
}

export async function sendMessage(chatId: string, message: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId, message }),
  });
  if (!response.ok) throw new Error('Failed to send message');
}