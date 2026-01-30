import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  ShoppingCart, 
  ChevronRight, 
  Filter, 
  MessageSquare, 
  X, 
  Send,
  Info,
  Package,
  Star,
  Zap,
  Plus,
  Trash2,
  Settings,
  Image as ImageIcon,
  ExternalLink,
  PenTool,
  Layers,
  Printer,
  Truck,
  Maximize
} from 'lucide-react';

// Firebase Imports
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, addDoc, deleteDoc, query } from 'firebase/firestore';

// --- THE GSI GROUP BRANDING (FLORIDA) ---
const COMPANY_NAME = "The GSI Group";
const COMPANY_TAGLINE = "Signs & Visual Communication";
const PRIMARY_COLOR = "#F36F21"; // Laranja exato do seu logo
const SECONDARY_COLOR = "#959595"; // Cinza do seu logo
const WHATSAPP_NUMBER = "17860000000"; // ATUALIZE COM O SEU NÚMERO DA FLÓRIDA

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

const INITIAL_SERVICES = [
  { id: '1', name: "Full Vehicle Wrap", category: "Car Wrap", price: 3500, rating: 5.0, description: "Professional 3M/Avery vinyl wrapping for fleets and personal vehicles in Florida. UV protected and long lasting.", image: "https://images.unsplash.com/photo-1600367168103-d3d0c5ca1024?auto=format&fit=crop&q=80&w=600" },
  { id: '2', name: "Illuminated Channel Letters", category: "Illuminated Signs", price: 2800, rating: 4.9, description: "High-visibility LED signs for storefronts. Weather-resistant and energy efficient. UL Certified.", image: "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&q=80&w=600" },
  { id: '3', name: "Custom Wall Graphics", category: "Wall Graphics", price: 1200, rating: 5.0, description: "Transform your office space with custom-printed high-tack wall murals. Precision installation included.", image: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=600" },
];

const CATEGORIES = ["All", "Car Wrap", "Illuminated Signs", "Window Graphics", "Wall Graphics", "Laser/CNC", "Outdoor Signs", "Graphic Design"];

export default function App() {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [filter, setFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  
  const [newProduct, setNewProduct] = useState({ name: '', category: 'Car Wrap', price: '', description: '', image: '', rating: 5 });
  const [aiMessages, setAiMessages] = useState([{ role: 'assistant', text: `Hi! Welcome to ${COMPANY_NAME}. How can I assist you with your signage project today? We speak English, Portuguese, and Spanish.` }]);
  const [userInput, setUserInput] = useState("");
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) { console.error("Auth error:", err); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const productsRef = collection(db, 'artifacts', appId, 'public', 'data', 'products');
    const unsubscribe = onSnapshot(productsRef, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(docs.length > 0 ? docs : INITIAL_SERVICES);
    }, (error) => console.error("Firestore error:", error));
    return () => unsubscribe();
  }, [user]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCategory = filter === "All" || p.category === filter;
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, filter, searchTerm]);

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!user) return;
    try {
      const productsRef = collection(db, 'artifacts', appId, 'public', 'data', 'products');
      await addDoc(productsRef, { ...newProduct, price: Number(newProduct.price) });
      setNewProduct({ name: '', category: 'Car Wrap', price: '', description: '', image: '', rating: 5 });
    } catch (err) { console.error("Error adding product:", err); }
  };

  const handleDeleteProduct = async (id) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', id));
    } catch (err) { console.error("Error deleting product:", err); }
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || isLoadingAi) return;
    const userMsg = { role: 'user', text: userInput };
    setAiMessages(prev => [...prev, userMsg]);
    setUserInput("");
    setIsLoadingAi(true);

    const apiKey = ""; 
    const systemPrompt = `You are an expert for ${COMPANY_NAME} in Florida. We specialize in signs, car wraps, and graphic design. Services: ${JSON.stringify(products)}. You speak English, Portuguese, and Spanish. Answer accordingly. Be professional and technical.`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: userInput }] }], systemInstruction: { parts: [{ text: systemPrompt }] } })
      });
      const data = await response.json();
      const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "I'm here to help with your project!";
      setAiMessages(prev => [...prev, { role: 'assistant', text: aiText }]);
    } catch (error) {
      setAiMessages(prev => [...prev, { role: 'assistant', text: "Connection error." }]);
    } finally { setIsLoadingAi(false); }
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans selection:bg-orange-100 selection:text-orange-900">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex flex-col">
              <h1 className="text-2xl font-black italic tracking-tighter leading-none">
                THE <span style={{ color: PRIMARY_COLOR }}>GSI</span> GROUP
              </h1>
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">{COMPANY_TAGLINE}</span>
            </div>
            
            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
                <input 
                  type="text"
                  placeholder="What can we build for you?"
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-100 border-none rounded-2xl text-sm focus:ring-2 focus:ring-orange-500 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button onClick={() => setIsAdminMode(!isAdminMode)} className={`p-2 rounded-xl transition-all ${isAdminMode ? 'bg-orange-500 text-white' : 'text-neutral-400 hover:bg-neutral-100'}`}>
                <Settings className="w-5 h-5" />
              </button>
              <button className="bg-neutral-900 text-white px-6 py-2.5 rounded-2xl text-sm font-bold hover:bg-black transition-all shadow-lg">
                Contact Us
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-10">
        
        {/* Admin Section */}
        {isAdminMode && (
          <section className="mb-12 bg-white border-2 border-dashed border-orange-200 rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-top duration-500">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Plus className="text-orange-500" /> Catalog Management
            </h2>
            <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <input placeholder="Service Title" className="p-4 bg-neutral-50 border border-neutral-100 rounded-2xl outline-orange-500" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} required />
              <select className="p-4 bg-neutral-50 border border-neutral-100 rounded-2xl outline-orange-500" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})}>
                {CATEGORIES.filter(c => c !== "All").map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input placeholder="Base Price ($)" type="number" className="p-4 bg-neutral-50 border border-neutral-100 rounded-2xl outline-orange-500" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} required />
              <input placeholder="Image Link" className="md:col-span-3 p-4 bg-neutral-50 border border-neutral-100 rounded-2xl outline-orange-500" value={newProduct.image} onChange={e => setNewProduct({...newProduct, image: e.target.value})} required />
              <textarea placeholder="Service details & specs..." className="md:col-span-3 p-4 bg-neutral-50 border border-neutral-100 rounded-2xl outline-orange-500 h-28" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} required />
              <button type="submit" className="md:col-span-3 bg-orange-600 text-white font-bold py-4 rounded-2xl hover:bg-orange-700 transition-all shadow-xl shadow-orange-100">
                Add to Live Catalog
              </button>
            </form>
          </section>
        )}

        {/* Categories */}
        <div className="flex gap-3 overflow-x-auto pb-8 no-scrollbar scroll-smooth">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                filter === cat 
                  ? "bg-neutral-900 text-white shadow-xl" 
                  : "bg-white text-neutral-500 border border-neutral-200 hover:border-orange-500 hover:text-orange-600"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredProducts.map(product => (
            <div key={product.id} className="group bg-white rounded-[3rem] border border-neutral-100 p-4 hover:shadow-2xl transition-all duration-500 relative flex flex-col">
              {isAdminMode && (
                <button 
                  onClick={() => handleDeleteProduct(product.id)} 
                  className="absolute top-6 right-6 z-10 bg-white/90 backdrop-blur shadow-lg text-red-500 p-2.5 rounded-full hover:bg-red-500 hover:text-white transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              
              <div className="aspect-square rounded-[2rem] overflow-hidden bg-neutral-100 mb-6 relative">
                <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                <div className="absolute top-4 left-4 bg-orange-600 text-white text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest shadow-md">
                    Top Tier Signage
                </div>
              </div>

              <div className="flex-1 px-2">
                <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">{product.category}</span>
                <h3 className="font-bold text-neutral-900 text-xl mt-1 mb-3 group-hover:text-orange-600 transition-colors leading-tight">{product.name}</h3>
                <p className="text-sm text-neutral-500 line-clamp-2 mb-6 leading-relaxed">{product.description}</p>
                
                <div className="flex justify-between items-center mt-auto pt-6 border-t border-neutral-50">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">Starts at</span>
                    <span className="text-2xl font-black text-neutral-900">${Number(product.price).toLocaleString('en-US')}</span>
                  </div>
                  <button onClick={() => setSelectedProduct(product)} className="bg-neutral-900 text-white p-4 rounded-3xl hover:bg-orange-600 transition-all active:scale-90 shadow-lg">
                    <Maximize className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* AI Assistant */}
      <div className={`fixed bottom-8 right-8 z-50 transition-all duration-500 transform ${isAiChatOpen ? 'translate-y-0 scale-100' : 'translate-y-20 scale-0 pointer-events-none'}`}>
        <div className="bg-white rounded-[3rem] shadow-2xl w-[360px] sm:w-[420px] h-[620px] flex flex-col border border-neutral-100 overflow-hidden">
          <div className="bg-neutral-900 p-8 text-white flex justify-between items-center">
            <div className="relative z-10 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-sm tracking-wide">AI Project Consultant</h4>
                <p className="text-[10px] text-orange-400 font-bold uppercase tracking-[0.2em]">The GSI Group</p>
              </div>
            </div>
            <button onClick={() => setIsAiChatOpen(false)}><X className="w-4 h-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-8 space-y-5 bg-neutral-50/50">
            {aiMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-5 rounded-[2rem] text-sm leading-relaxed shadow-sm ${
                  msg.role === 'user' ? 'bg-orange-600 text-white rounded-tr-none' : 'bg-white text-neutral-700 rounded-tl-none border border-neutral-100'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
          <div className="p-6 bg-white border-t border-neutral-100">
            <div className="flex gap-3">
              <input className="flex-1 bg-neutral-100 border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-orange-500" placeholder="Ask about materials..." value={userInput} onChange={e => setUserInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSendMessage()} />
              <button onClick={handleSendMessage} className="bg-neutral-900 text-white p-4 rounded-2xl shadow-xl hover:bg-orange-600 transition-all"><Send className="w-5 h-5" /></button>
            </div>
          </div>
        </div>
      </div>

      {!isAiChatOpen && (
        <button onClick={() => setIsAiChatOpen(true)} className="fixed bottom-10 right-10 bg-orange-500 text-white p-6 rounded-[2.5rem] shadow-2xl hover:scale-110 active:scale-95 transition-all z-40 group">
          <MessageSquare className="w-7 h-7" />
        </button>
      )}

      {/* Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-neutral-900/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-white rounded-[4rem] max-w-5xl w-full flex flex-col md:flex-row overflow-hidden shadow-2xl my-auto animate-in zoom-in duration-300">
            <div className="md:w-[45%] h-[400px] md:h-auto relative">
              <img src={selectedProduct.image} className="w-full h-full object-cover" alt={selectedProduct.name} />
            </div>
            <div className="md:w-[55%] p-10 md:p-16 flex flex-col justify-center">
              <button onClick={() => setSelectedProduct(null)} className="self-end text-neutral-300 hover:text-neutral-900 mb-4 transition-colors"><X className="w-8 h-8" /></button>
              <div>
                <span className="text-orange-600 font-black text-xs uppercase tracking-[0.4em] bg-orange-50 px-3 py-1.5 rounded-lg">{selectedProduct.category}</span>
                <h2 className="text-5xl font-black text-neutral-900 mt-6 mb-10 leading-tight">{selectedProduct.name}</h2>
                
                <div className="flex flex-wrap gap-6 mb-12">
                    <div className="flex items-center gap-3"><div className="p-3 bg-neutral-50 rounded-2xl"><Printer className="w-5 h-5 text-orange-500"/></div> <span className="text-sm font-bold">Premium Print</span></div>
                    <div className="flex items-center gap-3"><div className="p-3 bg-neutral-50 rounded-2xl"><Truck className="w-5 h-5 text-orange-500"/></div> <span className="text-sm font-bold">Local Installation</span></div>
                </div>

                <div className="bg-neutral-50 p-8 rounded-[3rem] mb-12 border border-neutral-100">
                  <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-4">Project Scope</h4>
                  <p className="text-neutral-600 leading-relaxed text-lg">{selectedProduct.description}</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-10 pt-10 border-t border-neutral-100 mt-auto">
                  <div className="text-center sm:text-left">
                    <span className="text-xs text-neutral-400 font-black uppercase tracking-widest block mb-1">Starting Estimate</span>
                    <span className="text-4xl font-black text-neutral-900">${Number(selectedProduct.price).toLocaleString('en-US')}</span>
                  </div>
                  <button onClick={() => {
                    const msg = encodeURIComponent(`Hi! I'm interested in ${selectedProduct.name} from your catalog.`);
                    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank');
                  }} className="w-full sm:w-auto bg-orange-600 text-white px-14 py-6 rounded-[2.5rem] font-black hover:bg-orange-700 shadow-xl shadow-orange-100 transition-all flex items-center justify-center gap-4 active:scale-95">
                    Request Quote
                    <ExternalLink className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-neutral-900 text-white py-24 mt-20">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-16 text-center md:text-left">
          <div className="col-span-1 md:col-span-2">
            <h2 className="text-3xl font-black italic mb-6">THE <span className="text-orange-500">GSI</span> GROUP</h2>
            <p className="text-neutral-500 text-sm max-w-sm leading-relaxed mx-auto md:ml-0 font-medium">
              Your partner for high-impact visual communication in Florida. Precision signs, wraps, and graphics.
            </p>
          </div>
          <div>
            <h5 className="font-black text-[10px] uppercase tracking-[0.4em] mb-10 text-orange-500">Multilingual Team</h5>
            <p className="text-sm text-neutral-400 font-bold uppercase tracking-widest">English • Portuguese • Spanish</p>
          </div>
          <div>
            <h5 className="font-black text-[10px] uppercase tracking-[0.4em] mb-10 text-orange-500">Location</h5>
            <p className="text-sm text-neutral-400 leading-relaxed font-medium">Serving Florida businesses with expert mobile installation.</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 pt-20 mt-20 border-t border-white/5 text-center">
          <p className="text-[9px] text-neutral-700 font-black uppercase tracking-[0.5em]">
            © 2026 THE GSI GROUP • FLORIDA • USA
          </p>
        </div>
      </footer>
    </div>
  );
}
