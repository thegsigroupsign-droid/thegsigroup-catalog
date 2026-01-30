import React, { useState, useEffect, useMemo } from 'react';
import {
Search, ShoppingCart, ChevronRight, Filter, MessageSquare, X, Send,
Info, Package, Star, Zap, Plus, Trash2, Settings, Image as ImageIcon,
ExternalLink, PenTool, Layers, Printer, Truck, Maximize
} from 'lucide-react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, onSnapshot, addDoc, deleteDoc } from 'firebase/firestore';

// --- THE GSI GROUP BRANDING ---
const COMPANY_NAME = "The GSI Group";
const COMPANY_TAGLINE = "Signs & Visual Communication";
const PRIMARY_COLOR = "#F36F21";
const WHATSAPP_NUMBER = "17860000000";

const INITIAL_SERVICES = [
{ id: '1', name: "Full Vehicle Wrap", category: "Car Wrap", price: 3500, rating: 5.0, description: "Professional 3M/Avery vinyl wrapping for fleets and personal vehicles in Florida.", image: "https://www.google.com/search?q=https://images.unsplash.com/photo-1600367168103-d3d0c5ca1024%3Fauto%3Dformat%26fit%3Dcrop%26q%3D80%26w%3D600" },
{ id: '2', name: "Illuminated Channel Letters", category: "Illuminated Signs", price: 2800, rating: 4.9, description: "High-visibility LED signs for storefronts. Weather-resistant and energy efficient.", image: "https://www.google.com/search?q=https://images.unsplash.com/photo-1563245372-f21724e3856d%3Fauto%3Dformat%26fit%3Dcrop%26q%3D80%26w%3D600" },
{ id: '3', name: "Custom Wall Graphics", category: "Wall Graphics", price: 1200, rating: 5.0, description: "Transform your office space with custom-printed high-tack wall murals.", image: "https://www.google.com/search?q=https://images.unsplash.com/photo-1497366216548-37526070297c%3Fauto%3Dformat%26fit%3Dcrop%26q%3D80%26w%3D600" },
];

const CATEGORIES = ["All", "Car Wrap", "Illuminated Signs", "Window Graphics", "Wall Graphics", "Laser/CNC", "Outdoor Signs", "Graphic Design"];

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
console.log("Running in demo mode.");
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
const [aiMessages, setAiMessages] = useState([{ role: 'assistant', text: "Hi! Welcome to The GSI Group. How can I help you today?" }]);
const [userInput, setUserInput] = useState("");
const [isLoadingAi, setIsLoadingAi] = useState(false);

useEffect(() => {
if (!auth) return;
const unsubscribe = onAuthStateChanged(auth, (u) => {
if (u) setUser(u); else signInAnonymously(auth).catch(console.error);
});
return () => unsubscribe();
}, []);

useEffect(() => {
if (!db || !user) return;
const productsRef = collection(db, 'artifacts', appId, 'public', 'data', 'products');
const unsubscribe = onSnapshot(productsRef, (snap) => {
const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
if (docs.length > 0) setProducts(docs);
});
return () => unsubscribe();
}, [user]);

const filteredProducts = useMemo(() => {
return products.filter(p => (filter === "All" || p.category === filter) && p.name.toLowerCase().includes(searchTerm.toLowerCase()));
}, [products, filter, searchTerm]);

const handleSendMessage = async () => {
if (!userInput.trim() || isLoadingAi) return;
setAiMessages(p => [...p, { role: 'user', text: userInput }]);
setIsLoadingAi(true);
try {
const response = await fetch(https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=, {
method: 'POST', headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ contents: [{ parts: [{ text: userInput }] }], systemInstruction: { parts: [{ text: "Expert for GSI Group Signs." }] } })
});
const data = await response.json();
setAiMessages(p => [...p, { role: 'assistant', text: data?.candidates?.[0]?.content?.parts?.[0]?.text || "I am ready to help!" }]);
} catch (e) { console.error(e); } finally { setIsLoadingAi(false); setUserInput(""); }
};

const handleAddProduct = async (e) => {
e.preventDefault();
if (!db || !user) {
setProducts(p => [...p, { ...newProduct, id: Date.now().toString(), price: Number(newProduct.price) }]);
setNewProduct({ name: '', category: 'Car Wrap', price: '', description: '', image: '', rating: 5 });
return;
}
await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'products'), { ...newProduct, price: Number(newProduct.price) });
setNewProduct({ name: '', category: 'Car Wrap', price: '', description: '', image: '', rating: 5 });
};return (
<div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-orange-100">
<header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
<div className="max-w-7xl mx-auto px-4 h-20 flex justify-between items-center">
<div className="flex flex-col">
<h1 className="text-2xl font-black italic leading-none">THE <span style={{ color: PRIMARY_COLOR }}>GSI</span> GROUP</h1>
<span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{COMPANY_TAGLINE}</span>
</div>
<div className="flex items-center gap-4">
<button onClick={() => setIsAdminMode(!isAdminMode)} className={p-2 rounded-xl ${isAdminMode ? 'bg-orange-600 text-white' : 'text-slate-400'}}><Settings className="w-5 h-5" /></button>
<button className="bg-slate-900 text-white px-5 py-2.5 rounded-2xl text-sm font-bold">Contact</button>
</div>
</div>
</header>

  <main className="max-w-7xl mx-auto px-4 py-10">
    <div className="mb-12 bg-[#F36F21] rounded-[2.5rem] p-10 text-white relative overflow-hidden flex flex-col md:flex-row items-center justify-between shadow-2xl">
      <div className="relative z-10 max-w-xl">
        <h2 className="text-4xl md:text-5xl font-black mb-4 leading-none">SIGNAGE & <span className="text-neutral-900 underline">GRAPHICS.</span></h2>
        <p className="text-orange-50 mb-8 text-lg font-medium">Florida's premium choice for vehicle wraps and custom signs.</p>
        <button onClick={() => setIsAiChatOpen(true)} className="bg-neutral-900 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 shadow-lg">
          <MessageSquare className="w-5 h-5" /> AI Project Planner
        </button>
      </div>
      <PenTool className="w-48 h-48 text-white/10 absolute -right-10 -bottom-10 rotate-12" />
    </div>

    {isAdminMode && (
      <div className="mb-12 p-8 bg-white border-2 border-dashed border-orange-200 rounded-[2.5rem] animate-in slide-in-from-top duration-500">
        <h2 className="text-xl font-bold mb-6">Catalog Management</h2>
        <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <input placeholder="Service Title" className="p-4 bg-slate-50 rounded-xl" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} required />
            <select className="p-4 bg-slate-50 rounded-xl" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})}>
                {CATEGORIES.filter(c => c !== "All").map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input placeholder="Base Price ($)" type="number" className="p-4 bg-slate-50 rounded-xl" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} required />
            <input placeholder="Direct Image URL" className="p-4 bg-slate-50 rounded-xl" value={newProduct.image} onChange={e => setNewProduct({...newProduct, image: e.target.value})} required />
            <textarea placeholder="Service details..." className="md:col-span-2 p-4 bg-slate-50 rounded-xl h-24" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} required />
            <button className="md:col-span-2 bg-orange-600 text-white p-4 rounded-2xl font-bold shadow-xl">Update Catalog</button>
        </form>
      </div>
    )}

    <div className="flex gap-2 overflow-x-auto pb-8 no-scrollbar">
      {CATEGORIES.map(cat => (
        <button key={cat} onClick={() => setFilter(cat)} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filter === cat ? "bg-slate-900 text-white" : "bg-white text-slate-500 border border-slate-200"}`}>{cat}</button>
      ))}
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
      {filteredProducts.map(product => (
        <div key={product.id} className="bg-white rounded-[2.5rem] p-4 border border-slate-100 flex flex-col group hover:shadow-2xl transition-all duration-500">
          <div className="aspect-square rounded-[2rem] overflow-hidden bg-slate-100 mb-5"><img src={product.image} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-1000" alt={product.name} /></div>
          <div className="flex-1"><span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">{product.category}</span><h3 className="font-bold text-lg mb-2 group-hover:text-orange-600">{product.name}</h3>
            <div className="mt-auto pt-4 border-t border-slate-50 flex justify-between items-center"><span className="font-black text-xl text-slate-900">${product.price}</span><button onClick={() => setSelectedProduct(product)} className="bg-slate-900 text-white p-3 rounded-2xl"><Maximize className="w-4 h-4" /></button></div>
          </div>
        </div>
      ))}
    </div>
  </main>

  {selectedProduct && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md">
      <div className="bg-white rounded-[3.5rem] max-w-5xl w-full flex flex-col md:flex-row overflow-hidden shadow-2xl animate-in zoom-in">
        <div className="md:w-1/2 h-[400px] md:h-auto"><img src={selectedProduct.image} className="w-full h-full object-cover" alt={selectedProduct.name} /></div>
        <div className="md:w-1/2 p-10 md:p-16 flex flex-col justify-center">
          <button onClick={() => setSelectedProduct(null)} className="self-end text-slate-300 hover:text-slate-900 mb-4"><X className="w-8 h-8" /></button>
          <h2 className="text-4xl font-black text-slate-900 mb-6 leading-tight">{selectedProduct.name}</h2>
          <p className="text-slate-500 mb-10 text-lg">{selectedProduct.description}</p>
          <div className="flex justify-between items-center pt-8 border-t border-slate-100"><span className="text-4xl font-black text-slate-900">${selectedProduct.price}</span>
            <button onClick={() => window.open(`https://wa.me/${WHATSAPP_NUMBER}`)} className="bg-orange-600 text-white px-10 py-5 rounded-[2.5rem] font-black shadow-xl">Request Quote</button>
          </div>
        </div>
      </div>
    </div>
  )}

  <div className={`fixed bottom-8 right-8 z-50 transition-all duration-500 transform ${isAiChatOpen ? 'translate-y-0 scale-100' : 'translate-y-20 scale-0 pointer-events-none'}`}>
    <div className="bg-white rounded-[3rem] shadow-2xl w-[360px] sm:w-[420px] h-[600px] flex flex-col border border-slate-100 overflow-hidden">
      <div className="bg-slate-900 p-8 text-white flex justify-between items-center"><h4 className="font-bold">AI Planner</h4><button onClick={() => setIsAiChatOpen(false)}><X className="w-5 h-5" /></button></div>
      <div className="flex-1 overflow-y-auto p-8 space-y-5 bg-slate-50/50">
        {aiMessages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] p-4 rounded-[2rem] text-sm ${msg.role === 'user' ? 'bg-orange-600 text-white' : 'bg-white text-slate-700'}`}>{msg.text}</div></div>
        ))}
      </div>
      <div className="p-6 bg-white border-t border-slate-100 flex gap-2">
        <input className="flex-1 bg-slate-100 rounded-2xl px-5 text-sm outline-none" placeholder="Project idea..." value={userInput} onChange={e => setUserInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSendMessage()} />
        <button onClick={handleSendMessage} className="bg-slate-900 text-white p-4 rounded-2xl"><Send className="w-4 h-4" /></button>
      </div>
    </div>
  </div>
  {!isAiChatOpen && <button onClick={() => setIsAiChatOpen(true)} className="fixed bottom-10 right-10 bg-orange-500 text-white p-6 rounded-[2.5rem] shadow-2xl hover:scale-110 transition-all z-40"><MessageSquare className="w-7 h-7" /></button>}

  <footer className="bg-slate-900 text-white py-16 mt-20">
    <div className="max-w-7xl mx-auto px-4 text-center">
        <h2 className="text-2xl font-black italic mb-6">THE <span className="text-orange-500">GSI</span> GROUP</h2>
        <p className="text-slate-500 text-sm mb-10">Premium signage solutions in Florida.</p>
        <p className="text-[9px] text-slate-700 font-black tracking-[0.5em]">© 2026 THE GSI GROUP • FLORIDA • USA</p>
    </div>
  </footer>
</div>


);
}
