import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, ShoppingCart, ChevronRight, Filter, MessageSquare, X, Send,
  Info, Package, Star, Zap, Plus, Trash2, Settings, Image as ImageIcon,
  ExternalLink, PenTool, Layers, Printer, Truck, Maximize,
  LayoutDashboard, PlusCircle, Lock, ShieldCheck, AlertCircle, CheckCircle2,
  ArrowUpDown, Share2, BarChart3, TrendingUp, ChevronDown, MapPin, Mail, Phone, Globe,
  Command, Award, Pencil, PlayCircle, Youtube, ChevronLeft, Loader2
} from 'lucide-react';

// Importações do Firebase
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, doc, onSnapshot, addDoc, deleteDoc, setDoc, updateDoc } from 'firebase/firestore';

// --- ✅ CONFIGURAÇÃO FIREBASE ---
const VERCEL_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCxRhZLz3H4zeEEvNkxh4U_ZjeTEGg6PPE",
  authDomain: "the-gsi-catalog.firebaseapp.com",
  projectId: "the-gsi-catalog",
  storageBucket: "the-gsi-catalog.firebasestorage.app",
  messagingSenderId: "434905220729",
  appId: "1:434905220729:web:69f23b774cf711a5df6aa8",
  measurementId: "G-FHDQQKEE7E"
};

const DEFAULT_SETTINGS = {
  companyName: "The GSI Group",
  tagline: "Signs Print Digital Marketing",
  primaryColor: "#F36F21",
  whatsapp: "14074885194",
  email: "designer@thegsigroup.com",
  address: "3344 S. Orange Blossom TRL, Kissimmee, FL 34746",
  logoUrl: "",
  copyright: "The GSI Group LLC",
  badgeText: "ORLANDO ELITE" 
};

const ADMIN_PASSWORD = "GSI_FLORIDA_2026"; 

const CATEGORIES = [
  "All", "Digital marketing", "Graphic Design", "Car wrap", 
  "Custom TDF awards", "Illuminated Signs", "Outdoor Signs", 
  "Promotional Signs", "Window Graphics", "Wall Graphics"
];

const VIDEO_GALLERIES = [
  "General", "Tutorials", "Project Showcases", "Customer Testimonials", "Behind the Scenes"
];

// --- INICIALIZAÇÃO FIREBASE ---
let db = null;
let auth = null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'the-gsi-group-final';

try {
  const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : VERCEL_FIREBASE_CONFIG;
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) { 
  console.error("Erro na ligação ao Firebase."); 
}

export default function App() {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [banners, setBanners] = useState([]);
  const [videos, setVideos] = useState([]);
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
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const searchInputRef = useRef(null);

  // Estados de Edição Admin
  const [editSettings, setEditSettings] = useState(DEFAULT_SETTINGS);
  const [editingId, setEditingId] = useState(null);
  const [newProduct, setNewProduct] = useState({ name: '', category: 'Digital marketing', price: '', description: '', image: '' });
  const [newBanner, setNewBanner] = useState({ title: '', subtitle: '', image: '', active: true });
  const [newVideo, setNewVideo] = useState({ title: '', youtubeUrl: '', gallery: 'General' });
  
  // AI Chat State
  const [aiMessages, setAiMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [isMobileCategoryMenuOpen, setIsMobileCategoryMenuOpen] = useState(false);

  // Atalho de pesquisa ( / )
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Firebase Realtime Sync
  useEffect(() => {
    if (!db || !user) return;
    
    const unsubProducts = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'products'), 
      (snapshot) => setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    );

    const unsubBanners = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'banners'), 
      (snapshot) => {
        const bData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setBanners(bData.length > 0 ? bData : [{ 
          id: 'default', 
          title: 'Make Your Brand Glow.', 
          subtitle: 'The most advanced vehicle wraps and visual signage in Florida.', 
          image: '', 
          isDefault: true 
        }]);
      }
    );

    const unsubVideos = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'videos'), 
      (snapshot) => setVideos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    );

    const unsubSettings = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'global'), 
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSiteSettings(data);
          setEditSettings(data);
        }
      }
    );

    return () => { unsubProducts(); unsubBanners(); unsubVideos(); unsubSettings(); };
  }, [user]);

  // Slideshow timer
  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [banners]);

  // Auth
  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else { await signInAnonymously(auth); }
      } catch (err) { await signInAnonymously(auth); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // Handlers Admin
  const handleAddVideo = async (e) => {
    e.preventDefault();
    if (!db || isSaving || !user) return;
    setIsSaving(true);
    try {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = newVideo.youtubeUrl.match(regExp);
      const videoId = (match && match[2] && match[2].length === 11) ? match[2] : null;

      if (!videoId) throw new Error("URL do YouTube inválida.");

      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'videos'), { 
        ...newVideo, 
        videoId,
        createdAt: new Date().toISOString() 
      });
      setNewVideo({ title: '', youtubeUrl: '', gallery: 'General' });
      setStatusMsg({ type: 'success', text: 'Vídeo adicionado!' });
    } catch (e) { setStatusMsg({ type: 'error', text: e.message }); }
    finally { setIsSaving(false); setTimeout(() => setStatusMsg({ type: '', text: '' }), 3000); }
  };

  const handleDeleteVideo = async (id) => {
    if (!db || !user) return;
    if (window.confirm("Eliminar vídeo?")) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'videos', id));
    }
  };

  const handleAddBanner = async (e) => {
    e.preventDefault();
    if (!db || isSaving || !user) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'banners'), { 
        ...newBanner, 
        createdAt: new Date().toISOString() 
      });
      setNewBanner({ title: '', subtitle: '', image: '', active: true });
      setStatusMsg({ type: 'success', text: 'Banner adicionado!' });
    } catch (e) { setStatusMsg({ type: 'error', text: 'Erro ao guardar banner.' }); }
    finally { setIsSaving(false); setTimeout(() => setStatusMsg({ type: '', text: '' }), 3000); }
  };

  const handleDeleteBanner = async (id) => {
    if (!db || id === 'default' || !user) return;
    if (window.confirm("Eliminar banner?")) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'banners', id));
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!db || isSaving || !user) return;
    setIsSaving(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', editingId), { 
          ...newProduct, 
          price: Number(newProduct.price), 
          updatedAt: new Date().toISOString() 
        });
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'products'), { 
          ...newProduct, 
          price: Number(newProduct.price), 
          createdAt: new Date().toISOString() 
        });
      }
      setNewProduct({ name: '', category: 'Digital marketing', price: '', description: '', image: '' });
      setStatusMsg({ type: 'success', text: 'Trabalho guardado!' });
    } catch (err) { setStatusMsg({ type: 'error', text: 'Erro ao guardar.' }); }
    finally { setIsSaving(false); setTimeout(() => setStatusMsg({ type: '', text: '' }), 3000); }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAdminMode(true); setIsPasswordModalOpen(false); setPasswordInput("");
    } else { setPasswordError(true); setTimeout(() => setPasswordError(false), 2000); }
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || isLoadingAi) return;
    const userMsg = { role: 'user', text: userInput };
    setAiMessages(prev => [...prev, userMsg]);
    setUserInput("");
    setIsLoadingAi(true);
    const systemPrompt = `Expert consultant for ${siteSettings.companyName}. Address: ${siteSettings.address}. WhatsApp: ${siteSettings.whatsapp}. Speak Portuguese/English.`;
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: userInput }] }], systemInstruction: { parts: [{ text: systemPrompt }] } })
      });
      const data = await response.json();
      setAiMessages(prev => [...prev, { role: 'assistant', text: data?.candidates?.[0]?.content?.parts?.[0]?.text || "Como posso ajudar?" }]);
    } catch (e) { setAiMessages(prev => [...prev, { role: 'assistant', text: "Erro no chat. Use o WhatsApp." }]); }
    finally { setIsLoadingAi(false); }
  };

  const filteredProducts = useMemo(() => {
    let res = products.filter(p => (filter === "All" || p.category === filter) && p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    return res.sort((a, b) => sortBy === "price-low" ? Number(a.price) - Number(b.price) : sortBy === "price-high" ? Number(b.price) - Number(a.price) : new Date(b.createdAt) - new Date(a.createdAt));
  }, [products, filter, searchTerm, sortBy]);

  const stats = useMemo(() => ({
    total: products.length,
    avgPrice: products.length ? Math.round(products.reduce((acc, p) => acc + Number(p.price), 0) / products.length) : 0,
  }), [products]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans overflow-x-hidden selection:bg-orange-100">
      
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 h-20 flex justify-between items-center px-4 sm:px-8 shadow-sm">
        <div className="flex flex-col cursor-pointer" onClick={() => {setFilter("All"); setIsAdminMode(false);}}>
          {siteSettings?.logoUrl ? (
            <img src={siteSettings.logoUrl} alt="Logo" className="h-10 sm:h-12 w-auto object-contain" />
          ) : (
            <h1 className="text-lg sm:text-2xl font-black italic tracking-tighter uppercase">THE <span style={{ color: siteSettings?.primaryColor }}>GSI</span> GROUP</h1>
          )}
        </div>

        <div className="hidden md:flex flex-1 max-w-md mx-8 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            ref={searchInputRef}
            type="text" 
            placeholder="Search projects... (Atalho '/')" 
            className="w-full bg-slate-100/50 border border-slate-200 py-2.5 pl-11 pr-4 rounded-2xl text-sm outline-none focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <button onClick={() => isAdminMode ? setIsAdminMode(false) : setIsPasswordModalOpen(true)} className={`p-2.5 rounded-2xl transition-all ${isAdminMode ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-100'}`}>
            <LayoutDashboard className="w-5 h-5" />
          </button>
          <button onClick={() => window.open(`https://wa.me/${siteSettings?.whatsapp}`, '_blank')} className="bg-slate-900 text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-sm font-bold shadow-xl uppercase tracking-widest">
            Contact
          </button>
        </div>
      </header>

      {/* MOBILE SEARCH BAR */}
      <div className="md:hidden px-4 pt-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search catalog..." 
            className="w-full bg-white border border-slate-200 py-3 pl-11 pr-4 rounded-xl text-sm outline-none shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
        
        {/* DASHBOARD ADMINISTRATIVO */}
        {isAdminMode && (
          <div className="mb-12 space-y-8 animate-in slide-in-from-top-6 duration-700 text-left">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="bg-orange-50 p-3 rounded-2xl text-orange-600"><BarChart3 className="w-6 h-6"/></div>
                <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Items</p><p className="text-2xl font-black">{stats.total}</p></div>
              </div>
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="bg-green-50 p-3 rounded-2xl text-green-600"><TrendingUp className="w-6 h-6"/></div>
                <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Média de Preços</p><p className="text-2xl font-black">${stats.avgPrice}</p></div>
              </div>
            </div>

            {/* Vídeos Admin */}
            <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-100">
               <h2 className="text-xl font-bold mb-6 flex items-center gap-3 text-red-600 uppercase italic tracking-tighter"><Youtube className="w-5 h-5" /> Video Gallery Control</h2>
              <form onSubmit={handleAddVideo} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <input placeholder="Título" className="p-4 bg-slate-50 rounded-2xl text-sm border border-slate-100" value={newVideo.title} onChange={e => setNewVideo({...newVideo, title: e.target.value})} required />
                <select className="p-4 bg-slate-50 rounded-2xl text-sm border border-slate-100" value={newVideo.gallery} onChange={e => setNewVideo({...newVideo, gallery: e.target.value})}>
                  {VIDEO_GALLERIES.map(gal => <option key={gal} value={gal}>{gal}</option>)}
                </select>
                <input placeholder="Link YouTube" className="p-4 bg-slate-50 rounded-2xl text-sm border border-slate-100" value={newVideo.youtubeUrl} onChange={e => setNewVideo({...newVideo, youtubeUrl: e.target.value})} required />
                <button type="submit" disabled={isSaving} className="md:col-span-3 bg-red-600 text-white py-4 rounded-2xl font-black uppercase text-xs">Adicionar Vídeo</button>
              </form>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {videos.map(v => (
                  <div key={v.id} className="relative group rounded-xl overflow-hidden aspect-video bg-slate-100">
                    <img src={`https://img.youtube.com/vi/${v.videoId}/mqdefault.jpg`} className="w-full h-full object-cover" />
                    <button onClick={() => handleDeleteVideo(v.id)} className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </div>

            {/* Banners Admin */}
            <div className="bg-slate-900 rounded-[2.5rem] p-6 sm:p-8 text-white shadow-2xl relative">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-3 text-orange-500 uppercase italic tracking-tighter"><ImageIcon className="w-5 h-5" /> Slideshow</h2>
              <form onSubmit={handleAddBanner} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <input placeholder="Título" className="p-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white" value={newBanner.title} onChange={e => setNewBanner({...newBanner, title: e.target.value})} required />
                <input placeholder="Imagem Link (1920x550)" className="p-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white" value={newBanner.image} onChange={e => setNewBanner({...newBanner, image: e.target.value})} />
                <textarea placeholder="Subtítulo" className="md:col-span-2 p-4 bg-white/5 border border-white/10 rounded-2xl text-sm h-20 text-white" value={newBanner.subtitle} onChange={e => setNewBanner({...newBanner, subtitle: e.target.value})} required />
                <button type="submit" className="md:col-span-2 bg-orange-600 p-4 rounded-2xl font-black uppercase text-xs">Adicionar Slide</button>
              </form>
              <div className="space-y-2">
                {banners.map(b => (
                  <div key={b.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                    <div className="flex items-center gap-4">
                      {b.image && <img src={b.image} className="w-12 h-12 rounded-lg object-cover" />}
                      <p className="font-bold text-sm">{b.title}</p>
                    </div>
                    {!b.isDefault && <button onClick={() => handleDeleteBanner(b.id)} className="text-white/20 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>}
                  </div>
                ))}
              </div>
            </div>

            {/* Produto Admin */}
            <div className={`bg-white border-2 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl transition-all ${editingId ? 'border-blue-500' : 'border-orange-100'}`}>
              <h2 className={`text-xl font-black italic uppercase tracking-tighter mb-8 flex items-center gap-2 ${editingId ? 'text-blue-600' : 'text-orange-600'}`}>
                {editingId ? <Pencil className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />} {editingId ? "Editar" : "Novo Trabalho"}
              </h2>
              <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <input placeholder="Título" className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} required />
                <select className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})}>
                  {CATEGORIES.filter(c => c !== "All").map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input placeholder="Preço" type="number" className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} required />
                <input placeholder="Imagem Link" className="md:col-span-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm" value={newProduct.image} onChange={e => setNewProduct({...newProduct, image: e.target.value})} required />
                <textarea placeholder="Descrição" className="md:col-span-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl h-24 text-sm" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} required />
                <button type="submit" className="md:col-span-3 bg-slate-900 text-white py-4 rounded-[1.5rem] font-black uppercase text-xs">Guardar</button>
              </form>
            </div>

            {/* Inventário Admin */}
            <div className="bg-white rounded-[2rem] p-6 text-slate-900 border border-slate-200 overflow-hidden shadow-sm">
              <h3 className="text-lg font-bold mb-6 italic uppercase flex items-center gap-2 text-slate-400"><Layers className="w-5 h-5"/> Live Inventory</h3>
              <div className="max-h-[400px] overflow-y-auto no-scrollbar">
                <table className="w-full text-xs sm:text-sm">
                  <tbody className="divide-y divide-slate-100">
                    {products.map(p => (
                      <tr key={p.id} className="group hover:bg-slate-50">
                        <td className="py-4 px-2 font-bold text-left">{p.name}</td>
                        <td className="py-4 px-2 text-right flex justify-end gap-2">
                          <button onClick={() => handleEditClick(p)} className="text-slate-400 hover:text-blue-500 p-2"><Pencil size={14} /></button>
                          <button onClick={() => handleDeleteProduct(p.id)} className="text-slate-300 hover:text-red-500 p-2"><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* HERO SECTION - SLIDESHOW (1920x550) */}
        {!isAdminMode && (
          <div className="mb-10 relative h-[350px] sm:h-[550px] rounded-[2rem] sm:rounded-[3.5rem] overflow-hidden group shadow-2xl">
            {banners.map((slide, index) => (
              <div 
                key={slide.id}
                className={`absolute inset-0 transition-all duration-1000 ease-in-out transform flex items-center px-6 sm:px-14 ${index === currentSlide ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'}`}
                style={{ 
                  backgroundColor: slide.image ? 'transparent' : siteSettings?.primaryColor,
                  backgroundImage: slide.image ? `url(${slide.image})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                {slide.image && <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>}
                <div className="relative z-10 max-w-2xl text-left text-white animate-in slide-in-from-bottom-6 duration-700">
                  <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-6 backdrop-blur-md border border-white/10">
                    <Award className="w-3 h-3"/> {siteSettings?.badgeText}
                  </div>
                  <h2 className="text-3xl sm:text-7xl font-black mb-6 uppercase tracking-tighter leading-[0.9]">
                    {slide.title?.split(' ').map((word, i) => (
                      <span key={i} className={i === (slide.title?.split(' ').length - 1) ? "text-neutral-900 bg-white px-2 rounded-lg" : ""}>{word}{' '}</span>
                    ))}
                  </h2>
                  <p className="text-white/90 mb-10 text-sm sm:text-xl font-medium max-w-md">{slide.subtitle}</p>
                  <button onClick={() => setIsAiChatOpen(true)} className="bg-white text-slate-900 px-10 py-4 rounded-full font-black uppercase text-xs hover:scale-105 transition-all">Start Project</button>
                </div>
              </div>
            ))}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
              {banners.map((_, i) => (
                <button key={i} onClick={() => setCurrentSlide(i)} className={`h-1.5 rounded-full transition-all duration-500 ${i === currentSlide ? 'w-8 bg-white' : 'w-2 bg-white/30'}`} />
              ))}
            </div>
          </div>
        )}

        {/* VIDEOS */}
        {!isAdminMode && videos.length > 0 && filter === "All" && (
          <div className="mb-16 text-left animate-in fade-in duration-700">
            <h2 className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-3 mb-8">
              <PlayCircle className="text-red-600" /> Video Portfolio
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {videos.map(v => (
                <div key={v.id} className="bg-white rounded-[2rem] p-4 shadow-sm border border-slate-100 flex flex-col group">
                  <div className="aspect-video rounded-2xl overflow-hidden mb-4 bg-slate-900 relative">
                    <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${v.videoId}`} title={v.title} frameBorder="0" allowFullScreen></iframe>
                  </div>
                  <div className="px-2">
                    <span className="text-[8px] font-black text-red-600 uppercase tracking-widest mb-1 block">{v.gallery || 'General'}</span>
                    <h3 className="font-bold text-slate-800 uppercase tracking-tighter truncate">{v.title}</h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- ✅ RESTAURAÇÃO DO MENU DE CATEGORIAS MOBILE (HAMBURGER / DROPDOWN) --- */}
        <div className="flex flex-col gap-6 mb-12">
          {/* Desktop Version */}
          <div className="hidden sm:flex flex-wrap justify-center gap-2">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setFilter(cat)} className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all border ${filter === cat ? "bg-slate-900 text-white border-slate-900 scale-105 shadow-md" : "bg-white text-slate-500 border-slate-200 hover:border-orange-500"}`}>
                {cat}
              </button>
            ))}
          </div>

          {/* Mobile Version (Aparece apenas em telemóveis) */}
          <div className="sm:hidden relative">
            <button 
              onClick={() => setIsMobileCategoryMenuOpen(!isMobileCategoryMenuOpen)} 
              className="w-full bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-between font-black text-[12px] uppercase tracking-widest shadow-sm active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-3">
                <Filter className="w-4 h-4 text-orange-500" />
                <span>Categoria: <span className="text-orange-600">{filter}</span></span>
              </div>
              <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isMobileCategoryMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isMobileCategoryMenuOpen && (
              <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-slate-100 rounded-[1.5rem] shadow-2xl z-50 py-3 animate-in fade-in zoom-in-95 duration-200">
                {CATEGORIES.map(cat => (
                  <button 
                    key={cat} 
                    onClick={() => { setFilter(cat); setIsMobileCategoryMenuOpen(false); }} 
                    className={`w-full text-left px-6 py-4 text-[11px] font-black uppercase tracking-widest transition-colors ${filter === cat ? 'bg-orange-50 text-orange-600 border-l-4 border-orange-500' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between px-4 border-t border-slate-200 pt-6">
            <div className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest">
              {filteredProducts.length} Results
            </div>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer">
              <option value="newest">Newest First</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* PORTFOLIO GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-10 text-left">
          {filteredProducts.map(product => (
            <div key={product.id} className="group bg-white rounded-[2.5rem] border border-slate-100 p-4 hover:shadow-2xl transition-all duration-500 flex flex-col shadow-sm">
              <div className="aspect-square rounded-[2rem] overflow-hidden bg-slate-50 mb-6 relative">
                <img src={product.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt={product.name} />
                <div className="absolute top-4 left-4 bg-orange-600 text-white text-[8px] font-black px-3 py-1.5 rounded-lg uppercase tracking-wider shadow-lg">
                  {siteSettings?.badgeText}
                </div>
                <button onClick={() => handleShare(product)} className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all"><Share2 size={16} /></button>
              </div>
              <div className="flex-1 flex flex-col px-2">
                <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest mb-1">{product.category}</span>
                <h3 className="font-bold text-slate-900 text-lg mb-4 uppercase tracking-tighter line-clamp-1">{product.name}</h3>
                <div className="flex justify-between items-center mt-auto pt-5 border-t border-slate-50">
                  <div className="flex flex-col"><span className="text-[9px] text-slate-400 font-bold uppercase leading-none">Starting at</span><span className="text-xl font-black text-slate-900">${Number(product.price).toLocaleString()}</span></div>
                  <button onClick={() => setSelectedProduct(product)} className="bg-slate-900 text-white p-3 rounded-xl hover:bg-orange-600 transition-all"><Maximize size={18} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-white py-16 mt-20 text-center px-4 relative">
        <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-4">
          {siteSettings.companyName?.split(' ')[0]} <span className="text-orange-500">{siteSettings.companyName?.split(' ').slice(1).join(' ')}</span>
        </h2>
        <div className="flex flex-col sm:flex-row justify-center gap-8 mb-12 text-slate-500 text-[10px] font-black uppercase tracking-widest text-left">
          <div className="flex items-center gap-2"><MapPin size={16} className="text-orange-500 shrink-0" /> {siteSettings?.address}</div>
          <div className="flex items-center gap-2"><Mail size={16} className="text-orange-500 shrink-0" /> {siteSettings?.email}</div>
          <div className="flex items-center gap-2"><Phone size={16} className="text-orange-500 shrink-0" /> +1 {siteSettings?.whatsapp}</div>
        </div>
      </footer>

      {/* LOGIN ADMIN */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-xl animate-in fade-in">
          <div className="bg-white rounded-[3rem] p-10 max-w-sm w-full text-center space-y-6 shadow-2xl">
            <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto shadow-inner"><Lock size={32} /></div>
            <h2 className="text-2xl font-black italic uppercase text-slate-900 tracking-tighter">Admin Access</h2>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <input type="password" placeholder="••••••••" className={`w-full p-5 bg-slate-50 border-2 rounded-2xl text-center text-xl font-bold outline-none ${passwordError ? 'border-red-500 animate-shake' : 'border-slate-100'}`} value={passwordInput} onChange={e => setPasswordInput(e.target.value)} autoFocus />
              <button type="submit" className="w-full p-4 bg-orange-600 text-white rounded-2xl font-black shadow-lg uppercase text-[10px] tracking-widest">Unlock Panel</button>
            </form>
          </div>
        </div>
      )}

      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-6 bg-slate-900/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-white rounded-none sm:rounded-[3.5rem] max-w-5xl w-full flex flex-col md:flex-row overflow-hidden shadow-2xl animate-in zoom-in duration-300">
            <div className="md:w-1/2 h-[350px] md:h-auto relative bg-slate-100 shrink-0">
              <img src={selectedProduct.image} className="w-full h-full object-cover" alt={selectedProduct.name} />
              <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full md:hidden"><X size={24} /></button>
            </div>
            <div className="md:w-1/2 p-8 sm:p-16 flex flex-col justify-center relative bg-white text-left">
              <button onClick={() => setSelectedProduct(null)} className="hidden md:block absolute top-8 right-8 text-slate-300 hover:text-slate-900 transition-all"><X size={32} /></button>
              <span className="text-orange-600 font-black text-[10px] uppercase tracking-[0.4em] bg-orange-50 px-5 py-2.5 rounded-2xl w-fit">{selectedProduct.category}</span>
              <h2 className="text-3xl sm:text-5xl font-black text-slate-900 mt-8 mb-10 leading-tight tracking-tighter uppercase">{selectedProduct.name}</h2>
              <div className="bg-slate-50 p-8 rounded-[2.5rem] mb-10 border border-slate-100">
                <p className="text-slate-600 leading-relaxed text-lg italic">"{selectedProduct.description}"</p>
              </div>
              <button onClick={() => window.open(`https://wa.me/${siteSettings?.whatsapp}?text=Vi o seu ${selectedProduct.name} e gostaria de um orçamento.`)} className="w-full bg-orange-600 text-white py-5 rounded-[2rem] font-black shadow-xl uppercase text-[11px] tracking-widest flex items-center justify-center gap-3">
                Request Quote <ExternalLink size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI CHATBOT */}
      <div className={`fixed inset-0 sm:inset-auto sm:bottom-8 sm:right-8 z-50 transition-all transform ${isAiChatOpen ? 'scale-100' : 'scale-0 translate-y-20 pointer-events-none'}`}>
        <div className="bg-white h-full sm:h-[650px] sm:rounded-[3rem] shadow-2xl w-full sm:w-[400px] flex flex-col border border-slate-100 overflow-hidden text-left">
          <div className="bg-slate-900 p-8 text-white flex justify-between items-center relative overflow-hidden">
            <div className="relative z-10 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg"><MessageSquare size={24} /></div>
              <div className="leading-none"><h4 className="font-black uppercase tracking-tight text-white mb-1">IA Consultor</h4><p className="text-[10px] text-orange-400 font-bold uppercase">Florida Office</p></div>
            </div>
            <button onClick={() => setIsAiChatOpen(false)} className="bg-white/10 p-2 rounded-xl hover:bg-white/20 transition-all"><X size={20} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50 no-scrollbar">
            {aiMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-[1.8rem] text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-orange-600 text-white rounded-tr-none' : 'bg-white text-slate-700 rounded-tl-none border border-slate-200/50'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoadingAi && <div className="text-[9px] font-black text-orange-500 animate-pulse ml-2">A escrever...</div>}
          </div>
          <div className="p-6 bg-white border-t border-slate-100 flex gap-2">
            <input className="flex-1 bg-slate-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-500" placeholder="Pergunte algo..." value={userInput} onChange={e => setUserInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSendMessage()} />
            <button onClick={handleSendMessage} className="bg-slate-900 text-white p-3 rounded-xl shadow-xl hover:bg-orange-600 transition-all"><Send size={18} /></button>
          </div>
        </div>
      </div>
      
      {!isAiChatOpen && (
        <button onClick={() => setIsAiChatOpen(true)} className="fixed bottom-6 right-6 sm:bottom-10 sm:right-10 bg-orange-500 text-white p-5 sm:p-6 rounded-[2rem] shadow-2xl hover:scale-110 active:scale-95 transition-all z-40 border-4 border-white">
          <MessageSquare size={32} />
        </button>
      )}

    </div>
  );
}
