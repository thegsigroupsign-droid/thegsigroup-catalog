import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, ShoppingCart, ChevronRight, Filter, MessageSquare, X, Send,
  Info, Package, Star, Zap, Plus, Trash2, Settings, Image as ImageIcon,
  ExternalLink, PenTool, Layers, Printer, Truck, Maximize,
  LayoutDashboard, PlusCircle, Lock, ShieldCheck
} from 'lucide-react';

// Firebase Imports
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, doc, onSnapshot, addDoc, deleteDoc, query } from 'firebase/firestore';

// --- CONFIGURAÇÕES DA MARCA THE GSI GROUP ---
const COMPANY_NAME = "The GSI Group";
const COMPANY_TAGLINE = "Signs & Visual Communication";
const PRIMARY_COLOR = "#F36F21"; 
const WHATSAPP_NUMBER = "14074885194"; // Número oficial atualizado
const ADMIN_PASSWORD = "GSI_FLORIDA_2026"; 

// Categorias solicitadas
const CATEGORIES = [
  "All", 
  "Digital marketing", 
  "Graphic Design", 
  "Car wrap", 
  "Custom TDF awards", 
  "Illuminated Signs", 
  "Outdoor Signs", 
  "Promotional Signs", 
  "Window Graphics", 
  "Wall Graphics"
];

// --- INICIALIZAÇÃO DO FIREBASE (Regras 1, 2 e 3) ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'the-gsi-group-final-v1';

export default function App() {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [filter, setFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  
  // Estados de Admin e Segurança
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  
  // Estado do Formulário de Cadastro
  const [newProduct, setNewProduct] = useState({ 
    name: '', 
    category: 'Digital marketing', 
    price: '', 
    description: '', 
    image: '' 
  });
  
  // Estado do Chat IA
  const [aiMessages, setAiMessages] = useState([{ 
    role: 'assistant', 
    text: `Hello! Welcome to ${COMPANY_NAME}. I'm your expert project consultant. How can I help you today?` 
  }]);
  const [userInput, setUserInput] = useState("");
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  // Regra 3: Autenticação obrigatória antes de qualquer consulta
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) { 
        console.error("Erro na autenticação:", err); 
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // Regra 1: Sincronização em tempo real (Paths estritos)
  useEffect(() => {
    if (!user) return;
    // Caminho estrito conforme a Regra 1
    const productsRef = collection(db, 'artifacts', appId, 'public', 'data', 'products');
    const unsubscribe = onSnapshot(productsRef, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(docs);
    }, (error) => {
      console.error("Erro no Firestore:", error);
    });
    return () => unsubscribe();
  }, [user]);

  // Regra 2: Filtragem em memória (Javascript)
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCategory = filter === "All" || p.category === filter;
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, filter, searchTerm]);

  // Handlers de Segurança
  const handleAdminToggle = () => {
    if (isAdminMode) {
      setIsAdminMode(false);
    } else {
      setIsPasswordModalOpen(true);
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAdminMode(true);
      setIsPasswordModalOpen(false);
      setPasswordInput("");
      setPasswordError(false);
    } else {
      setPasswordError(true);
      setTimeout(() => setPasswordError(false), 2000);
    }
  };

  // Funções de Gestão (CRUD)
  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!user || !isAdminMode) return;
    try {
      const productsRef = collection(db, 'artifacts', appId, 'public', 'data', 'products');
      await addDoc(productsRef, { 
        ...newProduct, 
        price: Number(newProduct.price), 
        createdAt: new Date().toISOString()
      });
      // Limpa campos mas mantém categoria para facilitar uploads
      setNewProduct({ ...newProduct, name: '', price: '', description: '', image: '' });
    } catch (err) { 
      console.error("Erro ao salvar:", err); 
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!user || !isAdminMode) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', id));
    } catch (err) { 
      console.error("Erro ao apagar:", err); 
    }
  };

  // Integração Gemini IA
  const handleSendMessage = async () => {
    if (!userInput.trim() || isLoadingAi) return;
    const userMsg = { role: 'user', text: userInput };
    setAiMessages(prev => [...prev, userMsg]);
    setUserInput("");
    setIsLoadingAi(true);

    const apiKey = ""; 
    const systemPrompt = `You are a professional consultant for ${COMPANY_NAME} in Florida. We specialize in vehicle wraps, signs, and visual marketing. You speak English, Portuguese, and Spanish. Current categories: ${CATEGORIES.join(", ")}. Inventory items: ${products.map(p => p.name).join(", ")}`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contents: [{ parts: [{ text: userInput }] }], 
          systemInstruction: { parts: [{ text: systemPrompt }] } 
        })
      });
      const data = await response.json();
      const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "I'm here to assist with your project!";
      setAiMessages(prev => [...prev, { role: 'assistant', text: aiText }]);
    } catch (error) {
      setAiMessages(prev => [...prev, { role: 'assistant', text: "Service temporarily unavailable." }]);
    } finally { 
      setIsLoadingAi(false); 
    }
  };

  const openWhatsApp = () => {
    window.open(`https://wa.me/${WHATSAPP_NUMBER}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-orange-100">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 h-20 flex justify-between items-center px-4 sm:px-8 shadow-sm">
        <div className="flex flex-col cursor-pointer" onClick={() => setFilter("All")}>
          <h1 className="text-xl sm:text-2xl font-black italic tracking-tighter leading-none uppercase">
            THE <span style={{ color: PRIMARY_COLOR }}>GSI</span> GROUP
          </h1>
          <span className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">{COMPANY_TAGLINE}</span>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleAdminToggle} 
            className={`p-2.5 sm:p-3 rounded-2xl transition-all ${isAdminMode ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-100'}`}
            title="Dashboard Access"
          >
            <LayoutDashboard className="w-5 h-5" />
          </button>
          <button 
            onClick={openWhatsApp}
            className="bg-slate-900 text-white px-5 py-2 sm:px-6 sm:py-2.5 rounded-2xl text-[12px] sm:text-sm font-bold shadow-lg hover:bg-black transition-all"
          >
            Contact
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:py-12 text-center">
        
        {/* DASHBOARD (Only visible after password) */}
        {isAdminMode && (
          <div className="mb-16 space-y-8 animate-in slide-in-from-top-4 duration-500 text-left">
            <div className="bg-white border-2 border-orange-100 rounded-[2.5rem] p-6 sm:p-10 shadow-2xl">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3 text-orange-600">
                  <PlusCircle className="w-6 h-6" />
                  <h2 className="text-2xl font-bold uppercase italic tracking-tighter">Add New Project</h2>
                </div>
                <button onClick={() => setIsAdminMode(false)} className="text-slate-400 font-bold text-xs uppercase tracking-widest bg-slate-100 px-4 py-2 rounded-xl">Logout</button>
              </div>
              
              <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Project Name</label>
                  <input placeholder="e.g. Ford Transit Wrap" className="w-full p-4 bg-slate-50 border rounded-2xl outline-orange-500 text-sm" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} required />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Category (Tab)</label>
                  <select className="w-full p-4 bg-slate-50 border rounded-2xl outline-orange-500 appearance-none cursor-pointer text-sm" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})}>
                    {CATEGORIES.filter(c => c !== "All").map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Starting Price ($)</label>
                  <input placeholder="2500" type="number" className="w-full p-4 bg-slate-50 border rounded-2xl outline-orange-500 text-sm" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} required />
                </div>
                <div className="md:col-span-3 space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Direct Image URL (.jpg / .png)</label>
                  <input placeholder="Copy the 'Direct Link' from PostImages.org here" className="w-full p-4 bg-slate-50 border rounded-2xl outline-orange-500 text-sm" value={newProduct.image} onChange={e => setNewProduct({...newProduct, image: e.target.value})} required />
                </div>
                <div className="md:col-span-3 space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Work Description</label>
                  <textarea placeholder="Detail the materials, turnaround time, etc..." className="w-full p-4 bg-slate-50 border rounded-2xl outline-orange-500 h-24 text-sm" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} required />
                </div>
                <button type="submit" className="md:col-span-3 bg-orange-600 text-white font-black py-5 rounded-[2rem] shadow-xl uppercase active:scale-95 transition-all text-sm tracking-widest">
                  Publish to Catalog
                </button>
              </form>
            </div>

            <div className="bg-slate-900 rounded-[2.5rem] p-6 sm:p-10 text-white shadow-2xl overflow-hidden">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-orange-500 italic uppercase tracking-tighter"><Layers className="w-5 h-5"/> Live Inventory ({products.length} works)</h3>
              <div className="max-h-[300px] overflow-y-auto no-scrollbar">
                <table className="w-full text-left">
                  <tbody className="divide-y divide-white/5">
                    {products.map(p => (
                      <tr key={p.id} className="group hover:bg-white/5">
                        <td className="py-4 px-2 font-bold text-sm">{p.name}</td>
                        <td className="py-4 px-2 text-[10px] text-slate-400 uppercase tracking-widest">{p.category}</td>
                        <td className="py-4 px-2 text-right">
                          <button onClick={() => handleDeleteProduct(p.id)} className="text-slate-600 hover:text-red-500 p-2.5 transition-colors bg-white/5 rounded-xl">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* HERO SECTION */}
        {!isAdminMode && (
          <div className="mb-10 bg-[#F36F21] rounded-[2.5rem] sm:rounded-[3.5rem] p-8 sm:p-14 text-white relative overflow-hidden flex flex-col md:flex-row items-center justify-between shadow-2xl shadow-orange-200/50 border border-white/10">
            <div className="relative z-10 max-w-xl text-left">
              <h2 className="text-4xl sm:text-6xl font-black mb-4 leading-none uppercase tracking-tighter text-white">
                Stand Out <br/><span className="text-neutral-900 underline decoration-4 underline-offset-8">in Florida.</span>
              </h2>
              <p className="text-orange-50 mb-8 text-base sm:text-lg font-medium opacity-90 leading-relaxed max-w-md">The highest quality signage, vehicle branding, and visual marketing for your business.</p>
              <button onClick={() => setIsAiChatOpen(true)} className="bg-neutral-900 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 hover:bg-black transition-all shadow-xl uppercase text-xs tracking-widest">
                <MessageSquare className="w-5 h-5" /> Talk to AI Assistant
              </button>
            </div>
            <PenTool className="w-64 h-64 sm:w-96 sm:h-96 text-white/10 absolute -right-10 -bottom-10 rotate-12" />
          </div>
        )}

        {/* CATEGORY TABS (Responsive & Multi-line) */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-2 sm:px-5 sm:py-2.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all shadow-sm border ${
                filter === cat 
                  ? "bg-slate-900 text-white border-slate-900 shadow-xl" 
                  : "bg-white text-slate-500 border-slate-200 hover:border-orange-500 hover:text-orange-600"
              } max-w-[130px] sm:max-w-none text-center leading-tight whitespace-normal h-full flex items-center justify-center`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* PROJECTS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-10">
          {filteredProducts.length === 0 && !isAdminMode && (
            <div className="col-span-full py-20 text-center space-y-4">
              <ImageIcon className="w-24 h-24 rounded-full flex items-center justify-center mx-auto text-slate-200" />
              <p className="font-bold text-slate-400 uppercase tracking-widest italic text-xs">Awaiting the loading of your portfolio...</p>
            </div>
          )}

          {filteredProducts.map(product => (
            <div key={product.id} className="group bg-white rounded-[2.5rem] sm:rounded-[3rem] border border-slate-100 p-4 hover:shadow-2xl transition-all duration-500 relative flex flex-col">
              <div className="aspect-square rounded-[2rem] sm:rounded-[2.2rem] overflow-hidden bg-slate-50 mb-6 relative shadow-inner">
                <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                <div className="absolute top-4 left-4 bg-orange-600 text-white text-[8px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest shadow-lg">
                    Florida Service
                </div>
              </div>

              <div className="flex-1 px-2 flex flex-col text-left">
                <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest mb-1">{product.category}</span>
                <h3 className="font-bold text-slate-900 text-lg mb-3 group-hover:text-orange-600 transition-colors leading-tight line-clamp-2">{product.name}</h3>
                
                <div className="flex justify-between items-center mt-auto pt-5 border-t border-slate-50">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Starting at</span>
                    <span className="text-xl font-black text-slate-900 leading-tight">${Number(product.price).toLocaleString()}</span>
                  </div>
                  <button onClick={() => setSelectedProduct(product)} className="bg-slate-900 text-white p-3.5 rounded-2xl hover:bg-orange-600 transition-all active:scale-90 shadow-lg">
                    <Maximize className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* MODAL DE SEGURANÇA (Password) */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/95 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl text-center space-y-6">
            <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Lock className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-black italic tracking-tighter uppercase leading-none">Admin Access</h2>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">Enter GSI Credentials</p>
            </div>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <input 
                type="password" 
                placeholder="PASSWORD" 
                className={`w-full p-5 bg-slate-50 border-2 rounded-2xl text-center text-xl font-bold focus:ring-4 focus:ring-orange-200 outline-none transition-all ${passwordError ? 'border-red-500 bg-red-50 animate-shake' : 'border-slate-100'}`}
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setIsPasswordModalOpen(false)} className="flex-1 p-4 bg-slate-100 rounded-2xl font-bold text-xs uppercase tracking-widest text-slate-900">Exit</button>
                <button type="submit" className="flex-[2] p-4 bg-orange-600 text-white rounded-2xl font-black shadow-lg shadow-orange-100 hover:bg-orange-700 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-white">
                  <ShieldCheck className="w-5 h-5" /> Unlock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALHES DO TRABALHO */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-white rounded-[3rem] sm:rounded-[4rem] max-w-5xl w-full flex flex-col md:flex-row overflow-hidden shadow-2xl my-auto animate-in zoom-in duration-300">
            <div className="md:w-1/2 h-[350px] md:h-auto relative bg-slate-100 shadow-inner">
              <img src={selectedProduct.image} className="w-full h-full object-cover" alt={selectedProduct.name} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
            </div>
            <div className="md:w-1/2 p-8 sm:p-14 flex flex-col justify-center text-left relative">
              <button onClick={() => setSelectedProduct(null)} className="absolute top-6 right-6 sm:top-10 sm:right-10 text-slate-300 hover:text-slate-900 transition-colors"><X className="w-8 h-8" /></button>
              <div>
                <span className="text-orange-600 font-black text-[10px] uppercase tracking-[0.4em] bg-orange-50 px-4 py-2 rounded-xl">{selectedProduct.category}</span>
                <h2 className="text-4xl sm:text-5xl font-black text-slate-900 mt-6 mb-8 leading-tight tracking-tighter">{selectedProduct.name}</h2>
                <div className="bg-slate-50 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] mb-10 border border-slate-100 shadow-inner">
                  <p className="text-slate-600 leading-relaxed text-sm sm:text-base">{selectedProduct.description}</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-8 pt-8 border-t border-slate-100 mt-auto">
                  <div className="text-center sm:text-left">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-1">Estimate</span>
                    <span className="text-3xl sm:text-4xl font-black text-slate-900">${Number(selectedProduct.price).toLocaleString()}</span>
                  </div>
                  <button 
                    onClick={() => {
                      const msg = encodeURIComponent(`Hello GSI! I'm interested in an estimate for "${selectedProduct.name}" from your gallery.`);
                      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank');
                    }} 
                    className="w-full sm:w-auto bg-orange-600 text-white px-10 py-5 rounded-[1.8rem] sm:rounded-[2.2rem] font-black shadow-xl hover:bg-orange-700 transition-all flex items-center justify-center gap-3 active:scale-95 uppercase text-xs tracking-widest"
                  >
                    Request Quote <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ASISTENTE IA WIDGET */}
      <div className={`fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-50 transition-all transform ${isAiChatOpen ? 'scale-100 translate-y-0' : 'scale-0 translate-y-20 pointer-events-none'}`}>
        <div className="bg-white rounded-[2.5rem] sm:rounded-[3rem] shadow-2xl w-[320px] sm:w-[400px] h-[550px] sm:h-[650px] flex flex-col border border-slate-100 overflow-hidden text-slate-900">
          <div className="bg-slate-900 p-6 sm:p-8 text-white flex justify-between items-center relative overflow-hidden">
            <div className="relative z-10 flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20"><MessageSquare className="w-7 h-7 text-white" /></div>
              <div className="text-left">
                <h4 className="font-bold text-sm tracking-wide text-white">AI Assistant</h4>
                <p className="text-[9px] text-orange-400 font-bold uppercase tracking-widest">Florida Team</p>
              </div>
            </div>
            <button onClick={() => setIsAiChatOpen(false)} className="relative z-10 bg-white/10 p-2.5 rounded-xl hover:bg-white/20 transition-colors"><X className="w-5 h-5" /></button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 bg-slate-50/50 no-scrollbar">
            {aiMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 sm:p-5 rounded-[1.8rem] sm:rounded-[2.2rem] text-xs sm:text-sm leading-relaxed shadow-sm text-left ${
                  msg.role === 'user' ? 'bg-orange-600 text-white rounded-tr-none' : 'bg-white text-slate-700 rounded-tl-none border border-slate-100 text-slate-700'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoadingAi && <div className="text-[9px] font-black text-orange-500 uppercase tracking-widest animate-pulse">Thinking...</div>}
          </div>
          
          <div className="p-5 sm:p-6 bg-white border-t border-slate-100 flex gap-3">
            <input 
              className="flex-1 bg-slate-100 rounded-2xl px-5 py-3 sm:py-4 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-orange-500 text-slate-900" 
              placeholder="Ask anything..." 
              value={userInput} 
              onChange={e => setUserInput(e.target.value)} 
              onKeyPress={e => e.key === 'Enter' && handleSendMessage()} 
            />
            <button onClick={handleSendMessage} className="bg-slate-900 text-white p-3.5 sm:p-4 rounded-2xl shadow-xl hover:bg-orange-600 transition-all active:scale-90">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {!isAiChatOpen && (
        <button onClick={() => setIsAiChatOpen(true)} className="fixed bottom-6 right-6 sm:bottom-10 sm:right-10 bg-orange-500 text-white p-5 sm:p-6 rounded-[2.2rem] sm:rounded-[2.5rem] shadow-2xl hover:scale-110 active:scale-95 transition-all z-40 group shadow-orange-500/40">
          <MessageSquare className="w-7 h-7 sm:w-8 sm:h-8" />
        </button>
      )}

      {/* FOOTER */}
      <footer className="bg-slate-900 text-white py-16 mt-16 text-center border-t border-white/5 px-4">
        <h2 className="text-xl sm:text-2xl font-black italic uppercase tracking-tighter leading-none mb-4">
          THE <span className="text-orange-500">GSI</span> GROUP
        </h2>
        <div className="flex flex-col sm:flex-row justify-center gap-4 text-slate-500 text-[10px] uppercase tracking-widest font-bold mb-6">
          <span>South Florida</span>
          <span className="hidden sm:inline">•</span>
          <span>(407) 488-5194</span>
        </div>
        <p className="text-slate-600 text-[8px] sm:text-[10px] uppercase tracking-[0.4em]">© 2026 THE GSI GROUP • FLORIDA • USA</p>
      </footer>
    </div>
  );
}
