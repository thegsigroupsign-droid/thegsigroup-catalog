import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, ShoppingCart, ChevronRight, Filter, MessageSquare, X, Send,
  Info, Package, Star, Zap, Plus, Trash2, Settings, Image as ImageIcon,
  ExternalLink, PenTool, Layers, Printer, Truck, Maximize
} from 'lucide-react';

// Firebase Imports
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, onSnapshot, addDoc, deleteDoc } from 'firebase/firestore';

// --- THE GSI GROUP BRANDING (FLORIDA) ---
const COMPANY_NAME = "The GSI Group";
const COMPANY_TAGLINE = "Signs & Visual Communication";
const PRIMARY_COLOR = "#F36F21"; // Laranja do logotipo
const WHATSAPP_NUMBER = "4074885194"; // ATUALIZE COM SEU NÚMERO REAL

const INITIAL_SERVICES = [
  { id: '1', name: "Full Vehicle Wrap", category: "Car Wrap", price: 3500, rating: 5.0, description: "Professional 3M/Avery vinyl wrapping for fleets and personal vehicles in Florida. UV protected and long lasting.", image: "https://images.unsplash.com/photo-1600367168103-d3d0c5ca1024?auto=format&fit=crop&q=80&w=800" },
  { id: '2', name: "Illuminated Channel Letters", category: "Illuminated Signs", price: 2800, rating: 4.9, description: "High-visibility LED signs for storefronts. Weather-resistant and energy efficient. UL Certified.", image: "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&q=80&w=800" },
  { id: '3', name: "Custom Wall Graphics", category: "Wall Graphics", price: 1200, rating: 5.0, description: "Transform your office space with custom-printed high-tack wall murals. Precision installation included.", image: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800" },
];

const CATEGORIES = ["All", "Car Wrap", "Illuminated Signs", "Window Graphics", "Wall Graphics", "Laser/CNC", "Outdoor Signs", "Graphic Design"];

// Firebase Resilience Logic
let db = null;
let auth = null;
let appId = "the-gsi-prod";

try {
  const configStr = typeof __firebase_config !== 'undefined' ? __firebase_config : null;
  if (configStr) {
    const firebaseConfig = JSON.parse(configStr);
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
    appId = typeof __app_id !== 'undefined' ? __app_id : appId;
  }
} catch (error) {
  console.log("Running in local demo mode (Cloud DB not connected).");
}

export default function App() {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState(INITIAL_SERVICES);
  const [filter, setFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  
  const [newProduct, setNewProduct] = useState({ name: '', category: 'Car Wrap', price: '', description: '', image: '', rating: 5 });
  const [aiMessages, setAiMessages] = useState([{ role: 'assistant', text: `Hi! Welcome to ${COMPANY_NAME}. How can I assist you with your signage project today?` }]);
  const [userInput, setUserInput] = useState("");
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) { setUser(u); } else { signInAnonymously(auth).catch(console.error); }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!db || !user) return;
    try {
      const productsRef = collection(db, 'artifacts', appId, 'public', 'data', 'products');
      const unsubscribe = onSnapshot(productsRef, (snapshot) => {
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        if (docs.length > 0) setProducts(docs);
      });
      return () => unsubscribe();
    } catch (e) { console.log("Cloud sync pending."); }
  }, [user]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => (filter === "All" || p.category === filter) && p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [products, filter, searchTerm]);const handleSendMessage = async () => {
    if (!userInput.trim() || isLoadingAi) return;
    const userMsg = { role: 'user', text: userInput };
    setAiMessages(prev => [...prev, userMsg]);
    setUserInput("");
    setIsLoadingAi(true);
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: userInput }] }], systemInstruction: { parts: [{ text: `You are a consultant for ${COMPANY_NAME} signs.` }] } })
      });
      const data = await response.json();
      setAiMessages(prev => [...prev, { role: 'assistant', text: data?.candidates?.[0]?.content?.parts?.[0]?.text || "How can I help you today?" }]);
    } catch (e) { console.error(e); } finally { setIsLoadingAi(false); }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!db || !user) {
      setProducts(prev => [...prev, { ...newProduct, id: Date.now().toString(), price: Number(newProduct.price) }]);
      setNewProduct({ name: '', category: 'Car Wrap', price: '', description: '', image: '', rating: 5 });
      return;
    }
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'products'), { ...newProduct, price: Number(newProduct.price) });
      setNewProduct({ name: '', category: 'Car Wrap', price: '', description: '', image: '', rating: 5 });
    } catch (err) { console.error(err); }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-orange-100">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-20 flex justify-between items-center">
          <div className="flex flex-col">
            <h1 className="text-2xl font-black italic leading-none uppercase">THE <span style={{ color: PRIMARY_COLOR }}>GSI</span> GROUP</h1>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{COMPANY_TAGLINE}</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsAdminMode(!isAdminMode)} className={`p-2 rounded-xl transition-all ${isAdminMode ? 'bg-orange-600 text-white' : 'text-slate-400 hover:bg-slate-100'}`}><Settings className="w-5 h-5" /></button>
            <button className="bg-slate-900 text-white px-5 py-2.5 rounded-2xl text-sm font-bold">Contact</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-10">
        <div className="mb-12 bg-[#F36F21] rounded-[2.5rem] p-10 text-white relative overflow-hidden flex flex-col md:flex-row items-center justify-between shadow-2xl">
          <div className="relative z-10 max-w-xl">
            <h2 className="text-4xl md:text-5xl font-black mb-4 leading-none text-white uppercase">STAND OUT <br/><span className="text-neutral-900 underline decoration-4 underline-offset-8">IN FLORIDA.</span></h2>
            <p className="text-orange-50 mb-8 text-lg font-medium opacity-90">High-impact signage, vehicle branding, and visual marketing solutions.</p>
            <button onClick={() => setIsAiChatOpen(true)} className="bg-neutral-900 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-black shadow-xl"><MessageSquare className="w-5 h-5" /> AI Consultant</button>
          </div>
          <PenTool className="w-48 h-48 text-white/10 absolute -right-10 -bottom-10 rotate-12" />
        </div>

        {isAdminMode && (
          <div className="mb-12 p-8 bg-white border-2 border-dashed border-orange-200 rounded-[2.5rem] animate-in slide-in-from-top duration-500 shadow-xl">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Plus /> Add to Live Catalog</h2>
            <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input placeholder="Project Name" className="p-4 bg-slate-50 border border-slate-100 rounded-xl" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} required />
                <input placeholder="Est. Price ($)" type="number" className="p-4 bg-slate-50 border border-slate-100 rounded-xl" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} required />
                <input placeholder="Image URL (Direct link)" className="md:col-span-2 p-4 bg-slate-50 border border-slate-100 rounded-xl" value={newProduct.image} onChange={e => setNewProduct({...newProduct, image: e.target.value})} required />
                <button className="md:col-span-2 bg-orange-600 text-white p-4 rounded-2xl font-bold">Add Project</button>
            </form>
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-8 no-scrollbar">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filter === cat ? "bg-slate-900 text-white shadow-xl" : "bg-white text-slate-500 border border-slate-200 hover:border-orange-500"}`}>{cat}</button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredProducts.map(product => (
            <div key={product.id} className="group bg-white rounded-[2.5rem] p-4 border border-slate-100 flex flex-col hover:shadow-2xl transition-all duration-500">
              <div className="aspect-square rounded-[2rem] overflow-hidden bg-slate-100 mb-5 relative"><img src={product.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt={product.name} /></div>
              <div className="flex-1 px-1">
                <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">{product.category}</span>
                <h3 className="font-bold text-lg mb-2 group-hover:text-orange-600 transition-colors leading-tight">{product.name}</h3>
                <div className="mt-auto pt-4 border-t border-slate-50 flex justify-between items-center"><span className="font-black text-xl text-slate-900">${product.price}</span><button onClick={() => setSelectedProduct(product)} className="bg-slate-900 text-white p-3 rounded-2xl active:scale-90 transition-all"><Maximize className="w-4 h-4" /></button></div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-white rounded-[3.5rem] max-w-5xl w-full flex flex-col md:flex-row overflow-hidden shadow-2xl my-auto animate-in zoom-in duration-300">
            <div className="md:w-1/2 h-[400px] md:h-auto"><img src={selectedProduct.image} className="w-full h-full object-cover" alt={selectedProduct.name} /></div>
            <div className="md:w-1/2 p-10 md:p-16 flex flex-col justify-center">
              <button onClick={() => setSelectedProduct(null)} className="self-end text-slate-300 hover:text-slate-900 mb-4 transition-colors"><X className="w-8 h-8" /></button>
              <h2 className="text-4xl font-black text-slate-900 mt-2 mb-6 leading-tight">{selectedProduct.name}</h2>
              <p className="text-slate-500 mb-10 text-lg">{selectedProduct.description}</p>
              <div className="flex flex-col sm:flex-row justify-between items-center gap-6 pt-8 border-t border-slate-100"><span className="text-4xl font-black text-slate-900">${selectedProduct.price}</span>
                <button onClick={() => window.open(`https://wa.me/${WHATSAPP_NUMBER}`)} className="w-full sm:w-auto bg-orange-600 text-white px-10 py-5 rounded-[2.5rem] font-black shadow-xl shadow-orange-100 hover:bg-orange-700 transition-all flex items-center justify-center gap-3">Request Quote <ExternalLink className="w-5 h-5" /></button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`fixed bottom-8 right-8 z-50 transition-all duration-500 transform ${isAiChatOpen ? 'translate-y-0 scale-100' : 'translate-y-20 scale-0 pointer-events-none'}`}>
        <div className="bg-white rounded-[3rem] shadow-2xl w-[360px] sm:w-[420px] h-[600px] flex flex-col border border-slate-100 overflow-hidden">
          <div className="bg-slate-900 p-8 text-white flex justify-between items-center relative overflow-hidden"><h4 className="font-bold text-sm tracking-wide">Project Assistant</h4><button onClick={() => setIsAiChatOpen(false)}><X className="w-5 h-5" /></button></div>
          <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/50">
            {aiMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] p-5 rounded-[2rem] text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-orange-600 text-white rounded-tr-none' : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'}`}>{msg.text}</div></div>
            ))}
          </div>
          <div className="p-6 bg-white border-t border-slate-100 flex gap-3">
            <input className="flex-1 bg-slate-100 rounded-2xl px-6 py-4 text-sm outline-none focus:ring-2 focus:ring-orange-500" placeholder="Ask about wraps..." value={userInput} onChange={e => setUserInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSendMessage()} />
            <button onClick={handleSendMessage} className="bg-slate-900 text-white p-4 rounded-2xl shadow-xl hover:bg-orange-600 transition-all"><Send className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {!isAiChatOpen && <button onClick={() => setIsAiChatOpen(true)} className="fixed bottom-10 right-10 bg-orange-500 text-white p-6 rounded-[2.5rem] shadow-2xl hover:scale-110 active:scale-95 transition-all z-40 group shadow-orange-500/40"><MessageSquare className="w-8 h-8" /></button>}

      <footer className="bg-slate-900 text-white py-16 mt-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
            <h2 className="text-2xl font-black italic mb-6 uppercase">THE <span className="text-orange-500">GSI</span> GROUP</h2>
            <p className="text-slate-500 text-sm max-w-sm mx-auto mb-10">Premium signage solutions in Florida. Multilingual support available.</p>
            <p className="text-[9px] text-slate-700 font-black uppercase tracking-[0.5em]">© 2026 THE GSI GROUP • FLORIDA • USA</p>
        </div>
      </footer>
    </div>
  );
}
