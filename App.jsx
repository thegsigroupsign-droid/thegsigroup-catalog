import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, ShoppingCart, ChevronRight, Filter, MessageSquare, X, Send,
  Info, Package, Star, Zap, Plus, Trash2, Settings, Image as ImageIcon,
  ExternalLink, PenTool, Layers, Printer, Truck, Maximize,
  LayoutDashboard, PlusCircle, Lock, ShieldCheck, AlertCircle, CheckCircle2,
  ArrowUpDown, Share2, BarChart3, TrendingUp, ChevronDown, MapPin, Mail, Phone, Globe,
  Command, Award
} from 'lucide-react';

// Importações do Firebase
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, doc, onSnapshot, addDoc, deleteDoc, setDoc, getDoc } from 'firebase/firestore';

// --- ✅ CONFIGURAÇÃO VERCEL ---
const VERCEL_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCxRhZLz3H4zeEEvNkxh4U_ZjeTEGg6PPE",
  authDomain: "the-gsi-catalog.firebaseapp.com",
  projectId: "the-gsi-catalog",
  storageBucket: "the-gsi-catalog.firebasestorage.app",
  messagingSenderId: "434905220729",
  appId: "1:434905220729:web:69f23b774cf711a5df6aa8",
  measurementId: "G-FHDQQKEE7E"
};

// --- CONFIGURAÇÕES PADRÃO ---
const DEFAULT_SETTINGS = {
  companyName: "The GSI Group",
  tagline: "Signs & Visual Communication",
  primaryColor: "#F36F21",
  whatsapp: "14074885194",
  email: "designer@thegsigroup.com",
  address: "3344 S. Orange Blossom TRL, Kissimmee, FL 34746",
  logoUrl: "",
  copyright: "The GSI Group LLC",
  badgeText: "FLORIDA ELITE" // Novo campo para o selo nas imagens
};

const ADMIN_PASSWORD = "GSI_FLORIDA_2026"; 

const CATEGORIES = [
  "All", "Digital marketing", "Graphic Design", "Car wrap", 
  "Custom TDF awards", "Illuminated Signs", "Outdoor Signs", 
  "Promotional Signs", "Window Graphics", "Wall Graphics"
];

// --- INICIALIZAÇÃO SEGURA ---
let db = null;
let auth = null;
let appId = 'the-gsi-group-final';

try {
  const config = VERCEL_FIREBASE_CONFIG.apiKey ? VERCEL_FIREBASE_CONFIG : (typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null);
  if (config) {
    const app = getApps().length === 0 ? initializeApp(config) : getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
  }
} catch (e) { console.error("Firebase connection error."); }

export default function App() {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [siteSettings, setSiteSettings] = useState(DEFAULT_SETTINGS);
  const [filter, setFilter] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  
  // Ref para a caixa de pesquisa
  const searchInputRef = useRef(null);

  // Estados de Edição
  const [editSettings, setEditSettings] = useState(DEFAULT_SETTINGS);
  const [newProduct, setNewProduct] = useState({ name: '', category: 'Digital marketing', price: '', description: '', image: '' });
  
  // AI Chat State
  const [aiMessages, setAiMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [isMobileCategoryMenuOpen, setIsMobileCategoryMenuOpen] = useState(false);

  // Efeito para o atalho de teclado da pesquisa ( / ou Cmd+K )
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else { await signInAnonymously(auth); }
      } catch (err) { console.log("Login..."); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // Sync Settings and Products
  useEffect(() => {
    if (!db || !user) return;
    
    // Sync Products
    const productsRef = collection(db, 'artifacts', appId, 'public', 'data', 'products');
    const unsubProducts = onSnapshot(productsRef, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Sync Settings
    const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'global');
    const unsubSettings = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSiteSettings(data);
        setEditSettings(data);
      }
    });

    return () => { unsubProducts(); unsubSettings(); };
  }, [user]);

  // Chat Initial Sequence
  useEffect(() => {
    if (isAiChatOpen && aiMessages.length === 0) {
      setAiMessages([{
        role: 'assistant',
        text: `Welcome to ${siteSettings.companyName}! 🇺🇸\nHow can we help you grow your brand today?`,
        isInitial: true
      }]);
    }
  }, [isAiChatOpen, siteSettings.companyName]);

  const filteredProducts = useMemo(() => {
    let result = products.filter(p => {
      const matchesCategory = filter === "All" || (p.category || "").toLowerCase() === filter.toLowerCase();
      const matchesSearch = (p.name || "").toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });

    return result.sort((a, b) => {
      if (sortBy === "price-low") return a.price - b.price;
      if (sortBy === "price-high") return b.price - a.price;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
  }, [products, filter, searchTerm, sortBy]);

  const stats = useMemo(() => ({
    total: products.length,
    avgPrice: products.length ? Math.round(products.reduce((acc, p) => acc + Number(p.price), 0) / products.length) : 0,
  }), [products]);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAdminMode(true); setIsPasswordModalOpen(false); setPasswordInput(""); setPasswordError(false);
    } else { setPasswordError(true); setTimeout(() => setPasswordError(false), 2000); }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!db || isSaving) return;
    setIsSaving(true);
    try {
      const productsRef = collection(db, 'artifacts', appId, 'public', 'data', 'products');
      await addDoc(productsRef, { ...newProduct, price: Number(newProduct.price), createdAt: new Date().toISOString() });
      setStatusMsg({ type: 'success', text: 'Work added to catalog!' });
      setNewProduct({ ...newProduct, name: '', category: 'Digital marketing', price: '', description: '', image: '' });
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);
    } catch (err) { setStatusMsg({ type: 'error', text: 'Save failed.' }); } 
    finally { setIsSaving(false); }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!db || isSaving) return;
    setIsSaving(true);
    try {
      const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'global');
      await setDoc(settingsRef, editSettings);
      setStatusMsg({ type: 'success', text: 'Site settings updated!' });
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);
    } catch (err) { setStatusMsg({ type: 'error', text: 'Update failed.' }); }
    finally { setIsSaving(false); }
  };

  const handleDeleteProduct = async (id) => {
    if (!db || !isAdminMode) return;
    if (confirm("Delete this work from catalog?")) {
      try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', id)); } catch (e) { }
    }
  };

  // Robot Chat Interactivity
  const handleChatOption = async (option) => {
    const userMsg = { role: 'user', text: option };
    setAiMessages(prev => [...prev, userMsg]);
    
    let botResponse = "";
    
    switch(option) {
      case "Get a Quote":
        botResponse = `Great! Please send us details about your project on WhatsApp. I'm redirecting you...`;
        setTimeout(() => window.open(`https://wa.me/${siteSettings.whatsapp}?text=Hi! I would like a quote for a new project.`, '_blank'), 1500);
        break;
      case "Track My Order":
        botResponse = `To track your current order, please provide your Order ID to our team on WhatsApp or via email: ${siteSettings.email}`;
        break;
      case "I'm already a customer":
        botResponse = `Welcome back! Our support team is ready to help you on WhatsApp.`;
        setTimeout(() => window.open(`https://wa.me/${siteSettings.whatsapp}?text=Hi! I am an existing customer and need assistance.`, '_blank'), 1500);
        break;
      case "Our Address":
        botResponse = `We are located at:\n📍 ${siteSettings.address}\n\nWould you like to open Google Maps?`;
        break;
      case "Talk to an Agent":
        botResponse = `Connecting you to a human agent...`;
        setTimeout(() => window.open(`https://wa.me/${siteSettings.whatsapp}`, '_blank'), 1000);
        break;
      default:
        botResponse = "How can I help you with our services?";
    }

    setAiMessages(prev => [...prev, { role: 'assistant', text: botResponse }]);
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || isLoadingAi) return;
    const userMsg = { role: 'user', text: userInput };
    setAiMessages(prev => [...prev, userMsg]);
    setUserInput("");
    setIsLoadingAi(true);
    const apiKey = ""; 
    const systemPrompt = `Expert project consultant for ${siteSettings.companyName} in Florida. Address: ${siteSettings.address}. Email: ${siteSettings.email}. WhatsApp: ${siteSettings.whatsapp}. Speak English, Portuguese, and Spanish.`;
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: userInput }] }], systemInstruction: { parts: [{ text: systemPrompt }] } })
      });
      const data = await response.json();
      setAiMessages(prev => [...prev, { role: 'assistant', text: data?.candidates?.[0]?.content?.parts?.[0]?.text || "I'm here to help!" }]);
    } catch (e) { setAiMessages(prev => [...prev, { role: 'assistant', text: "Chat busy. Please call us." }]); } 
    finally { setIsLoadingAi(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-orange-100 overflow-x-hidden">
      {/* HEADER REFINADO */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 h-20 flex justify-between items-center px-4 sm:px-8 shadow-sm transition-all text-left">
        <div className="flex flex-col cursor-pointer hover:opacity-80 transition-opacity shrink-0" onClick={() => setFilter("All")}>
          {siteSettings.logoUrl ? (
            <img src={siteSettings.logoUrl} alt={siteSettings.companyName} className="h-10 sm:h-12 w-auto object-contain" />
          ) : (
            <>
              <h1 className="text-lg sm:text-2xl font-black italic tracking-tighter leading-none uppercase">THE <span style={{ color: siteSettings.primaryColor }}>GSI</span> GROUP</h1>
              <span className="text-[7px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">{siteSettings.tagline}</span>
            </>
          )}
        </div>

        {/* BARRA DE PESQUISA CENTRAL COM ATALHO */}
        <div className="hidden md:flex flex-1 max-w-md mx-8 relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-orange-500 transition-colors">
            <Search className="w-4 h-4" />
          </div>
          <input 
            ref={searchInputRef}
            type="text" 
            placeholder="Search projects... (Press '/')" 
            className="w-full bg-slate-100/50 border border-slate-200 py-2.5 pl-11 pr-12 rounded-2xl text-sm outline-none focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
            <kbd className="hidden lg:inline-flex h-6 items-center gap-1 rounded border border-slate-200 bg-white px-1.5 font-sans text-[10px] font-black text-slate-400">
              <span className="text-xs">/</span>
            </kbd>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <button onClick={() => isAdminMode ? setIsAdminMode(false) : setIsPasswordModalOpen(true)} className={`p-2.5 rounded-2xl transition-all ${isAdminMode ? 'bg-orange-500 text-white shadow-lg ring-4 ring-orange-100' : 'text-slate-400 hover:bg-slate-100'}`}>
            <LayoutDashboard className="w-5 h-5" />
          </button>
          <button onClick={() => window.open(`https://wa.me/${siteSettings.whatsapp}`, '_blank')} className="bg-slate-900 text-white px-3 sm:px-6 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-[10px] sm:text-sm font-bold shadow-xl hover:bg-black hover:scale-105 active:scale-95 transition-all uppercase tracking-widest">
            Contact
          </button>
        </div>
      </header>

      {/* MOBILE SEARCH BAR */}
      <div className="md:hidden px-4 pt-4">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search works..." 
            className="w-full bg-white border border-slate-200 py-3 pl-11 pr-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
        {/* DASHBOARD ADMINISTRATIVO COMPLETO */}
        {isAdminMode && (
          <div className="mb-12 space-y-6 animate-in slide-in-from-top-6 duration-700 text-left">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="bg-orange-50 p-3 rounded-2xl text-orange-600"><BarChart3 className="w-6 h-6"/></div>
                <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Items</p><p className="text-2xl font-black">{stats.total}</p></div>
              </div>
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="bg-green-50 p-3 rounded-2xl text-green-600"><TrendingUp className="w-6 h-6"/></div>
                <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg. Price</p><p className="text-2xl font-black">${stats.avgPrice}</p></div>
              </div>
            </div>

            {/* Configurações Globais do Site */}
            <div className="bg-slate-900 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 text-white shadow-2xl relative">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-3 text-orange-500 uppercase italic tracking-tighter"><Settings className="w-5 h-5" /> Global Site Settings</h2>
              <form onSubmit={handleSaveSettings} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-slate-500 uppercase ml-2 text-left">Logo Direct Link (.png/jpg)</p>
                  <input className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white outline-none focus:border-orange-500" value={editSettings.logoUrl || ""} onChange={e => setEditSettings({...editSettings, logoUrl: e.target.value})} placeholder="Paste logo URL here" />
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-slate-500 uppercase ml-2 text-left">Badge Text (Quality Stamp on Photos)</p>
                  <input className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white outline-none focus:border-orange-500 uppercase" value={editSettings.badgeText || ""} onChange={e => setEditSettings({...editSettings, badgeText: e.target.value})} placeholder="e.g. FLORIDA ELITE" />
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-slate-500 uppercase ml-2 text-left">Business Address</p>
                  <input className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white outline-none" value={editSettings.address} onChange={e => setEditSettings({...editSettings, address: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-slate-500 uppercase ml-2 text-left">Business Email</p>
                  <input className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white outline-none" value={editSettings.email} onChange={e => setEditSettings({...editSettings, email: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-slate-500 uppercase ml-2 text-left">Business Phone (WhatsApp)</p>
                  <input className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white outline-none" value={editSettings.whatsapp} onChange={e => setEditSettings({...editSettings, whatsapp: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-slate-500 uppercase ml-2 text-left">Copyright Owner</p>
                  <input className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white outline-none" value={editSettings.copyright} onChange={e => setEditSettings({...editSettings, copyright: e.target.value})} />
                </div>
                <button type="submit" className="md:col-span-2 bg-orange-600 p-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-orange-500 transition-all">Save All Settings</button>
              </form>
            </div>

            {/* Adicionar Trabalho */}
            <div className="bg-white border-2 border-orange-100 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 shadow-2xl relative">
              <h2 className="text-lg sm:text-xl font-black italic uppercase tracking-tighter text-orange-600 mb-8 flex items-center gap-2 text-left"><PlusCircle className="w-5 h-5" /> Publish New Work</h2>
              <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <input placeholder="Project Title" className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} required />
                <select className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none cursor-pointer" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})}>
                  {CATEGORIES.filter(c => c !== "All").map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input placeholder="Starting Price ($)" type="number" className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} required />
                <input placeholder="Image Link" className="md:col-span-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none" value={newProduct.image} onChange={e => setNewProduct({...newProduct, image: e.target.value})} required />
                <textarea placeholder="Description..." className="md:col-span-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl h-24 text-sm outline-none" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} required />
                <button type="submit" disabled={isSaving} className="md:col-span-3 bg-slate-900 text-white font-black py-4 rounded-[1.5rem] shadow-xl uppercase active:scale-95 transition-all text-xs tracking-widest">{isSaving ? "Syncing..." : "Add to Live Catalog"}</button>
              </form>
            </div>
            
            <div className="bg-white rounded-[2rem] p-6 text-slate-900 border border-slate-200 overflow-hidden text-left">
              <h3 className="text-lg font-bold mb-6 italic uppercase flex items-center gap-2 text-slate-400"><Layers className="w-5 h-5"/> Live Inventory Control</h3>
              <div className="max-h-[300px] overflow-y-auto no-scrollbar">
                <table className="w-full text-xs sm:text-sm">
                  <tbody className="divide-y divide-slate-100">
                    {products.map(p => (
                      <tr key={p.id} className="group hover:bg-slate-50">
                        <td className="py-4 px-2 font-bold text-left">{p.name}</td>
                        <td className="py-4 px-2 text-[10px] text-slate-400 uppercase hidden sm:table-cell text-left">{p.category}</td>
                        <td className="py-4 px-2 text-right">
                          <button onClick={() => handleDeleteProduct(p.id)} className="text-slate-300 hover:text-red-500 p-2 transition-colors"><Trash2 className="w-4 h-4" /></button>
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
          <div className="mb-6 sm:mb-10 bg-[#F36F21] rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-14 text-white relative overflow-hidden flex flex-col md:flex-row items-center justify-between shadow-[0_20px_50px_rgba(243,111,33,0.3)] border border-white/10 group text-left">
            <div className="relative z-10 max-w-xl">
              <div className="inline-flex items-center gap-2 bg-white/20 px-3 sm:px-4 py-1.5 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] mb-4 sm:mb-6 backdrop-blur-md border border-white/10">
                <Award className="w-3 h-3 fill-current"/> {siteSettings.badgeText || "FLORIDA ELITE"}
              </div>
              <h2 className="text-3xl sm:text-7xl font-black mb-4 sm:mb-6 uppercase tracking-tighter leading-[0.9] text-white">
                Make Your <br/><span className="text-neutral-900 underline decoration-white/30 underline-offset-4 sm:underline-offset-8">Brand Glow.</span>
              </h2>
              <p className="text-orange-50 mb-6 sm:mb-10 text-sm sm:text-xl font-medium opacity-90 leading-relaxed max-w-md">The most advanced vehicle wraps and visual signage in Florida.</p>
              <button onClick={() => setIsAiChatOpen(true)} className="w-full sm:w-auto bg-neutral-900 text-white px-6 sm:px-10 py-4 sm:py-5 rounded-xl sm:rounded-[2rem] font-black flex items-center justify-center gap-3 hover:bg-black hover:scale-105 active:scale-95 transition-all shadow-2xl uppercase text-[10px] sm:text-xs tracking-widest">
                <MessageSquare className="w-5 h-5" /> Start Project Consultation
              </button>
            </div>
            <PenTool className="w-48 h-48 sm:w-[500px] sm:h-[500px] text-white/5 absolute -right-10 -bottom-10 rotate-12 transition-transform duration-1000" />
          </div>
        )}

        {/* CONTROLES MOBILE / DESKTOP */}
        <div className="flex flex-col gap-4 sm:gap-6 mb-8 sm:mb-12">
          {/* Desktop Categories */}
          <div className="hidden sm:flex flex-wrap justify-center gap-2">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setFilter(cat)} className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm border ${filter === cat ? "bg-slate-900 text-white border-slate-900 shadow-xl scale-105" : "bg-white text-slate-500 border-slate-200 hover:border-orange-500"} flex items-center justify-center`}>
                {cat}
              </button>
            ))}
          </div>

          {/* Mobile Dropdown */}
          <div className="sm:hidden relative">
            <button onClick={() => setIsMobileCategoryMenuOpen(!isMobileCategoryMenuOpen)} className="w-full bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between font-black text-[11px] uppercase tracking-widest shadow-sm">
              <div className="flex items-center gap-2 text-left"><Filter className="w-4 h-4 text-orange-500" /> Category: <span className="text-orange-600">{filter}</span></div>
              <ChevronDown className={`w-4 h-4 transition-transform ${isMobileCategoryMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {isMobileCategoryMenuOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-xl shadow-2xl z-50 py-2">
                {CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => { setFilter(cat); setIsMobileCategoryMenuOpen(false); }} className={`w-full text-left px-5 py-3.5 text-[10px] font-black uppercase tracking-widest ${filter === cat ? 'bg-orange-50 text-orange-600 font-black border-l-4 border-orange-500' : 'text-slate-500'}`}>{cat}</button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between px-2 sm:px-4 border-t border-slate-200 pt-4 sm:pt-6">
            <div className="flex items-center gap-2 text-slate-400"><Filter className="w-3 h-3 sm:w-4 sm:h-4" /><span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest">{filteredProducts.length} Results</span></div>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-transparent text-[8px] sm:text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer text-slate-600">
              <option value="newest">Newest</option>
              <option value="price-low">Price: Low</option>
              <option value="price-high">Price: High</option>
            </select>
          </div>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-10 text-left">
          {filteredProducts.map(product => (
            <div key={product.id} className="group bg-white rounded-[2rem] sm:rounded-[3rem] border border-slate-100/60 p-3 sm:p-4 hover:shadow-2xl transition-all duration-500 relative flex flex-col shadow-sm">
              <div className="aspect-square rounded-[1.5rem] sm:rounded-[2.2rem] overflow-hidden bg-slate-50 mb-4 sm:mb-6 relative shadow-inner">
                <img src={product.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt={product.name} />
                <div className="absolute top-3 left-3 sm:top-4 sm:left-4 bg-orange-600 text-white text-[7px] sm:text-[8px] font-black px-2 sm:px-3 py-1.5 rounded-lg uppercase shadow-lg z-10 tracking-wider">
                  {siteSettings.badgeText || "FLORIDA ELITE"}
                </div>
                <button onClick={() => handleShare(product)} className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white p-2 rounded-xl transition-all opacity-100 sm:opacity-0 group-hover:opacity-100"><Share2 className="w-3 h-3 sm:w-4 sm:h-4" /></button>
              </div>
              <div className="flex-1 px-1 sm:px-2 flex flex-col">
                <span className="text-[8px] sm:text-[9px] font-black text-orange-600 uppercase tracking-widest mb-1">{product.category}</span>
                <h3 className="font-bold text-slate-900 text-base sm:text-lg mb-3 leading-tight line-clamp-2 uppercase tracking-tighter">{product.name}</h3>
                <div className="flex justify-between items-center mt-auto pt-4 sm:pt-5 border-t border-slate-50">
                  <div className="flex flex-col"><span className="text-[8px] sm:text-[9px] text-slate-400 font-bold uppercase leading-none">Starting at</span><span className="text-lg sm:text-xl font-black text-slate-900 leading-tight">${Number(product.price).toLocaleString()}</span></div>
                  <button onClick={() => setSelectedProduct(product)} className="bg-slate-900 text-white p-2.5 sm:p-3.5 rounded-xl hover:bg-orange-600 active:scale-90 transition-all shadow-lg"><Maximize className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* LOGIN ADMIN */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-xl animate-in fade-in">
          <div className="bg-white rounded-[2rem] sm:rounded-[3rem] p-8 sm:p-10 max-w-sm w-full shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto shadow-inner"><Lock className="w-8 h-8 sm:w-10 sm:h-10" /></div>
            <h2 className="text-xl sm:text-2xl font-black italic uppercase text-slate-900 tracking-tighter text-left">Admin Access</h2>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <input type="password" placeholder="••••••••" className={`w-full p-4 sm:p-5 bg-slate-50 border-2 rounded-2xl text-center text-xl font-bold outline-none ${passwordError ? 'border-red-500 animate-shake' : 'border-slate-100'}`} value={passwordInput} onChange={e => setPasswordInput(e.target.value)} autoFocus />
              <button type="submit" className="w-full p-4 bg-orange-600 text-white rounded-2xl font-black shadow-lg uppercase text-[10px] tracking-widest">Unlock Panel</button>
            </form>
          </div>
        </div>
      )}

      {/* DETALHES MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-6 bg-slate-900/80 backdrop-blur-md overflow-y-auto text-left">
          <div className="bg-white rounded-none sm:rounded-[3.5rem] min-h-screen sm:min-h-0 max-w-5xl w-full flex flex-col md:flex-row overflow-hidden shadow-2xl my-auto animate-in zoom-in duration-500">
            <div className="md:w-1/2 h-[300px] sm:h-[400px] md:h-auto relative bg-slate-100 group shrink-0">
              <img src={selectedProduct.image} className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-105" alt={selectedProduct.name} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
              <div className="absolute top-4 left-4 bg-orange-600 text-white text-[8px] font-black px-3 py-1.5 rounded-lg uppercase shadow-lg">
                {siteSettings.badgeText || "FLORIDA ELITE"}
              </div>
              <button onClick={() => setSelectedProduct(null)} className="sm:hidden absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full backdrop-blur-md"><X className="w-6 h-6" /></button>
            </div>
            <div className="md:w-1/2 p-6 sm:p-16 flex flex-col justify-center relative bg-white flex-1 text-left">
              <button onClick={() => setSelectedProduct(null)} className="hidden sm:block absolute top-8 right-8 text-slate-300 hover:text-slate-900 transition-all duration-300"><X className="w-8 h-8" /></button>
              <div>
                <span className="text-orange-600 font-black text-[9px] sm:text-[10px] uppercase tracking-[0.4em] bg-orange-50 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl sm:rounded-2xl">{selectedProduct.category}</span>
                <h2 className="text-2xl sm:text-5xl font-black text-slate-900 mt-4 sm:mt-8 mb-6 sm:mb-10 leading-tight tracking-tighter uppercase">{selectedProduct.name}</h2>
                <div className="bg-slate-50 p-5 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] mb-8 border border-slate-100 shadow-inner">
                  <p className="text-slate-600 leading-relaxed text-sm sm:text-lg italic text-left">"{selectedProduct.description}"</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-8 pt-6 border-t border-slate-100 mt-auto">
                  <div className="text-center sm:text-left">
                    <span className="text-[9px] sm:text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-1">Starting at</span>
                    <span className="text-3xl sm:text-4xl font-black text-slate-900 leading-none">${Number(selectedProduct.price).toLocaleString()}</span>
                  </div>
                  <button onClick={() => window.open(`https://wa.me/1${siteSettings.whatsapp}?text=Hi GSI Group! I saw ${selectedProduct.name} and I want a quote.`)} className="w-full sm:w-auto bg-orange-600 text-white px-8 sm:px-12 py-4 sm:py-5 rounded-xl sm:rounded-[2rem] font-black shadow-xl hover:bg-orange-700 active:scale-95 transition-all flex items-center justify-center gap-3 uppercase text-[10px] sm:text-[11px] tracking-widest">
                    Request Quote <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🤖 ROBOT CHAT INTERATIVO (REDIRECIONAMENTO WHATSAPP) */}
      <div className={`fixed inset-0 sm:inset-auto sm:bottom-8 sm:right-8 z-50 transition-all transform ${isAiChatOpen ? 'scale-100 translate-y-0' : 'scale-0 translate-y-20 pointer-events-none'}`}>
        <div className="bg-white h-full sm:h-[680px] sm:rounded-[3rem] shadow-2xl w-full sm:w-[420px] flex flex-col border border-slate-100 overflow-hidden text-slate-900 text-left">
          <div className="bg-slate-900 p-6 sm:p-8 text-white flex justify-between items-center relative overflow-hidden shrink-0">
            <div className="absolute top-0 right-0 w-32 sm:w-40 h-32 sm:h-40 bg-orange-500/20 rounded-full blur-3xl"></div>
            <div className="relative z-10 flex items-center gap-3 sm:gap-4 text-left">
              <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg"><MessageSquare className="w-5 h-5 sm:w-7 sm:h-7 text-white" /></div>
              <div className="text-left leading-none"><h4 className="font-black text-sm sm:text-base uppercase tracking-tight text-white mb-1">Consultant</h4><p className="text-[8px] sm:text-[10px] text-orange-400 font-bold uppercase tracking-[0.2em]">Florida Office</p></div>
            </div>
            <button onClick={() => setIsAiChatOpen(false)} className="relative z-10 bg-white/10 p-2 sm:p-3 rounded-xl hover:bg-white/20 transition-all shadow-inner"><X className="w-6 h-6 sm:w-5 sm:h-5" /></button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-4 sm:space-y-6 bg-slate-50/50 no-scrollbar text-left">
            {aiMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                <div className={`max-w-[90%] sm:max-w-[85%] p-4 sm:p-5 rounded-2xl sm:rounded-[2.2rem] text-xs sm:text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-orange-600 text-white rounded-tr-none' : 'bg-white text-slate-700 rounded-tl-none border border-slate-200/50 text-slate-900'}`}>
                  {msg.text}
                  {msg.isInitial && (
                    <div className="mt-6 grid grid-cols-1 gap-2">
                      {[
                        { label: "Request a Quote", id: "Get a Quote" },
                        { label: "Check Order Status", id: "Track My Order" },
                        { label: "Existing Customer", id: "I'm already a customer" },
                        { label: "First Contact / New Project", id: "New Project Inquiry" },
                        { label: "Office Address", id: "Our Address" },
                        { label: "Talk to an Agent", id: "Talk to an Agent" }
                      ].map(opt => (
                        <button key={opt.id} onClick={() => handleChatOption(opt.id)} className="w-full text-left p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-orange-500 hover:bg-orange-50 transition-all text-[10px] font-bold uppercase tracking-widest text-slate-600 flex items-center justify-between">
                          {opt.label} <ChevronRight className="w-3 h-3 text-orange-500" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoadingAi && <div className="text-[8px] sm:text-[9px] font-black text-orange-500 uppercase tracking-widest animate-pulse ml-4">Consultant is typing...</div>}
          </div>

          <div className="p-4 sm:p-6 bg-white border-t border-slate-100 flex gap-2 pb-8 sm:pb-6">
            <input className="flex-1 bg-slate-100 rounded-xl px-4 py-3 sm:py-4 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-orange-500 text-slate-900" placeholder="Ask about wraps, prices..." value={userInput} onChange={e => setUserInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSendMessage()} />
            <button onClick={handleSendMessage} className="bg-slate-900 text-white p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-xl hover:bg-orange-600"><Send className="w-4 h-4 sm:w-5 sm:h-5" /></button>
          </div>
        </div>
      </div>
      
      {!isAiChatOpen && (
        <button onClick={() => setIsAiChatOpen(true)} className="fixed bottom-6 right-6 sm:bottom-10 sm:right-10 bg-orange-500 text-white p-5 sm:p-6 rounded-[1.8rem] sm:rounded-[2.5rem] shadow-[0_15px_40px_rgba(243,111,33,0.4)] hover:scale-110 active:scale-95 transition-all z-40">
          <MessageSquare className="w-7 h-7 sm:w-8 sm:h-8" />
        </button>
      )}
      
      {/* 🏁 RODAPÉ CONFIGURÁVEL PELO DASHBOARD */}
      <footer className="bg-slate-900 text-white py-16 sm:py-24 mt-12 sm:mt-20 text-center border-t border-white/5 px-4 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent"></div>
        <h2 className="text-xl sm:text-4xl font-black italic uppercase tracking-tighter leading-none mb-4 sm:mb-6">{siteSettings.companyName.split(' ')[0]} <span className="text-orange-500">{siteSettings.companyName.split(' ').slice(1).join(' ')}</span></h2>
        <p className="text-slate-400 text-[9px] sm:text-[12px] uppercase tracking-[0.4em] mb-8 italic font-medium">{siteSettings.tagline}</p>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-8 mb-12 text-slate-500 text-[9px] sm:text-[11px] font-black uppercase tracking-widest text-left">
          <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(siteSettings.address)}`, '_blank')} className="flex items-center justify-center gap-2 hover:text-white transition-colors text-left">
            <MapPin className="w-4 h-4 text-orange-500 shrink-0" /> {siteSettings.address}
          </button>
          <div className="hidden sm:block opacity-20">•</div>
          <a href={`mailto:${siteSettings.email}`} className="flex items-center justify-center gap-2 hover:text-white transition-colors">
            <Mail className="w-4 h-4 text-orange-500 shrink-0" /> {siteSettings.email}
          </a>
          <div className="hidden sm:block opacity-20">•</div>
          <a href={`https://wa.me/${siteSettings.whatsapp}`} className="flex items-center justify-center gap-2 hover:text-white transition-colors">
            <Phone className="w-4 h-4 text-orange-500 shrink-0" /> +1 ({siteSettings.whatsapp.substring(1,4)}) {siteSettings.whatsapp.substring(4,7)}-{siteSettings.whatsapp.substring(7)}
          </a>
        </div>

        <p className="text-slate-600 text-[8px] sm:text-[10px] uppercase tracking-[0.3em] font-bold">
          © {new Date().getFullYear()} {siteSettings.copyright} • ALL RIGHTS RESERVED • Orlando • USA
        </p>
      </footer>
    </div>
  );
}
