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
import { fetchInventory as getInventory, syncOrder } from './services/inventoryService';
import { fetchChats, sendMessage as apiSendMessage, ChatThread as ApiChatThread } from './services/chatService';

const INITIAL_SETTINGS: SellerSettings = {
  storeName: 'flipside.pk',
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
  const [threads, setThreads] = useState<ApiChatThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<ApiChatThread | null>(null);
  const [manualMessage, setManualMessage] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const addLog = (msg: string, type: 'info' | 'error' = 'info') => {
    console.log(`[Dukaansync]: ${msg}`);
  };

  useEffect(() => {
    fetchInventory();
    fetchChatThreads();
    const interval = setInterval(fetchChatThreads, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchChatThreads = async () => {
    try {
      const data = await fetchChats();
      setThreads(data);
    } catch (error) {
      console.error('Failed to fetch chats:', error);
    }
  };

  const fetchInventory = async () => {
    try {
      setIsLoading(true);
      const data = await getInventory();
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
    <div className="flex h-screen p-6 gap-6 font-sans overflow-hidden bg-light-grey text-deep-charcoal">
      {/* Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden max-w-6xl mx-auto w-full">
        {/* Header */}
        <header className="h-16 px-6 glass rounded-2xl flex items-center justify-between mb-6 border border-dark-navy/10 shadow-sm mt-2">
          <div className="flex items-center gap-3">
            {!isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-dark-navy/5 rounded-lg transition-colors mr-2">
                <Menu size={20} className="text-dark-navy" />
              </button>
            )}
            <h1 className="text-xl font-black text-deep-charcoal tracking-tight uppercase">
              {activeTab === 'chat' ? 'Live Chats' : activeTab === 'codsync' ? 'Voice Agent' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 glass-dark px-3 py-1.5 rounded-full border border-dark-navy/10">
              <div className="status-glow" />
              <span className="text-[10px] font-black text-dark-navy uppercase tracking-widest">System Live</span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {activeTab === 'dashboard' && <DashboardView orders={orders} activeChatCount={threads.length} />}
              {activeTab === 'inventory' && <InventoryView inventory={inventory} setInventory={setInventory} onRefresh={fetchInventory} />}
              {activeTab === 'chat' && (
                <LiveChatsView 
                  threads={threads}
                  setThreads={setThreads}
                  inventory={inventory} 
                  settings={settings} 
                  onOrderCreated={(o) => setOrders([o, ...orders])}
                />
              )}
              {activeTab === 'codsync' && <CODSyncView onNavigateToRecordings={() => setActiveTab('recordings')} />}
              {activeTab === 'recordings' && <RecordingsView onBack={() => setActiveTab('codsync')} />}
              {activeTab === 'settings' && <SettingsView settings={settings} setSettings={setSettings} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

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
        "bg-deep-charcoal rounded-3xl flex flex-col h-full z-20 relative transition-all overflow-hidden border border-white/5 shadow-2xl",
        !isOpen && "border-none"
      )}
    >
      <div className="p-8 flex flex-col min-w-[260px]">
        <div className="mb-10 relative">
          <div className="text-2xl font-black tracking-tighter text-white">Munshi.Ai<span className="text-vibrant-teal">.</span></div>
          <div className="text-[9px] uppercase tracking-[0.2em] font-black text-vibrant-teal/60">Instant Commerce Agent</div>
          <button
            onClick={() => setIsOpen(false)}
            className="absolute -right-2 top-1 text-white/20 hover:text-white transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-6 min-w-[260px]">
        <div>
          <p className="px-4 text-[9px] font-black uppercase tracking-widest text-white/30 mb-3">Core Agent</p>
          <div className="space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group",
                  activeTab === item.id 
                    ? "bg-vibrant-teal text-deep-charcoal font-black shadow-lg shadow-vibrant-teal/20"
                    : "text-white/50 hover:bg-white/5 hover:text-white"
                )}
              >
                <item.icon size={18} className={cn(activeTab === item.id ? "text-deep-charcoal" : "group-hover:text-vibrant-teal transition-colors")} />
                <span className="font-black uppercase text-[10px] tracking-widest">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="px-4 text-[9px] font-black uppercase tracking-widest text-white/30 mb-3">Advanced</p>
          <button
            onClick={() => setActiveTab('codsync')}
            className={cn(
              "w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-200 group",
              activeTab === 'codsync' 
                ? "bg-vibrant-teal text-deep-charcoal font-black shadow-lg shadow-vibrant-teal/20"
                : "text-white/50 hover:bg-white/5 hover:text-white"
            )}
          >
            <div className="flex items-center gap-3">
              <Bot size={18} className={cn(activeTab === 'codsync' ? "text-deep-charcoal" : "group-hover:text-vibrant-teal transition-colors")} />
              <span className="font-black uppercase text-[10px] tracking-widest">Voice Agent</span>
            </div>
            <Zap size={12} className={activeTab === 'codsync' ? 'text-deep-charcoal' : 'text-vibrant-teal animate-pulse'} />
          </button>
        </div>
      </nav>

      <div className="p-6 mt-auto min-w-[260px]">
        <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
          <div className="text-[9px] uppercase text-white/30 mb-1 font-black tracking-widest">Connected Store</div>
          <div className="text-xs font-black text-vibrant-teal truncate">flipside.pk</div>
        </div>
      </div>
    </motion.aside>
  );
}

// --- Views ---

function DashboardView({ orders, activeChatCount }: { orders: Order[]; activeChatCount: number }) {
  const stats = [
    { label: 'Active Chats', value: String(activeChatCount), change: 'Live', icon: MessageSquare, color: 'text-vibrant-teal' },
    { label: 'Total Orders', value: String(orders.length), change: 'Live', icon: Store, color: 'text-soft-gold' },
  ];

  return (
    <div className="space-y-6 pb-6 pr-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="glass p-8 rounded-3xl transition-all hover:shadow-lg hover:border-vibrant-teal/30 cursor-default border border-dark-navy/10 shadow-sm group">
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-4 rounded-2xl bg-dark-navy/5 group-hover:bg-vibrant-teal/10 transition-colors border border-dark-navy/5", stat.color)}>
                <stat.icon size={32} />
              </div>
              <span className="text-[11px] font-black text-vibrant-teal px-3 py-1 bg-vibrant-teal/5 rounded-full border border-vibrant-teal/10">
                {stat.change}
              </span>
            </div>
            <p className="text-xs text-dark-navy/40 font-black uppercase tracking-[0.2em]">{stat.label}</p>
            <h3 className="text-4xl font-black mt-2 text-deep-charcoal tracking-tight">{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* Recent Orders List */}
      <div className="glass rounded-[40px] p-8 border border-dark-navy/10 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-black text-deep-charcoal flex items-center gap-3 uppercase tracking-tight">
            <div className="p-2 bg-vibrant-teal/10 rounded-lg text-vibrant-teal">
              <Truck size={20} />
            </div>
            Recent Verified Orders
          </h3>
          <button className="text-[10px] font-black text-dark-navy/40 hover:text-dark-navy uppercase tracking-widest transition-colors">View All</button>
        </div>
        
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="p-20 text-center glass rounded-3xl border border-dark-navy/5 bg-dark-navy/[0.02]">
              <div className="w-16 h-16 bg-dark-navy/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingCart className="text-dark-navy/20" size={24} />
              </div>
              <p className="italic font-black uppercase text-[10px] tracking-[0.2em] text-dark-navy/30">
                No orders placed yet
              </p>
            </div>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="p-5 hover:bg-dark-navy/[0.02] rounded-3xl border border-transparent hover:border-dark-navy/5 transition-all flex items-center justify-between gap-4 group">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 glass rounded-2xl flex items-center justify-center text-dark-navy/30 group-hover:text-vibrant-teal shadow-sm font-black transition-colors border border-dark-navy/5">
                      {order.customerName[0]}
                   </div>
                   <div>
                      <p className="font-black text-deep-charcoal text-sm">{order.customerName}</p>
                      <p className="text-[10px] text-dark-navy/40 font-bold uppercase tracking-widest">{order.address}</p>
                   </div>
                </div>
                <div className="text-right">
                   <p className="font-black text-deep-charcoal text-sm">Rs. {order.totalPrice}</p>
                   <span className="text-[8px] bg-emerald-500/10 text-emerald-600 px-2.5 py-1 rounded-full font-black border border-emerald-500/20 uppercase tracking-widest">Verified</span>
                </div>
              </div>
            ))
          )}
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
        <div className="relative flex-1 max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-navy/20 group-focus-within:text-vibrant-teal transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search products by name or category..."
            className="w-full pl-12 pr-4 py-4 glass rounded-2xl focus:outline-none focus:ring-2 focus:ring-vibrant-teal/20 text-deep-charcoal placeholder:text-dark-navy/20 font-bold border border-dark-navy/10 shadow-sm transition-all text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleSync}
            disabled={isSyncing}
            className={cn(
              "bg-vibrant-teal text-deep-charcoal px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-3 transition-all shadow-xl shadow-vibrant-teal/20 active:scale-95 text-[10px] uppercase tracking-widest border border-vibrant-teal/10",
              isSyncing && "opacity-50 cursor-not-allowed"
            )}
          >
            <Zap size={18} className={cn(isSyncing && "animate-pulse")} />
            {isSyncing ? 'Refreshing...' : 'Refresh Sheet Data'}
          </button>
        </div>
      </div>

      <div className="glass rounded-[40px] overflow-hidden shadow-sm border border-dark-navy/10">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-dark-navy/5 border-b border-dark-navy/10">
              <th className="px-8 py-5 text-[9px] font-black uppercase text-dark-navy/40 tracking-[0.2em]">Product Detail</th>
              <th className="px-8 py-5 text-[9px] font-black uppercase text-dark-navy/40 tracking-[0.2em]">Category</th>
              <th className="px-8 py-5 text-[9px] font-black uppercase text-dark-navy/40 tracking-[0.2em]">Price</th>
              <th className="px-8 py-5 text-[9px] font-black uppercase text-dark-navy/40 tracking-[0.2em]">Inventory</th>
              <th className="px-8 py-5 text-[9px] font-black uppercase text-dark-navy/40 tracking-[0.2em] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-navy/5">
            {filtered.map((item) => (
              <tr key={item.id} className="hover:bg-dark-navy/[0.02] transition-colors group">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 glass rounded-2xl flex items-center justify-center text-dark-navy/20 group-hover:text-vibrant-teal transition-colors border border-dark-navy/5 shadow-sm">
                      <Package size={22} />
                    </div>
                    <div>
                      <p className="font-black text-deep-charcoal text-sm">{item.name}</p>
                      <p className="text-[10px] font-black text-dark-navy/30 uppercase tracking-widest">{item.size}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className="text-[9px] font-black px-3 py-1.5 bg-dark-navy/5 rounded-lg text-dark-navy/60 uppercase tracking-widest border border-dark-navy/5">
                    {item.category}
                  </span>
                </td>
                <td className="px-8 py-6 font-black text-deep-charcoal text-sm">
                  {INITIAL_SETTINGS.currency} {item.price}
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      item.stock > 10 ? "bg-vibrant-teal shadow-[0_0_12px_#00C2A8]" : item.stock > 0 ? "bg-soft-gold shadow-[0_0_12px_#D4AF37]" : "bg-deep-charcoal shadow-[0_0_12px_#1A1A1A]"
                    )} />
                    <span className="text-[11px] font-black text-dark-navy/60 uppercase tracking-tight">{item.stock} Units Available</span>
                  </div>
                </td>
                <td className="px-8 py-6 text-right">
                  <button className="text-vibrant-teal font-black text-[10px] uppercase tracking-widest hover:bg-vibrant-teal/10 px-4 py-2 rounded-lg transition-colors border border-transparent hover:border-vibrant-teal/20">Manage</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LiveChatsView({ threads, setThreads, inventory, settings, onOrderCreated }: {
  threads: ApiChatThread[], 
  setThreads: any,
  inventory: InventoryItem[], 
  settings: SellerSettings,
  onOrderCreated: (order: Order) => void
}) {
  const [activeThreadId, setActiveThreadId] = useState<string | null>(threads[0]?.id || null);
  const [manualMessage, setManualMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [fromName, setFromName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const activeThread = threads.find(t => t.id === activeThreadId);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeThread?.messages]);

  const handleSendManual = async () => {
    if (!manualMessage.trim() || isSending || !activeThreadId) return;

    setIsSending(true);
    try {
      await apiSendMessage(activeThreadId, manualMessage);
      setManualMessage('');
      // Refresh threads after sending
      const updatedThreads = await fetchChats();
      setThreads(updatedThreads);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
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

      const responseData = await syncOrder(syncPayload);

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
    <div className="h-[calc(100vh-160px)] flex gap-6 pb-6 relative justify-center">
      {/* Order Success Notification */}
      <AnimatePresence>
        {orderSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-[60] bg-vibrant-teal text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl flex items-center gap-3 border border-vibrant-teal ring-4 ring-vibrant-teal/10"
          >
            <CheckCircle2 size={18} />
            Order Confirmed & Sheet Updated!
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. Chat Headers Sidebar (Left) */}
      <div className="w-80 flex flex-col glass rounded-3xl overflow-hidden border border-dark-navy/10 shadow-sm bg-light-grey/50">
        <div className="p-4 bg-dark-navy/5 border-b border-dark-navy/10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-navy/40" size={16} />
            <input 
              type="text" 
              placeholder="Search chats..."
              className="w-full pl-9 pr-4 py-2 bg-dark-navy/5 rounded-xl text-xs font-bold text-dark-navy placeholder:text-dark-navy/30 border-none focus:ring-0"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-dark-navy/5">
          {threads.map((thread) => (
            <button
              key={thread.id}
              onClick={() => setActiveThreadId(thread.id)}
              className={cn(
                "w-full p-4 flex gap-3 text-left transition-all relative overflow-hidden group",
                activeThreadId === thread.id ? "bg-dark-navy/5" : "hover:bg-dark-navy/2"
              )}
            >
              <div className="relative">
                <div className="w-12 h-12 glass rounded-2xl flex items-center justify-center font-black text-dark-navy text-lg border border-dark-navy/10 shadow-sm">
                  {thread.customerName[0]}
                </div>
                {thread.unreadCount && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-vibrant-teal text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg ring-2 ring-white">
                    {thread.unreadCount}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-0.5">
                  <p className="font-black text-sm text-deep-charcoal truncate tracking-tight">{thread.customerName}</p>
                  <span className="text-[9px] text-dark-navy/40 font-bold uppercase">{new Date(thread.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-xs text-dark-navy/60 truncate font-medium">{thread.lastMessage}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="text-[8px] bg-vibrant-teal/10 text-vibrant-teal px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest border border-vibrant-teal/20">Live</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Main Chat Area (Center) */}
      <div className="flex-1 max-w-4xl flex flex-col glass rounded-3xl overflow-hidden border border-dark-navy/10 relative shadow-xl">
        {activeThread ? (
          <>
            <div className="p-4 bg-dark-navy/5 border-b border-dark-navy/10 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 glass rounded-2xl flex items-center justify-center text-dark-navy border border-dark-navy/10 shadow-sm">
                  <User size={20} />
                </div>
                <div>
                  <p className="font-black text-deep-charcoal text-sm tracking-tight">{activeThread.customerName}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] text-vibrant-teal font-bold uppercase tracking-widest">Live WhatsApp Chat</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button className="p-2 text-dark-navy/40 hover:text-dark-navy transition-colors">
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
              {activeThread.messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                  <Bot size={48} className="mb-4 text-dark-navy" />
                  <p className="text-sm font-bold uppercase tracking-widest text-dark-navy">Start the conversation</p>
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
                      ? "bg-dark-navy text-white border-dark-navy rounded-tr-none"
                      : "glass border-dark-navy/10 text-deep-charcoal rounded-tl-none"
                  )}>
                    {msg.content}
                  </div>
                  <span className="text-[9px] font-black text-dark-navy/40 mt-1 px-1 uppercase tracking-tighter">
                    {msg.role === 'assistant' ? 'Agent / Store' : 'Customer'} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
              {isLoading && (
                <div className="flex items-start">
                  <div className="glass px-4 py-3 rounded-2xl rounded-tl-none flex gap-1.5 border border-dark-navy/10">
                    <div className="w-1.5 h-1.5 bg-vibrant-teal rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-vibrant-teal rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-vibrant-teal rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-dark-navy/5 border-t border-dark-navy/10">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Type manual reply to customer..."
                  className="flex-1 px-4 py-3 glass rounded-2xl border-none focus:ring-1 focus:ring-vibrant-teal/30 text-sm placeholder:text-dark-navy/30 text-deep-charcoal font-medium"
                  value={manualMessage}
                  onChange={(e) => setManualMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendManual()}
                />
                <button 
                  onClick={handleSendManual}
                  className="p-3 bg-vibrant-teal text-white rounded-2xl hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-vibrant-teal/20"
                  disabled={isSending || !manualMessage.trim()}
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-12 text-center">
            <div className="w-20 h-20 glass-dark rounded-full flex items-center justify-center mb-6 shadow-inner">
              <MessageSquare className="text-dark-navy/20" size={40} />
            </div>
            <h3 className="text-lg font-black text-dark-navy">Select a Conversation</h3>
            <p className="text-sm text-dark-navy/40">Your real-time customer chats appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsView({ settings, setSettings }: { settings: SellerSettings, setSettings: any }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-2xl glass rounded-[40px] p-8 border border-dark-navy/10 shadow-xl"
    >
      <h3 className="text-2xl font-black text-deep-charcoal mb-8 underline decoration-vibrant-teal underline-offset-8 decoration-4 tracking-tight uppercase">Agent Configuration</h3>
      
      <div className="space-y-6">
        <div>
          <label className="block text-[10px] font-black text-dark-navy/50 mb-2 uppercase tracking-widest">Store Personality Name</label>
          <input 
            type="text" 
            className="w-full px-4 py-3 glass rounded-2xl border-none focus:outline-none focus:ring-2 focus:ring-vibrant-teal/20 text-deep-charcoal font-bold"
            value={settings.storeName}
            onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="block text-[10px] font-black text-dark-navy/50 mb-2 uppercase tracking-widest">Operating Currency</label>
            <input 
              type="text" 
              className="w-full px-4 py-3 glass rounded-2xl border-none text-deep-charcoal font-bold"
              value={settings.currency}
              onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black text-dark-navy/50 mb-2 uppercase tracking-widest text-center">Urdu Conversation Dialect</label>
          <div className="grid grid-cols-3 gap-3">
            {['polite', 'casual', 'aggressive'].map((tone) => (
              <button
                key={tone}
                onClick={() => setSettings({ ...settings, urduTone: tone })}
                className={cn(
                  "py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border shadow-sm",
                  settings.urduTone === tone 
                    ? "bg-dark-navy text-white border-dark-navy shadow-dark-navy/20"
                    : "glass border-dark-navy/10 text-dark-navy/50 hover:bg-dark-navy/5"
                )}
              >
                {tone}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black text-vibrant-teal/50 mb-2 uppercase tracking-widest">Custom Gemini API Key (Optional)</label>
          <input 
            type="password" 
            placeholder="AI Studio API Key"
            className="w-full px-4 py-3 glass rounded-2xl border-none focus:outline-none focus:ring-2 focus:ring-vibrant-teal/20 text-deep-charcoal font-bold placeholder:text-dark-navy/20"
            value={settings.geminiApiKey || ''}
            onChange={(e) => setSettings({ ...settings, geminiApiKey: e.target.value })}
          />
          <p className="text-[9px] text-dark-navy/40 mt-1 font-bold italic px-2">Leave blank to use system default key.</p>
        </div>

        <div className="pt-6 border-t border-dark-navy/10">
          <h4 className="font-black text-[10px] text-dark-navy/50 mb-4 uppercase tracking-widest">Backend Operations</h4>
          <div className="flex items-center justify-between p-4 glass-dark rounded-2xl border border-dark-navy/10 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 glass rounded-xl flex items-center justify-center text-vibrant-teal shadow-sm border border-dark-navy/10">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <p className="text-xs font-black text-deep-charcoal">Inventory_Master.xlsx</p>
                <p className="text-[10px] text-vibrant-teal font-bold uppercase tracking-tight">Status: Live & Syncing</p>
              </div>
            </div>
            <button className="text-[10px] font-black text-vibrant-teal hover:underline tracking-widest uppercase">Force Sync</button>
          </div>
        </div>

        <button className="w-full mt-8 bg-dark-navy text-white font-black py-4 rounded-2xl hover:bg-deep-charcoal transition-all shadow-xl shadow-dark-navy/20 uppercase tracking-widest text-sm active:scale-95">
          Save Profile Changes
        </button>
      </div>
    </motion.div>
  );
}
