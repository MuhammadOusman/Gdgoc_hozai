import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart3, 
  MessageSquare, 
  Package, 
  Settings as SettingsIcon, 
  ShoppingCart, 
  Store,
  Menu,
  Plus,
  Search,
  Send,
  User,
  Bot,
  Truck,
  CheckCircle2,
  AlertCircle,
  FileText,
  Zap,
  MoreVertical,
  ChevronRight,
  ChevronLeft,
  ClipboardList
} from 'lucide-react';
import { cn } from './lib/utils';
import { InventoryItem, ChatMessage, Order, SellerSettings, ChatThread } from './types';
import { chatWithDukanSync } from './services/geminiService';

// --- Mock Data ---
const INITIAL_THREADS: ChatThread[] = [
  {
    id: 't1',
    customerName: 'Ali Ahmed',
    lastMessage: 'Price kitni hai?',
    timestamp: Date.now() - 1000 * 60 * 5,
    unreadCount: 1,
    isAiEnabled: true,
    messages: [
      { id: '1', role: 'user', content: 'Salam, ye shirt medium size mein hai?', timestamp: Date.now() - 1000 * 60 * 15 },
      { id: '2', role: 'assistant', content: 'Walaikum Assalam! G bilkul, Cotton Lawn Shirt medium size mein available hai. Iski price Rs. 2,500 hai. Kya main apke liye pack kardu?', timestamp: Date.now() - 1000 * 60 * 14 },
      { id: '3', role: 'user', content: 'Price kitni hai?', timestamp: Date.now() - 1000 * 60 * 5 },
    ]
  },
  {
    id: 't2',
    customerName: 'Sania Khan',
    lastMessage: 'Address send kardu?',
    timestamp: Date.now() - 1000 * 60 * 60 * 2,
    isAiEnabled: true,
    messages: []
  },
  {
    id: 't3',
    customerName: 'Zainab Qureshi',
    lastMessage: 'Delivery kab tak hogi?',
    timestamp: Date.now() - 1000 * 60 * 60 * 5.5,
    isAiEnabled: false,
    messages: []
  }
];

const INITIAL_SETTINGS: SellerSettings = {
  storeName: 'Munshi.Ai Demo',
  currency: 'Rs.',
  minMargin: 0.1,
  urduTone: 'polite',
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'chat' | 'settings' | 'codsync' | 'recordings'>('dashboard');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<SellerSettings>(INITIAL_SETTINGS);
  const [orders, setOrders] = useState<Order[]>([]);
  const [threads, setThreads] = useState<ChatThread[]>(INITIAL_THREADS);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [debugLogs, setDebugLogs] = useState<{msg: string, type: 'info' | 'error', time: string}[]>([]);
  const [showDebug, setShowDebug] = useState(false);

  const addLog = (msg: string, type: 'info' | 'error' = 'info') => {
    const newLog = { msg, type, time: new Date().toLocaleTimeString() };
    setDebugLogs(prev => [newLog, ...prev].slice(0, 50));
    console.log(`[Dukaansync]: ${msg}`);
  };

  useEffect(() => {
    addLog("Munshi.Ai Initialized");
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setIsLoading(true);
      addLog("Fetching inventory from Google Sheets...");
      // Explicitly targeting "Inventory" sheet name
      const response = await fetch('/api/inventory?sheet=Inventory');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setInventory(data);
      addLog(`Loaded ${data.length} items from inventory`);
    } catch (error: any) {
      addLog(`Inventory fetch failed: ${error.message}`, 'error');
      console.error("Failed to fetch inventory:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen p-6 gap-6 font-sans overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 px-6 glass rounded-2xl flex items-center justify-between mb-6 border border-white/40 shadow-sm bg-white/30">
          <div className="flex items-center gap-3">
            {!isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <Menu size={20} className="text-indigo-900" />
              </button>
            )}
            <h1 className="text-xl font-black text-[#1A1A1A] tracking-tight">
              {activeTab === 'chat' ? 'Live Chats' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 glass-dark px-3 py-1.5 rounded-full border border-white/20">
              <div className="status-glow" />
              <span className="text-xs font-black text-indigo-900 uppercase tracking-tighter">System Live</span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {activeTab === 'dashboard' && <DashboardView orders={orders} debugLogs={debugLogs} showDebug={showDebug} setShowDebug={setShowDebug} />}
              {activeTab === 'inventory' && <InventoryView inventory={inventory} setInventory={setInventory} onRefresh={fetchInventory} />}
              {activeTab === 'chat' && (
                <LiveChatsView 
                  threads={threads}
                  setThreads={setThreads}
                  inventory={inventory} 
                  settings={settings} 
                  onOrderCreated={(o) => setOrders([o, ...orders])}
                  addLog={addLog}
                />
              )}
              {activeTab === 'codsync' && <CODSyncView onNavigateToRecordings={() => setActiveTab('recordings')} />}
              {activeTab === 'recordings' && <RecordingsView onBack={() => setActiveTab('codsync')} />}
              {activeTab === 'settings' && <SettingsView settings={settings} setSettings={setSettings} showDebug={showDebug} setShowDebug={setShowDebug} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Debug Console Overlay */}
      <AnimatePresence>
        {showDebug && (
          <motion.div 
            initial={{ y: 300 }}
            animate={{ y: 0 }}
            exit={{ y: 300 }}
            className="fixed bottom-6 right-6 w-96 h-64 bg-slate-900/95 backdrop-blur-md rounded-3xl z-[100] border border-white/10 shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="p-3 bg-white/5 border-b border-white/10 flex justify-between items-center">
              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Dukaansync Debug Logs</span>
              <button onClick={() => setShowDebug(false)} className="text-white/40 hover:text-white">
                <ChevronLeft size={16} className="rotate-[-90deg]" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 font-mono text-[10px] space-y-2">
              {debugLogs.length === 0 && <p className="text-white/20 italic">No logs yet...</p>}
              {debugLogs.map((log, i) => (
                <div key={i} className={cn("flex gap-3", log.type === 'error' ? "text-rose-400" : "text-emerald-400")}>
                  <span className="opacity-30 flex-shrink-0">{log.time}</span>
                  <span className="break-all">{log.msg}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- CODSync View ---

function CODSyncView({ onNavigateToRecordings }: { onNavigateToRecordings: () => void }) {
  const stats = [
    { label: 'AI Calls Made', value: '1,284', change: '89% Success', icon: Zap, color: 'text-indigo-500' },
    { label: 'Orders Confirmed', value: '1,042', change: '+12 today', icon: CheckCircle2, color: 'text-emerald-500' },
    { label: 'Fraud Detected', value: '42', change: 'Flagged', icon: AlertCircle, color: 'text-rose-500' },
    { label: 'Verification Rate', value: '94.2%', change: 'Optimal', icon: Bot, color: 'text-blue-500' },
  ];

  const recentCalls = [
    { id: 'c1', customer: 'Hamza Malik', outcome: 'Order confirmed', duration: '45s', time: '2 mins ago' },
    { id: 'c2', customer: 'Sara Ahmed', outcome: 'Order cancelled', duration: '12s', time: '15 mins ago' },
    { id: 'c3', customer: 'Bilal Khan', outcome: 'Manual', duration: '38s', time: '1 hour ago' },
    { id: 'c4', customer: 'Zainab Bibi', outcome: 'Manual', duration: '55s', time: '2 hours ago' },
  ];

  return (
    <div className="space-y-6 pb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="glass p-6 rounded-3xl border border-white/40 shadow-sm bg-white/30">
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-3 rounded-2xl glass-dark border border-white/20", stat.color)}>
                <stat.icon size={24} />
              </div>
              <span className="text-[10px] font-black text-emerald-600 px-2 py-1 glass-dark rounded-full border border-emerald-500/10">
                {stat.change}
              </span>
            </div>
            <p className="text-xs text-indigo-900/60 font-black uppercase tracking-widest">{stat.label}</p>
            <h3 className="text-2xl font-black mt-1 text-indigo-950 underline decoration-indigo-300 underline-offset-4 tracking-tight">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass rounded-3xl overflow-hidden border border-white/40 shadow-sm bg-white/30">
          <div className="p-6 border-b border-white/20 flex items-center justify-between bg-white/10">
            <h3 className="font-bold text-lg text-indigo-900 flex items-center gap-2">
              <Bot size={20} className="text-indigo-600" />
              Live AI Call Logs
            </h3>
            <button 
              onClick={onNavigateToRecordings}
              className="text-indigo-600 text-[10px] font-black uppercase tracking-widest hover:underline"
            >
              Call Log
            </button>
          </div>
          <div className="divide-y divide-white/10">
            {recentCalls.map((call) => (
              <div key={call.id} className="p-4 flex items-center justify-between hover:bg-white/20 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 glass-dark text-indigo-600 rounded-full flex items-center justify-center font-black border border-white/20">
                    <User size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-indigo-950">{call.customer}</p>
                    <p className="text-[10px] text-indigo-900/40 font-bold uppercase">{call.time} • {call.duration}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={cn(
                    "text-[9px] uppercase font-black px-3 py-1 rounded-full ring-1 shadow-sm",
                    call.outcome === 'Order confirmed' && "text-emerald-600 bg-emerald-50/50 ring-emerald-200",
                    call.outcome === 'Order cancelled' && "text-rose-600 bg-rose-50/50 ring-rose-200",
                    call.outcome === 'Manual' && "text-amber-600 bg-amber-50/50 ring-amber-200"
                  )}>
                    {call.outcome}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-3xl p-6 border border-white/40 shadow-sm bg-white/30 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center text-white mb-4 animate-pulse shadow-xl shadow-indigo-600/20">
            <Zap size={40} />
          </div>
          <h4 className="font-black text-indigo-950 text-xl mb-2">Voice AI Active</h4>
          <p className="text-sm text-indigo-900/60 font-medium mb-6">Dialing out to confirm new COD orders automatically.</p>
          <div className="w-full space-y-3">
             <div className="flex justify-between text-xs font-bold px-4">
                <span className="text-indigo-900/40 uppercase">Lines Active</span>
                <span className="text-emerald-600">08 / 10</span>
             </div>
             <div className="h-2 glass-dark rounded-full overflow-hidden mx-4">
                <div className="h-full bg-emerald-500 w-[80%]" />
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RecordingsView({ onBack }: { onBack: () => void }) {
  const [showReschedule, setShowReschedule] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const reachedOut = [
    { 
      id: 'r1', 
      customer: 'Arsalan', 
      order: 'DS-4921', 
      response: 'Order confirmed', 
      time: '10:45 AM', 
      phone: '0300-1234567',
      items: ['Lawn Suit (3PC)', 'Cotton Shirt'],
      total: 'Rs. 4,500',
      address: 'House 123, Street 4, DHA Phase 5, Karachi'
    },
    { 
      id: 'r2', 
      customer: 'Irfan Jadoon', 
      order: 'DS-4922', 
      response: 'Manual', 
      time: '11:12 AM', 
      phone: '0321-9876543',
      items: ['Men\'s Formal Shoes'],
      total: 'Rs. 3,200',
      address: 'Plot 45, Sector G-11/3, Islamabad'
    },
    { 
      id: 'r3', 
      customer: 'Mehak', 
      order: 'DS-4923', 
      response: 'Manual', 
      time: '01:20 PM', 
      phone: '0345-5551234',
      items: ['Silk Saree', 'Jewelry Set'],
      total: 'Rs. 8,900',
      address: 'Apartment 402, Barkat Market, Lahore'
    },
    { 
      id: 'r4', 
      customer: 'Faisal', 
      order: 'DS-4924', 
      response: 'Order cancelled', 
      time: '02:45 PM', 
      phone: '0312-7654321',
      items: ['Wireless Earbuds'],
      total: 'Rs. 1,500',
      address: 'Village post office, Tehsil Abbottabad'
    },
  ];

  const pending = [
    { id: 'p1', customer: 'Omair Ali', order: 'DS-4930', status: 'Queued', priority: 'High', phone: '0333-1112223' },
    { id: 'p2', customer: 'Zubair', order: 'DS-4931', status: 'Queued', priority: 'Medium', phone: '0301-4445556' },
    { id: 'p3', customer: 'Nida', order: 'DS-4932', status: 'In Progress', priority: 'Low', phone: '0322-7778889' },
  ];

  const retryList = reachedOut.filter(r => r.response === 'Manual');

  if (showReschedule) {
    return (
      <div className="space-y-6 pb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowReschedule(false)}
            className="p-2 glass rounded-xl text-indigo-900 hover:bg-white/40 border border-white/20"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-black text-indigo-950">Manual Follow-up</h2>
            <p className="text-xs text-rose-500 font-black uppercase tracking-widest">Reschedule and confirm {retryList.length} orders</p>
          </div>
        </div>

        <div className="glass rounded-3xl border border-white/40 shadow-xl bg-white/40 overflow-hidden">
          <div className="p-6 border-b border-white/20 bg-rose-500/5">
              <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Action Required: Manual Orders</p>
          </div>
          <div className="divide-y divide-white/10">
            {retryList.map((item) => (
              <div key={item.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/30 transition-all border-l-4 border-l-amber-400">
                <div className="flex gap-4 items-center">
                  <div className="w-12 h-12 glass-dark rounded-2xl flex items-center justify-center text-rose-500 border border-white/30">
                    <User size={24} />
                  </div>
                  <div>
                    <button 
                      onClick={() => setSelectedLog(item)}
                      className="text-left group"
                    >
                      <h4 className="font-black text-indigo-950 text-lg group-hover:text-indigo-600 transition-colors uppercase">{item.customer}</h4>
                      <p className="text-xs text-indigo-900/60 font-bold uppercase tracking-widest">Order: {item.order} • {item.phone}</p>
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <button className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all">
                     Confirm
                   </button>
                   <button className="flex items-center gap-2 bg-rose-600 text-white px-4 py-3 rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-rose-500/20 hover:scale-105 transition-all text-center justify-center">
                     Cancel
                   </button>
                   <a 
                    href={`tel:${item.phone}`}
                    className="p-3 glass rounded-2xl text-indigo-900 hover:bg-white/50 border border-white/20"
                   >
                     <Zap size={18} />
                   </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Order Modal Component logic */}
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-indigo-950/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass rounded-[40px] max-w-lg w-full overflow-hidden border border-white/40 shadow-2xl bg-white/90"
            >
              <div className="p-8 border-b border-indigo-100 flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-black text-indigo-900/40 uppercase tracking-widest">Order Detail</span>
                  <h3 className="text-2xl font-black text-indigo-950">{selectedLog.order}</h3>
                </div>
                <button onClick={() => setSelectedLog(null)} className="p-2 hover:bg-indigo-50 rounded-full text-indigo-900/40">
                  <ChevronLeft size={24} className="rotate-90" />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div>
                   <p className="text-[10px] font-black text-indigo-900/40 uppercase mb-2">Customer Details</p>
                   <p className="font-bold text-indigo-950 text-lg uppercase">{selectedLog.customer}</p>
                   <p className="text-sm font-medium text-indigo-900/60 mb-1">{selectedLog.phone}</p>
                   <p className="text-sm text-indigo-900/80 leading-relaxed italic border-l-2 border-indigo-200 pl-4">{selectedLog.address}</p>
                </div>
                <div>
                   <p className="text-[10px] font-black text-indigo-900/40 uppercase mb-2">Items</p>
                   <div className="space-y-1">
                      {selectedLog.items.map((item: string, i: number) => (
                        <p key={i} className="text-sm font-bold text-indigo-950 flex items-center gap-2">
                           <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" /> {item}
                        </p>
                      ))}
                   </div>
                </div>
                <div className="pt-4 border-t border-indigo-100 flex justify-between items-center">
                   <p className="text-sm font-black text-indigo-900 uppercase">Total Bill</p>
                   <p className="text-xl font-black text-indigo-950">{selectedLog.total}</p>
                </div>
              </div>
              <div className="p-4 bg-indigo-50/50 flex gap-4">
                 <button onClick={() => setSelectedLog(null)} className="flex-1 bg-indigo-600 text-white py-4 rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/20">Done</button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6 relative">
      <div className="flex items-center gap-4">
        <button 
          onClick={onBack}
          className="p-2 glass rounded-xl text-indigo-900 hover:bg-white/40 transition-all border border-white/20"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-black text-indigo-950">Call Log</h2>
          <p className="text-xs text-indigo-900/40 font-black uppercase tracking-widest">Call logs & Verification Queue</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reached Out List */}
        <div className="glass rounded-3xl border border-white/40 shadow-sm bg-white/30 flex flex-col">
          <div className="p-6 border-b border-white/20 flex items-center justify-between bg-emerald-500/5">
            <h3 className="font-bold text-indigo-900 flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-600" />
              Reached Out
            </h3>
            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-black border border-emerald-200">
              {reachedOut.length} COMPLETED
            </span>
          </div>
          <div className="divide-y divide-white/10 overflow-y-auto max-h-[500px]">
            {reachedOut.map((log) => (
              <div key={log.id} className="p-4 hover:bg-white/20 transition-all flex items-center justify-between">
                <div className="flex gap-3 items-center">
                  <div className="w-10 h-10 glass-dark rounded-xl flex items-center justify-center text-indigo-600 border border-white/20">
                    <User size={20} />
                  </div>
                  <button 
                    onClick={() => setSelectedLog(log)}
                    className="text-left group"
                  >
                    <p className="font-black text-indigo-950 text-sm group-hover:text-indigo-600 transition-colors uppercase">{log.customer}</p>
                    <p className="text-[10px] text-indigo-900/40 font-black tracking-widest uppercase">Order: {log.order}</p>
                  </button>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <p className={cn(
                      "text-[9px] font-black uppercase px-2 py-0.5 rounded-full mb-1",
                      log.response === 'Order confirmed' ? "text-emerald-600 bg-emerald-50 ring-1 ring-emerald-200" : 
                      log.response === 'Order cancelled' ? "text-rose-600 bg-rose-50 ring-1 ring-rose-200" :
                      "text-amber-600 bg-amber-50 ring-1 ring-amber-200"
                    )}>
                      {log.response}
                    </p>
                    <p className="text-[10px] text-indigo-900/30 font-medium">{log.time}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Queue */}
        <div className="glass rounded-3xl border border-white/40 shadow-sm bg-white/30 flex flex-col">
          <div className="p-6 border-b border-white/20 flex items-center justify-between bg-indigo-500/5">
            <h3 className="font-bold text-indigo-900 flex items-center gap-2">
              <Zap size={18} className="text-indigo-600" />
              Call Queue
            </h3>
            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-black border border-indigo-200">
              {pending.length} WAITING
            </span>
          </div>
          <div className="divide-y divide-white/10">
            {pending.map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between group">
                <div className="flex gap-3 items-center">
                  <div className="w-10 h-10 glass-dark rounded-xl flex items-center justify-center text-indigo-900/20 border border-white/10 group-hover:border-indigo-500/30 transition-all">
                    <User size={20} />
                  </div>
                  <div>
                    <p className="font-black text-indigo-950 text-sm group-hover:text-indigo-600 transition-colors uppercase">{item.customer}</p>
                    <p className="text-[10px] text-indigo-900/40 font-black tracking-widest uppercase">Order: {item.order}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <p className="text-[9px] font-black uppercase text-indigo-900/50 mb-1">{item.status}</p>
                    <span className={cn(
                      "text-[8px] font-black px-1.5 py-0.5 rounded-full",
                      item.priority === 'High' ? "bg-rose-100 text-rose-600" : "bg-indigo-100 text-indigo-600"
                    )}>
                      {item.priority} PRIORITY
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="p-6 mt-auto">
            <button 
              onClick={() => setShowReschedule(true)}
              className="w-full bg-rose-500 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-rose-500/30 hover:scale-[1.02] active:scale-95 transition-all"
            >
              Manual Follow-up ({retryList.length})
            </button>
          </div>
        </div>
      </div>

      {/* Selected Order Modal for Log List */}
      {selectedLog && !showReschedule && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-indigo-950/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass rounded-[40px] max-w-lg w-full overflow-hidden border border-white/40 shadow-2xl bg-white/90"
            >
              <div className="p-8 border-b border-indigo-100 flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-black text-indigo-900/40 uppercase tracking-widest">Recording & Details</span>
                  <h3 className="text-2xl font-black text-indigo-950">{selectedLog.order}</h3>
                </div>
                <button onClick={() => setSelectedLog(null)} className="p-2 hover:bg-indigo-50 rounded-full text-indigo-900/40">
                  <ChevronLeft size={24} className="rotate-90" />
                </button>
              </div>
              <div className="p-8 space-y-6">
                 <div>
                   <p className="text-[10px] font-black text-indigo-900/40 uppercase mb-2">Customer</p>
                   <p className="font-bold text-indigo-950 text-xl uppercase">{selectedLog.customer}</p>
                   <p className="text-sm font-medium text-indigo-900/60">{selectedLog.phone}</p>
                 </div>
                 <div className="p-4 glass-dark rounded-2xl border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white">
                          <Zap size={14} className="fill-current" />
                       </div>
                       <span className="text-xs font-black text-indigo-950 uppercase">Voice AI Recording</span>
                    </div>
                    <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest border border-indigo-200 px-3 py-1 rounded-full hover:bg-indigo-50">Play Call</button>
                 </div>
                 <div className="pt-4 border-t border-indigo-100">
                    <p className="text-[10px] font-black text-indigo-900/40 uppercase mb-2">Outcome</p>
                    <span className={cn(
                      "text-xs font-black px-4 py-2 rounded-xl border uppercase tracking-widest",
                      selectedLog.response === 'Order confirmed' ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                      selectedLog.response === 'Order cancelled' ? "bg-rose-50 text-rose-600 border-rose-200" :
                      "bg-amber-50 text-amber-600 border-amber-200"
                    )}>
                      {selectedLog.response}
                    </span>
                 </div>
              </div>
              <div className="p-4 bg-indigo-50/50 flex gap-4">
                 <button onClick={() => setSelectedLog(null)} className="flex-1 bg-indigo-600 text-white py-4 rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/20">Close</button>
              </div>
            </motion.div>
          </div>
        )}
    </div>
  );
}

// --- Sidebar ---

function Sidebar({ activeTab, setActiveTab, isOpen, setIsOpen }: { 
  activeTab: string, 
  setActiveTab: (t: any) => void,
  isOpen: boolean,
  setIsOpen: (b: boolean) => void
}) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'chat', label: 'Live Chats', icon: MessageSquare },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <motion.aside 
      initial={false}
      animate={{ width: isOpen ? 260 : 0 }}
      className={cn(
        "glass rounded-3xl flex flex-col h-full z-20 relative transition-all overflow-hidden border border-white/40 bg-white/30 shadow-xl",
        !isOpen && "border-none"
      )}
    >
      <div className="p-6 flex flex-col min-w-[260px]">
        <div className="mb-10">
          <div className="text-2xl font-black tracking-tighter text-indigo-900">Munshi.Ai<span className="text-rose-500">.</span></div>
          <div className="text-[10px] uppercase tracking-widest font-bold opacity-50">Instant Commerce Agent</div>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-4 min-w-[260px]">
        <div>
          <p className="px-4 text-[9px] font-black uppercase tracking-widest text-indigo-900/40 mb-2">Chat Agent (DukaanSync)</p>
          <div className="space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                  activeTab === item.id 
                    ? "glass-dark font-bold text-indigo-900 border border-white/30 shadow-sm" 
                    : "text-indigo-900/60 hover:bg-white/20 hover:text-indigo-900"
                )}
              >
                <item.icon size={18} />
                <span className="font-bold uppercase text-[10px] tracking-widest">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="px-4 text-[9px] font-black uppercase tracking-widest text-indigo-900/40 mb-2">Voice Agent (CODSync)</p>
          <button
            onClick={() => setActiveTab('codsync')}
            className={cn(
              "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200",
              activeTab === 'codsync' 
                ? "glass-dark font-bold text-indigo-900 border border-white/30 shadow-sm" 
                : "text-indigo-900/60 hover:bg-white/20 hover:text-indigo-900"
            )}
          >
            <div className="flex items-center gap-3">
              <Bot size={18} />
              <span className="font-bold uppercase text-[10px] tracking-widest">Voice Dashboard</span>
            </div>
            <Zap size={12} className={activeTab === 'codsync' ? 'text-rose-500' : 'opacity-20'} />
          </button>
        </div>
      </nav>

      <div className="p-6 border-t border-white/20 min-w-[260px]">
        <div className="p-4 glass-dark rounded-2xl border border-white/10">
          <div className="text-[10px] uppercase opacity-50 mb-1 text-indigo-900 font-black">Linked Store</div>
          <div className="text-sm font-black text-indigo-950 truncate">Munshi.Ai Demo Shop</div>
        </div>
      </div>
    </motion.aside>
  );
}

// --- Views ---

function DashboardView({ orders, debugLogs, showDebug, setShowDebug }: { orders: Order[], debugLogs: any[], showDebug: boolean, setShowDebug: any }) {
  const stats = [
    { label: 'Active Chats', value: '24', change: '+5', icon: MessageSquare, color: 'text-emerald-500' },
    { label: 'Total Orders', value: String(orders.length), change: 'Live', icon: Store, color: 'text-rose-500' },
  ];

  return (
    <div className="space-y-6 pb-6 overflow-y-auto h-[calc(100vh-120px)] pr-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="glass p-8 rounded-3xl transition-transform hover:scale-[1.02] cursor-default border border-white/40 shadow-sm bg-white/30">
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-4 rounded-2xl glass-dark border border-white/20", stat.color)}>
                <stat.icon size={32} />
              </div>
              <span className="text-[11px] font-black text-emerald-600 px-3 py-1 glass-dark rounded-full border border-emerald-500/10">
                {stat.change}
              </span>
            </div>
            <p className="text-sm text-indigo-900/60 font-black uppercase tracking-widest">{stat.label}</p>
            <h3 className="text-4xl font-black mt-2 text-indigo-950 underline decoration-indigo-300 underline-offset-4 tracking-tight">{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* Debug Logs Section (Always visible on dashboard if user wants) */}
      <div className="glass rounded-[40px] p-8 border border-rose-400/20 shadow-sm bg-slate-900/5">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-indigo-950 flex items-center gap-2">
            <Bot size={24} className="text-indigo-600" />
            Live Sync Logs (Google Sheets)
          </h3>
          <button 
            onClick={() => setShowDebug(!showDebug)}
            className="text-[10px] font-black bg-indigo-600 text-white px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg shadow-indigo-500/20"
          >
            {showDebug ? 'Hide Details' : 'Show Details'}
          </button>
        </div>
        
        {showDebug && (
          <div className="bg-slate-900 rounded-[30px] p-6 font-mono text-[11px] h-64 overflow-y-auto border border-white/10 shadow-inner">
            {debugLogs.length === 0 && <p className="text-white/20 italic">No activity logs recorded yet.</p>}
            {debugLogs.map((log, i) => (
              <div key={i} className={cn("mb-2 flex gap-3", log.type === 'error' ? "text-rose-400" : "text-emerald-400")}>
                <span className="opacity-30 flex-shrink-0">[{log.time}]</span>
                <span className="break-all">{log.msg}</span>
              </div>
            ))}
          </div>
        )}
        {!showDebug && (
          <div className="flex items-center gap-3 text-indigo-900/40 italic text-sm font-bold bg-white/20 p-4 rounded-2xl border border-white/40">
             <AlertCircle size={16} />
             System monitoring active. Enable "Show Details" to view technical handshake with Sheet API.
          </div>
        )}
      </div>

      {/* Recent Orders List */}
      <div className="glass rounded-[40px] p-8 border border-white/40 shadow-sm bg-white/30">
        <h3 className="text-xl font-black text-indigo-950 mb-6 flex items-center gap-2">
          <Truck size={24} className="text-rose-500" />
          Recent Verified Orders
        </h3>
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="p-12 text-center glass-dark rounded-3xl border border-white/10 opacity-40 italic font-black uppercase text-[10px] tracking-[0.2em] text-indigo-900">
              No orders placed yet
            </div>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="p-5 glass-dark rounded-3xl border border-white/10 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-white/50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm font-black">
                      {order.customerName[0]}
                   </div>
                   <div>
                      <p className="font-black text-indigo-950 text-sm">{order.customerName}</p>
                      <p className="text-[10px] text-indigo-900/50 font-bold uppercase tracking-widest">{order.address}</p>
                   </div>
                </div>
                <div className="text-right">
                   <p className="font-black text-indigo-950 text-sm">Rs. {order.totalPrice}</p>
                   <span className="text-[8px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full font-black border border-emerald-500/20 uppercase">Verified</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="glass rounded-[40px] p-8 border border-white/40 shadow-sm bg-white/30">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg text-indigo-900">Live Agent Health</h3>
            <div className="flex items-center gap-2">
              <div className="status-glow" />
              <span className="text-[10px] font-black text-indigo-900/60 uppercase">Munshi AI Online</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 glass-dark rounded-2xl border border-white/10">
              <p className="text-[10px] font-black text-indigo-900/40 uppercase mb-2">Avg Response Time</p>
              <p className="text-xl font-black text-indigo-950">1.4s</p>
            </div>
            <div className="p-4 glass-dark rounded-2xl border border-white/10">
              <p className="text-[10px] font-black text-indigo-900/40 uppercase mb-2">Sales Conversion</p>
              <p className="text-xl font-black text-indigo-950">64%</p>
            </div>
            <div className="p-4 glass-dark rounded-2xl border border-white/10">
              <p className="text-[10px] font-black text-indigo-900/40 uppercase mb-2">Address Extraction</p>
              <p className="text-xl font-black text-indigo-950">92%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InventoryView({ inventory, setInventory, onRefresh }: { inventory: InventoryItem[], setInventory: any, onRefresh: () => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const filtered = inventory.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await onRefresh();
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-900/40" size={18} />
          <input 
            type="text" 
            placeholder="Search inventory..."
            className="w-full pl-10 pr-4 py-3 glass rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-indigo-950 placeholder:text-indigo-900/30 font-medium border border-white/20 shadow-sm bg-white/30"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleSync}
            disabled={isSyncing}
            className={cn(
              "glass text-indigo-700 px-6 py-3 rounded-2xl font-black flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 text-xs uppercase tracking-widest border border-indigo-200",
              isSyncing && "opacity-50 cursor-not-allowed"
            )}
          >
            <Zap size={18} className={cn(isSyncing && "animate-pulse")} />
            {isSyncing ? 'Syncing...' : 'Sync Google Sheets'}
          </button>
          <button className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 active:scale-95 text-xs uppercase tracking-widest">
            <Plus size={20} />
            Add Product
          </button>
        </div>
      </div>

      <div className="glass rounded-3xl overflow-hidden shadow-sm border border-white/40 bg-white/30">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-white/10 border-b border-white/20">
              <th className="px-6 py-4 text-[10px] font-black uppercase text-indigo-900/50 tracking-widest">Product</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-indigo-900/50 tracking-widest">Category</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-indigo-900/50 tracking-widest">Price</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-indigo-900/50 tracking-widest">Stock</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-indigo-900/50 tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {filtered.map((item) => (
              <tr key={item.id} className="hover:bg-white/20 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 glass-dark rounded-xl flex items-center justify-center text-indigo-900/40 border border-white/10">
                      <Package size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-indigo-950">{item.name}</p>
                      <p className="text-[10px] font-bold text-indigo-900/40 uppercase">{item.size}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-[10px] font-black px-2 py-1 glass-dark rounded-full text-indigo-700 uppercase tracking-tighter shadow-sm border border-white/10">
                    {item.category}
                  </span>
                </td>
                <td className="px-6 py-4 font-black text-indigo-950 underline decoration-indigo-100 underline-offset-4">
                  Rs. {item.price}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      item.stock > 10 ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" : item.stock > 0 ? "bg-orange-500 shadow-[0_0_8px_#f59e0b]" : "bg-rose-500 shadow-[0_0_8px_#f43f5e]"
                    )} />
                    <span className="text-xs font-bold text-indigo-900/70">{item.stock} left</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-indigo-600 font-black text-[10px] uppercase tracking-widest hover:underline underline-offset-2">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LiveChatsView({ threads, setThreads, inventory, settings, onOrderCreated, addLog }: { 
  threads: ChatThread[], 
  setThreads: any,
  inventory: InventoryItem[], 
  settings: SellerSettings,
  onOrderCreated: (order: Order) => void,
  addLog: (msg: string, type?: 'info' | 'error') => void
}) {
  const [activeThreadId, setActiveThreadId] = useState(threads[0]?.id);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Order Form State
  const [fromName, setFromName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');

  const activeThread = threads.find(t => t.id === activeThreadId);

  const simulateCustomerMsg = async (content: string) => {
    if (!activeThread || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    const updatedMessages = [...activeThread.messages, userMsg];
    
    setThreads((prev: ChatThread[]) => prev.map(t => 
      t.id === activeThreadId 
        ? { ...t, messages: updatedMessages, lastMessage: content, timestamp: Date.now() }
        : t
    ));

    if (activeThread.isAiEnabled) {
      setIsLoading(true);
      const history = updatedMessages.map(m => ({
        role: (m.role === 'assistant' ? 'model' : 'user') as 'model' | 'user',
        parts: [{ text: m.content }]
      }));

      const aiResponse = await chatWithDukanSync(content, history, inventory, settings);

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: Date.now(),
      };

      setThreads((prev: ChatThread[]) => prev.map(t => 
        t.id === activeThreadId 
          ? { ...t, messages: [...t.messages, botMsg], lastMessage: aiResponse, timestamp: Date.now() }
          : t
      ));
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeThread?.messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !activeThread) return;

    const adminMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: input,
      timestamp: Date.now(),
    };

    const updatedMessages = [...activeThread.messages, adminMsg];
    
    const updatedThreads = threads.map(t => 
      t.id === activeThreadId 
        ? { ...t, messages: updatedMessages, lastMessage: input, timestamp: Date.now(), isAiEnabled: false }
        : t
    );
    setThreads(updatedThreads);
    setInput('');

    // If AI was enabled, normally it would reply, but user requested manual override to turn it off.
    // However, if the user explicitly WANTED a bot reply, they would leave it on.
    // But the prompt says "manual override pr hum ai bot ko override krenge or ai assist automatically band hojayega"
    // So logic: if admin sends, isAiEnabled = false.
  };

  const toggleAi = (id: string) => {
    setThreads((prev: ChatThread[]) => prev.map(t => 
      t.id === id ? { ...t, isAiEnabled: !t.isAiEnabled } : t
    ));
  };

  const [orderSuccess, setOrderSuccess] = useState(false);

  const captureOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const product = inventory.find(p => p.id === selectedProductId) as any;
    if (!product) return;

    setIsLoading(true);

    const order: Order = {
      id: Math.random().toString(36).substr(2, 9),
      customerName: fromName,
      address: formAddress,
      items: [{ productId: product.id, quantity: 1, price: product.price }],
      totalPrice: product.price + 250, 
      status: 'verified',
      timestamp: Date.now(),
    };
    
    try {
      const now = new Date();
      // Using a standard ISO-like string for the sheet
      const timestamp = now.toLocaleString('en-GB', { timeZone: 'Asia/Karachi' });

      // Exact columns match for "Orders" sheet screenshot:
      const syncPayload = {
        sheet_name: 'Orders',
        tenant_id: product._original?.tenant_id || '550e841',
        customer_name: fromName,
        phone: formPhone,
        address: formAddress,
        city: 'Karachi Central',
        product_id: product._original?.slug || product.id,
        payment_method: 'COD',
        advance_paid: 'No',
        order_status: 'Pending Verification',
        created_at: timestamp
      };

      addLog(`[SYNC] Sending order to "Orders" sheet...`);
      
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(syncPayload)
      });

      const responseData = await response.json();

      if (!response.ok) {
        addLog(`Sheet Sync Failed: ${JSON.stringify(responseData)}`, 'error');
        throw new Error('Sync Error');
      }

      addLog(`Sheet Sync Success: ${responseData.message || 'Data Logged'}`);

      // 2. Log order in local state ONLY if network worked
      onOrderCreated(order);

      // 3. Clear form and show success
      setFromName('');
      setFormPhone('');
      setFormAddress('');
      setSelectedProductId('');
      setOrderSuccess(true);
      setTimeout(() => setOrderSuccess(false), 3000);
    } catch (error) {
      console.error("Order placement failed:", error);
      alert('Order failed to sync with Sheet. Please check your internet or try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-160px)] flex gap-6 pb-6 relative">
      {/* Order Success Notification */}
      <AnimatePresence>
        {orderSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-[60] bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl flex items-center gap-3 border border-emerald-500 ring-4 ring-emerald-500/10"
          >
            <CheckCircle2 size={18} />
            Order Confirmed & Sheet Updated!
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. Chat Headers Sidebar (Left) */}
      <div className="w-80 flex flex-col glass rounded-3xl overflow-hidden border border-white/40 shadow-sm bg-white/30">
        <div className="p-4 bg-white/10 border-b border-white/20">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-900/40" size={16} />
            <input 
              type="text" 
              placeholder="Search chats..."
              className="w-full pl-9 pr-4 py-2 bg-white/40 rounded-xl text-xs font-bold text-indigo-900 placeholder:text-indigo-900/30 border-none focus:ring-0"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-white/10">
          {threads.map((thread) => (
            <button
              key={thread.id}
              onClick={() => setActiveThreadId(thread.id)}
              className={cn(
                "w-full p-4 flex gap-3 text-left transition-all relative overflow-hidden group",
                activeThreadId === thread.id ? "bg-white/40" : "hover:bg-white/20"
              )}
            >
              <div className="relative">
                <div className="w-12 h-12 glass-dark rounded-2xl flex items-center justify-center font-black text-indigo-900 text-lg border border-white/40 shadow-sm">
                  {thread.customerName[0]}
                </div>
                {thread.unreadCount && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg ring-2 ring-white">
                    {thread.unreadCount}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-0.5">
                  <p className="font-black text-sm text-indigo-950 truncate tracking-tight">{thread.customerName}</p>
                  <span className="text-[9px] text-indigo-900/40 font-bold uppercase">{new Date(thread.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-xs text-indigo-900/60 truncate font-medium">{thread.lastMessage}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  {thread.isAiEnabled ? (
                    <span className="text-[8px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest border border-emerald-500/20">AI Active</span>
                  ) : (
                    <span className="text-[8px] bg-rose-500/10 text-rose-600 px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest border border-rose-500/20">Manual</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Main Chat Area (Center) */}
      <div className="flex-1 flex flex-col glass rounded-3xl overflow-hidden border border-white/40 relative shadow-xl bg-white/20">
        {activeThread ? (
          <>
            <div className="p-4 bg-white/10 border-b border-white/20 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 glass rounded-2xl flex items-center justify-center text-indigo-900 border border-white/40 shadow-sm">
                  <User size={20} />
                </div>
                <div>
                  <p className="font-black text-indigo-950 text-sm tracking-tight">{activeThread.customerName}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Active Store Conversation</p>
                    <button 
                      onClick={() => {
                        const queries = [
                          "Price check karein plz",
                          "Delivery charges kitne hain?",
                          "Cash on delivery available hai?",
                          "Size chart mil sakta hai?",
                          "Order confirm kardi k?"
                        ];
                        const q = queries[Math.floor(Math.random() * queries.length)];
                        simulateCustomerMsg(q);
                      }}
                      className="text-[9px] bg-rose-500/10 text-rose-600 px-1.5 py-0.5 rounded-full font-black uppercase border border-rose-500/20 hover:bg-rose-500/20 transition-all"
                    >
                      Simulate DM
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 glass-dark rounded-full border border-white/20">
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-900/60">AI Assist</span>
                  <button 
                    onClick={() => toggleAi(activeThread.id)}
                    className={cn(
                      "w-10 h-5 rounded-full p-1 transition-all relative border border-white/10",
                      activeThread.isAiEnabled ? "bg-indigo-600" : "bg-white/50"
                    )}
                  >
                    <div className={cn(
                      "w-3 h-3 bg-white rounded-full transition-all shadow-sm",
                      activeThread.isAiEnabled ? "ml-5" : "ml-0"
                    )} />
                  </button>
                </div>
                <button className="p-2 text-indigo-900/40 hover:text-indigo-900 transition-colors">
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
              {activeThread.messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                  <Bot size={48} className="mb-4 text-indigo-900" />
                  <p className="text-sm font-bold uppercase tracking-widest text-indigo-900">Start the conversation</p>
                </div>
              )}
              {activeThread.messages.map((msg) => (
                <div key={msg.id} className={cn(
                  "flex flex-col max-w-[85%]",
                  msg.role === 'assistant' ? "ml-auto items-end" : "items-start"
                )}>
                  <div className={cn(
                    "px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm border",
                    msg.role === 'assistant' 
                      ? "bg-indigo-600 text-white border-indigo-700/50 rounded-tr-none shadow-indigo-600/10"
                      : "glass border-indigo-200/50 text-indigo-950 rounded-tl-none bg-white/40"
                  )}>
                    {msg.content}
                  </div>
                  <span className="text-[9px] font-black text-indigo-900/40 mt-1 px-1 uppercase tracking-tighter">
                    {msg.role === 'assistant' ? 'Munshi AI / Store' : 'Customer'} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
              {isLoading && (
                <div className="flex items-start">
                  <div className="bg-indigo-600/10 glass px-4 py-3 rounded-2xl rounded-tl-none flex gap-1.5 border border-white/20">
                    <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 glass-dark border-t border-white/20 bg-white/20">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder={activeThread.isAiEnabled ? "AI is assisting... Type to override" : "Type manual message..."}
                  className="flex-1 px-4 py-3 bg-white/40 rounded-2xl border-none focus:ring-1 focus:ring-indigo-500/30 text-sm placeholder:text-indigo-900/30 text-indigo-950 font-medium"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                />
                <button 
                  onClick={handleSend}
                  className="p-3 bg-indigo-600 text-white rounded-2xl hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-indigo-600/20"
                  disabled={isLoading || !input.trim()}
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-12 text-center">
            <div className="w-20 h-20 glass-dark rounded-full flex items-center justify-center mb-6 shadow-inner">
              <MessageSquare className="text-indigo-900/20" size={40} />
            </div>
            <h3 className="text-lg font-black text-indigo-950">Select a Conversation</h3>
            <p className="text-sm text-indigo-900/40">Your real-time customer chats appear here.</p>
          </div>
        )}
      </div>

      {/* 3. Utility Sidebar (Right) */}
      <div className="w-[340px] flex flex-col gap-6 overflow-y-auto pb-2">
        {/* Quick Links */}
        <div className="glass p-6 rounded-3xl border border-white/40 shadow-sm bg-white/30">
          <h4 className="font-black text-[10px] mb-4 uppercase tracking-widest text-indigo-900/50 flex items-center gap-2">
            <Zap size={14} className="text-indigo-600" />
            Quick Store Links
          </h4>
          <div className="space-y-2">
            {[
              { label: 'Return Policy', icon: FileText },
              { label: 'Delivery Timings (COD)', icon: Truck },
              { label: 'Current Inventory Sheet', icon: ClipboardList }
            ].map((link, i) => (
              <button key={i} className="w-full flex items-center justify-between p-3 glass-dark rounded-2xl hover:bg-white/30 transition-all border border-white/10 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-white/50 rounded-lg text-indigo-600">
                    <link.icon size={14} />
                  </div>
                  <span className="text-[11px] font-bold text-indigo-950">{link.label}</span>
                </div>
                <ChevronRight size={14} className="text-indigo-900/30" />
              </button>
            ))}
          </div>
        </div>

        {/* Order Capture Form */}
        <div className="glass p-6 rounded-3xl border border-rose-400/20 flex-1 flex flex-col shadow-lg bg-rose-50/10">
          <h4 className="font-black text-[10px] mb-4 uppercase tracking-widest text-rose-500 flex items-center gap-2">
            <ShoppingCart size={14} />
            Capture Active Order
          </h4>
          <form className="space-y-4" onSubmit={captureOrder}>
            <div>
              <label className="text-[9px] font-black text-indigo-900/40 uppercase mb-1 block tracking-widest">Customer Name</label>
              <input 
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs font-bold glass-dark rounded-xl border border-white/20 focus:ring-1 focus:ring-rose-400 outline-none transition-all shadow-sm"
                placeholder="Ex: Ali Zain"
              />
            </div>
            <div>
              <label className="text-[9px] font-black text-indigo-900/40 uppercase mb-1 block tracking-widest">WhatsApp Number</label>
              <input 
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs font-bold glass-dark rounded-xl border border-white/20 focus:ring-1 focus:ring-rose-400 outline-none transition-all shadow-sm"
                placeholder="03xx-xxxxxxx"
              />
            </div>
            <div>
              <label className="text-[9px] font-black text-indigo-900/40 uppercase mb-1 block tracking-widest">Ordered Item</label>
              <select 
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs font-bold glass-dark rounded-xl border border-white/20 outline-none shadow-sm cursor-pointer"
              >
                <option value="">Select SKU</option>
                {inventory.map(item => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black text-indigo-900/40 uppercase mb-1 block tracking-widest">Shipping Address</label>
              <textarea 
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs font-bold glass-dark rounded-xl border border-white/20 focus:ring-1 focus:ring-rose-400 outline-none h-20 resize-none transition-all shadow-sm"
                placeholder="House #, Area, City"
              />
            </div>
            <button 
              type="submit"
              className="w-full bg-rose-600 text-white font-black py-4 rounded-2xl hover:bg-rose-700 transition-all text-[10px] uppercase tracking-widest shadow-xl shadow-rose-600/30 active:scale-95 mt-2"
            >
              Confirm & Post Order
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function SettingsView({ settings, setSettings, showDebug, setShowDebug }: { settings: SellerSettings, setSettings: any, showDebug: boolean, setShowDebug: any }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-2xl glass rounded-[40px] p-8 border border-white/40 shadow-xl bg-white/30"
    >
      <h3 className="text-2xl font-black text-indigo-950 mb-8 underline decoration-rose-400 underline-offset-8 decoration-4 tracking-tight uppercase">Agent Configuration</h3>
      
      <div className="space-y-6">
        <div className="p-6 glass-dark rounded-3xl border border-white/20 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-black text-indigo-950 text-sm uppercase tracking-tight">Developer Debug Console</p>
              <p className="text-[10px] text-indigo-900/40 font-bold uppercase tracking-widest mt-1">Show live sync logs from Google Sheets</p>
            </div>
            <button 
              onClick={() => setShowDebug(!showDebug)}
              className={cn(
                "w-12 h-6 rounded-full transition-colors relative shadow-inner",
                showDebug ? "bg-emerald-500" : "bg-slate-300"
              )}
            >
              <motion.div 
                animate={{ x: showDebug ? 24 : 4 }}
                className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-md" 
              />
            </button>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black text-indigo-900/50 mb-2 uppercase tracking-widest">Store Personality Name</label>
          <input 
            type="text" 
            className="w-full px-4 py-3 glass rounded-2xl border-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-indigo-950 font-bold"
            value={settings.storeName}
            onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="block text-[10px] font-black text-indigo-900/50 mb-2 uppercase tracking-widest">Operating Currency</label>
            <input 
              type="text" 
              className="w-full px-4 py-3 glass rounded-2xl border-none text-indigo-950 font-bold"
              value={settings.currency}
              onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black text-indigo-900/50 mb-2 uppercase tracking-widest text-center">Urdu Conversation Dialect</label>
          <div className="grid grid-cols-3 gap-3">
            {['polite', 'casual', 'aggressive'].map((tone) => (
              <button
                key={tone}
                onClick={() => setSettings({ ...settings, urduTone: tone })}
                className={cn(
                  "py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border shadow-sm",
                  settings.urduTone === tone 
                    ? "bg-indigo-600 text-white border-indigo-700 shadow-indigo-500/20" 
                    : "glass border-indigo-900/10 text-indigo-900/50 hover:bg-white/40"
                )}
              >
                {tone}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black text-rose-500/50 mb-2 uppercase tracking-widest">Custom Gemini API Key (Optional)</label>
          <input 
            type="password" 
            placeholder="AI Studio API Key"
            className="w-full px-4 py-3 glass rounded-2xl border-none focus:outline-none focus:ring-2 focus:ring-rose-500/20 text-indigo-950 font-bold placeholder:text-indigo-900/20"
            value={settings.geminiApiKey || ''}
            onChange={(e) => setSettings({ ...settings, geminiApiKey: e.target.value })}
          />
          <p className="text-[9px] text-indigo-900/40 mt-1 font-bold italic px-2">Leave blank to use system default key.</p>
        </div>

        <div className="pt-6 border-t border-white/20">
          <h4 className="font-black text-[10px] text-indigo-900/50 mb-4 uppercase tracking-widest">Backend Operations</h4>
          <div className="flex items-center justify-between p-4 glass-dark rounded-2xl border border-white/30 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 glass rounded-xl flex items-center justify-center text-emerald-600 shadow-sm border border-white/20">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <p className="text-xs font-black text-indigo-950">Inventory_Master.xlsx</p>
                <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-tight">Status: Live & Syncing</p>
              </div>
            </div>
            <button className="text-[10px] font-black text-indigo-600 hover:underline tracking-widest uppercase">Force Sync</button>
          </div>
        </div>

        <button className="w-full mt-8 bg-indigo-900 text-white font-black py-4 rounded-2xl hover:bg-black transition-all shadow-xl shadow-indigo-950/20 uppercase tracking-widest text-sm active:scale-95">
          Save Profile Changes
        </button>
      </div>
    </motion.div>
  );
}
