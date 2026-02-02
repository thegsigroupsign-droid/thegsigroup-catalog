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
  const [currentProductImgIdx, setCurrentProductImgIdx] = useState(0); 
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const searchInputRef = useRef(null);

  // Estados Admin
  const [editSettings, setEditSettings] = useState(DEFAULT_SETTINGS);
  const [editingId, setEditingId] = useState(null);
  const [newProduct, setNewProduct] = useState({ 
    name: '', category: 'Digital marketing', price: '', description: '', images: ['', '', '', '', ''] 
  });
  const [newBanner, setNewBanner] = useState({ title: '', subtitle: '', image: '', active: true });
  const [newVideo, setNewVideo] = useState({ title: '', youtubeUrl: '', gallery: 'General' });
  
  // AI Chat State
  const [aiMessages, setAiMessages] = useState([]);
  const [isMobileCategoryMenuOpen, setIsMobileCategoryMenuOpen] = useState(false);

  // Atalho pesquisa (/)
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
          id: 'default', title: 'Make Your Brand Glow.', 
          subtitle: 'The most advanced vehicle wraps and visual signage in Florida.', 
          image: '', isDefault: true 
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

  // Ciclo Slides
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

  // --- ✅ LÓGICA DE CHAT COM REDIRECIONAMENTO CORRIGIDA ---
  const openAiChat = () => {
    setAiMessages([{
      role: 'assistant',
      text: `Welcome to ${siteSettings.companyName}! 🇺🇸\nWe're here to make your brand shine. Redirecting you to our team on WhatsApp for a personalized project consultation...`
    }]);
    setIsAiChatOpen(true);
  };

  useEffect(() => {
    if (isAiChatOpen) {
      const timer = setTimeout(() => {
        window.open(`https://wa.me/${siteSettings.whatsapp}?text=Hi! I would like to start a project with GSI Group.`, '_blank');
        setIsAiChatOpen(false);
        setAiMessages([]); // Limpa para a próxima vez
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isAiChatOpen, siteSettings.whatsapp]);

  // Handlers Admin
  const handleAddVideo = async (e) => {
    e.preventDefault();
    if (!db || isSaving || !user) return;
    setIsSaving(true);
    try {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = newVideo.youtubeUrl.match(regExp);
      const videoId = (match && match[2] && match[2].length === 11) ? match[2] : null;
      if (!videoId) throw new Error("YouTube URL inválida.");
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'videos'), { ...newVideo, videoId, createdAt: new Date().toISOString() });
      setNewVideo({ title: '', youtubeUrl: '', gallery: 'General' });
      setStatusMsg({ type: 'success', text: 'Vídeo adicionado!' });
    } catch (e) { setStatusMsg({ type: 'error', text: e.message }); }
    finally { setIsSaving(false); setTimeout(() => setStatusMsg({ type: '', text: '' }), 3000); }
  };

  const handleDeleteVideo = async (id) => {
    if (!db || !user || !window.confirm("Eliminar vídeo?")) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'videos', id));
  };

  const handleAddBanner = async (e) => {
    e.preventDefault();
    if (!db || isSaving || !user) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'banners'), { ...newBanner, createdAt: new Date().toISOString() });
      setNewBanner({ title: '', subtitle: '', image: '', active: true });
      setStatusMsg({ type: 'success', text: 'Banner adicionado!' });
    } catch (e) { setStatusMsg({ type: 'error', text: 'Erro ao guardar.' }); }
    finally { setIsSaving(false); setTimeout(() => setStatusMsg({ type: '', text: '' }), 3000); }
  };

  const handleDeleteBanner = async (id) => {
    if (!db || id === 'default' || !user || !window.confirm("Eliminar banner?")) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'banners', id));
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!db || isSaving || !user) return;
    const filteredImages = newProduct.images.filter(url => url.trim() !== '');
    if (filteredImages.length === 0) { setStatusMsg({ type: 'error', text: 'Adicione pelo menos uma imagem.' }); return; }
    setIsSaving(true);
    try {
      const productData = { ...newProduct, images: filteredImages, image: filteredImages[0], price: Number(newProduct.price) };
      if (editingId) {
        productData.updatedAt = new Date().toISOString();
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', editingId), productData);
        setEditingId(null);
      } else {
        productData.createdAt = new Date().toISOString();
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'products'), productData);
      }
      setNewProduct({ name: '', category: 'Digital marketing', price: '', description: '', images: ['', '', '', '', ''] });
      setStatusMsg({ type: 'success', text: 'Portfólio atualizado!' });
    } catch (err) { setStatusMsg({ type: 'error', text: 'Erro ao guardar.' }); }
    finally { setIsSaving(false); setTimeout(() => setStatusMsg({ type: '', text: '' }), 3000); }
  };

  const handleEditClick = (p) => {
    setEditingId(p.id);
    const existing = p.images || [p.image];
    setNewProduct({ ...p, images: [...existing, '', '', '', '', ''].slice(0, 5) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteProduct = async (id) => {
    if (!db || !user || !window.confirm("Eliminar este trabalho?")) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', id));
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!db || isSaving || !user) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'global'), editSettings);
      setStatusMsg({ type: 'success', text: 'Definições guardadas!' });
    } catch (err) { setStatusMsg({ type: 'error', text: 'Erro ao guardar.' }); }
    finally { setIsSaving(false); setTimeout(() => setStatusMsg({ type: '', text: '' }), 3000); }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAdminMode(true); setIsPasswordModalOpen(false); setPasswordInput("");
    } else { setPasswordError(true); setTimeout(() => setPasswordError(false), 2000); }
  };

  const handleShare = (p) => {
    const url = window.location.href;
    if (navigator.share) { navigator.share({ title: p.name, url }); }
    else {
      const el = document.createElement('textarea'); el.value = url; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el);
      setStatusMsg({ type: 'success', text: 'Link copiado!' }); setTimeout(() => setStatusMsg({ type: '', text: '' }), 2000);
    }
  };

  const filteredProducts = useMemo(() => {
    let res = products.filter(p => (filter === "All" || p.category === filter) && p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    return res.sort((a, b) => sortBy === "price-low" ? Number(a.price) - Number(b.price) : sortBy === "price-high" ? Number(b.price) - Number(a.price) : new Date(b.createdAt) - new Date(a.createdAt));
  }, [products, filter, searchTerm, sortBy]);

  const stats = useMemo(() => ({
    total: products.length,
    avgPrice: products.length ? Math.round(products.reduce((acc, p) => acc + Number(p.price), 0) / products.length) : 0,
  }), [products]);

  const nextProdImg = () => { if (!selectedProduct?.images) return; setCurrentProductImgIdx(prev => (prev + 1) % selectedProduct.images.length); };
  const prevProdImg = () => { if (!selectedProduct?.images) return; setCurrentProductImgIdx(prev => (prev - 1 + selectedProduct.images.length) % selectedProduct.images.length); };

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
          <input ref={searchInputRef} type="text" placeholder="Search... (Atalho '/')" className="w-full bg-slate-100/50 border border-slate-200 py-2.5 pl-11 pr-4 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all font-medium" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <button onClick={() => isAdminMode ? setIsAdminMode(false) : setIsPasswordModalOpen(true)} className={`p-2.5 rounded-2xl transition-all ${isAdminMode ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-100'}`}><LayoutDashboard className="w-5 h-5" /></button>
          <button onClick={() => window.open(`https://wa.me/${siteSettings?.whatsapp}`, '_blank')} className="bg-slate-900 text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-sm font-bold shadow-xl uppercase tracking-widest">Contact</button>
        </div>
      </header>

      {/* MOBILE SEARCH */}
      <div className="md:hidden px-4 pt-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search catalog..." className="w-full bg-white border border-slate-200 py-3 pl-11 pr-4 rounded-xl text-sm outline-none shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
        
        {/* DASHBOARD ADMIN COMPLETO */}
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

            {/* --- ✅ RESTAURAÇÃO: GESTÃO DE BANNERS --- */}
            <div className="bg-slate-900 rounded-[2.5rem] p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl"></div>
              <h2 className="text-xl font-bold mb-6 flex items-center gap-3 text-orange-500 uppercase italic tracking-tighter relative z-10"><ImageIcon className="w-5 h-5" /> Homepage Slideshow (Banners)</h2>
              <form onSubmit={handleAddBanner} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 relative z-10">
                <input placeholder="Título do Slide" className="p-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white focus:border-orange-500 outline-none" value={newBanner.title} onChange={e => setNewBanner({...newBanner, title: e.target.value})} required />
                <input placeholder="Link da Imagem (Fundo)" className="p-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white focus:border-orange-500 outline-none" value={newBanner.image} onChange={e => setNewBanner({...newBanner, image: e.target.value})} />
                <textarea placeholder="Subtítulo do Slide" className="md:col-span-2 p-4 bg-white/5 border border-white/10 rounded-2xl text-sm h-20 text-white focus:border-orange-500 outline-none" value={newBanner.subtitle} onChange={e => setNewBanner({...newBanner, subtitle: e.target.value})} required />
                <button type="submit" disabled={isSaving} className="md:col-span-2 bg-orange-600 p-4 rounded-2xl font-black uppercase text-xs hover:bg-orange-500 transition-all shadow-lg">Criar Novo Slide</button>
              </form>
              <div className="space-y-2 relative z-10">
                {banners.map(b => (
                  <div key={b.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 group">
                    <div className="flex items-center gap-4">
                      {b.image && <img src={b.image} className="w-12 h-12 rounded-lg object-cover" />}
                      <div className="text-left"><p className="font-bold text-sm">{b.title}</p><p className="text-[10px] opacity-40">{b.subtitle.substring(0, 50)}...</p></div>
                    </div>
                    {!b.isDefault && <button onClick={() => handleDeleteBanner(b.id)} className="text-white/20 hover:text-red-500 transition-colors p-2"><Trash2 size={18} /></button>}
                  </div>
                ))}
              </div>
            </div>

            {/* --- ✅ RESTAURAÇÃO: DEFINIÇÕES GLOBAIS --- */}
            <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-100">
               <h2 className="text-xl font-bold mb-6 flex items-center gap-3 text-slate-900 uppercase italic tracking-tighter"><Settings className="w-5 h-5" /> Site Branding & Contact</h2>
              <form onSubmit={handleSaveSettings} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1"><p className="text-[9px] font-bold text-slate-400 uppercase ml-2 text-left">Company Name</p><input className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none" value={editSettings.companyName} onChange={e => setEditSettings({...editSettings, companyName: e.target.value})} /></div>
                <div className="space-y-1"><p className="text-[9px] font-bold text-slate-400 uppercase ml-2 text-left">WhatsApp (Numbers only)</p><input className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none" value={editSettings.whatsapp} onChange={e => setEditSettings({...editSettings, whatsapp: e.target.value})} /></div>
                <div className="space-y-1"><p className="text-[9px] font-bold text-slate-400 uppercase ml-2 text-left">Business Address</p><input className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none" value={editSettings.address} onChange={e => setEditSettings({...editSettings, address: e.target.value})} /></div>
                <div className="space-y-1"><p className="text-[9px] font-bold text-slate-400 uppercase ml-2 text-left">Badge Text (Quality Stamp)</p><input className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none" value={editSettings.badgeText} onChange={e => setEditSettings({...editSettings, badgeText: e.target.value})} /></div>
                <button type="submit" disabled={isSaving} className="md:col-span-2 bg-slate-900 text-white p-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all shadow-xl">Guardar Definições Globais</button>
              </form>
            </div>

            {/* Produto Admin */}
            <div className={`bg-white border-2 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl transition-all ${editingId ? 'border-blue-500' : 'border-orange-100'}`}>
              <h2 className={`text-xl font-black italic uppercase tracking-tighter mb-8 flex items-center gap-2 ${editingId ? 'text-blue-600' : 'text-orange-600'}`}>{editingId ? <Pencil className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />} {editingId ? "Editar" : "Novo Trabalho"}</h2>
              <form onSubmit={handleAddProduct} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <input placeholder="Título" className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} required />
                  <select className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none cursor-pointer" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})}>
                    {CATEGORIES.filter(c => c !== "All").map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input placeholder="Preço" type="number" className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} required />
                </div>
                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {newProduct.images.map((url, idx) => (
                    <input key={idx} placeholder={`Link Foto ${idx + 1}`} className="w-full p-4 bg-white border border-slate-100 rounded-2xl text-sm outline-none" value={url} onChange={e => { const ni = [...newProduct.images]; ni[idx] = e.target.value; setNewProduct({...newProduct, images: ni}); }} />
                  ))}
                </div>
                <textarea placeholder="Descrição" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl h-24 text-sm outline-none" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} required />
                <button type="submit" className={`w-full py-4 rounded-[1.5rem] font-black uppercase text-xs text-white shadow-xl transition-all ${editingId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-900 hover:bg-black'}`}>Guardar</button>
              </form>
            </div>
          </div>
        )}

        {/* HERO SLIDESHOW */}
        {!isAdminMode && (
          <div className="mb-10 relative h-[300px] sm:h-[550px] rounded-[2rem] sm:rounded-[3.5rem] overflow-hidden shadow-2xl">
            {banners.map((slide, index) => (
              <div key={slide.id} className={`absolute inset-0 transition-all duration-1000 transform flex items-center px-6 sm:px-14 ${index === currentSlide ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} style={{ backgroundColor: slide.image ? 'transparent' : siteSettings?.primaryColor, backgroundImage: slide.image ? `url(${slide.image})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                {slide.image && <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"></div>}
                <div className="relative z-10 max-w-2xl text-left text-white animate-in slide-in-from-bottom-6">
                  <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4 backdrop-blur-md border border-white/10">
                    <Award className="w-3 h-3"/> {siteSettings?.badgeText}
                  </div>
                  <h2 className="text-2xl sm:text-7xl font-black mb-4 uppercase leading-[1]"> {slide.title} </h2>
                  <p className="text-white/90 mb-6 text-xs sm:text-xl font-medium max-w-md">{slide.subtitle}</p>
                  <button onClick={openAiChat} className="bg-white text-slate-900 px-6 sm:px-10 py-3 sm:py-4 rounded-full font-black uppercase text-[10px] sm:text-xs shadow-xl hover:scale-105 transition-all">Start Project</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* VIDEOS */}
        {!isAdminMode && videos.length > 0 && filter === "All" && (
          <div className="mb-16 text-left">
            <h2 className="text-2xl font-black italic uppercase mb-8 flex items-center gap-3"><PlayCircle className="text-red-600" /> Video Portfolio</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {videos.map(v => (
                <div key={v.id} className="bg-white rounded-[2rem] p-4 shadow-sm border border-slate-100">
                  <div className="aspect-video rounded-2xl overflow-hidden mb-4 bg-slate-900 shadow-inner"><iframe className="w-full h-full" src={`https://www.youtube.com/embed/${v.videoId}`} title={v.title} frameBorder="0" allowFullScreen></iframe></div>
                  <span className="text-[8px] font-black text-red-600 uppercase mb-1 block">{v.gallery || 'General'}</span>
                  <h3 className="font-bold text-slate-800 uppercase truncate">{v.title}</h3>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CATEGORIES MOBILE SELETOR */}
        <div className="flex flex-col gap-6 mb-12">
          <div className="hidden sm:flex flex-wrap justify-center gap-2">
            {CATEGORIES.map(cat => <button key={cat} onClick={() => setFilter(cat)} className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider border transition-all ${filter === cat ? "bg-slate-900 text-white border-slate-900 scale-105 shadow-md" : "bg-white text-slate-500 hover:border-orange-500"}`}>{cat}</button>)}
          </div>
          <div className="sm:hidden relative">
            <button onClick={() => setIsMobileCategoryMenuOpen(!isMobileCategoryMenuOpen)} className="w-full bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-between font-black text-[12px] uppercase shadow-sm">
              <div className="flex items-center gap-3"><Filter className="w-4 h-4 text-orange-500" /> Categoria: <span className="text-orange-600">{filter}</span></div>
              <ChevronDown className={`w-5 h-5 transition-transform ${isMobileCategoryMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {isMobileCategoryMenuOpen && (
              <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-slate-100 rounded-[1.5rem] shadow-2xl z-50 py-3">
                {CATEGORIES.map(cat => <button key={cat} onClick={() => { setFilter(cat); setIsMobileCategoryMenuOpen(false); }} className={`w-full text-left px-6 py-4 text-[11px] font-black uppercase ${filter === cat ? 'bg-orange-50 text-orange-600' : 'text-slate-500'}`}>{cat}</button>)}
              </div>
            )}
          </div>
        </div>

        {/* PORTFOLIO GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 text-left">
          {filteredProducts.map(product => (
            <div key={product.id} className="group bg-white rounded-[2.5rem] border border-slate-100 p-4 hover:shadow-2xl transition-all flex flex-col shadow-sm">
              <div className="aspect-square rounded-[2rem] overflow-hidden bg-slate-50 mb-6 relative">
                <img src={product.images ? product.images[0] : product.image} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700" alt={product.name} />
                <div className="absolute top-4 left-4 bg-orange-600 text-white text-[8px] font-black px-3 py-1.5 rounded-lg shadow-lg uppercase">{siteSettings?.badgeText}</div>
                <button onClick={() => handleShare(product)} className="absolute top-4 right-4 bg-white/20 backdrop-blur-md text-white p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all"><Share2 size={16} /></button>
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-4 uppercase line-clamp-1 tracking-tighter">{product.name}</h3>
              <div className="flex justify-between items-center mt-auto pt-5 border-t border-slate-50">
                <div className="flex flex-col"><span className="text-[9px] text-slate-400 font-bold uppercase leading-none">A partir de</span><span className="text-xl font-black text-slate-900">${Number(product.price).toLocaleString()}</span></div>
                <button onClick={() => { setSelectedProduct(product); setCurrentProductImgIdx(0); }} className="bg-slate-900 text-white p-3 rounded-xl hover:bg-orange-600 shadow-md"><Maximize size={18} /></button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-white py-12 px-4 text-center mt-20 border-t border-white/5">
        <h2 className="text-2xl font-black uppercase mb-8 tracking-tighter italic">THE <span style={{ color: siteSettings?.primaryColor }}>GSI</span> GROUP</h2>
        <div className="flex flex-col sm:flex-row justify-center gap-8 text-[10px] font-black uppercase text-slate-500">
          <div className="flex items-center justify-center gap-2"><MapPin size={14} className="text-orange-500 shrink-0" /> {siteSettings?.address}</div>
          <div className="flex items-center justify-center gap-2"><Phone size={14} className="text-orange-500 shrink-0" /> +1 {siteSettings?.whatsapp}</div>
        </div>
      </footer>

      {/* MODAL: LOGIN ADMIN */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-xl animate-in fade-in">
          <div className="bg-white rounded-[3rem] p-10 max-w-sm w-full text-center space-y-6 shadow-2xl">
            <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto"><Lock className="text-orange-600" size={40} /></div>
            <h2 className="text-2xl font-black uppercase tracking-tighter">Admin Access</h2>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <input type="password" placeholder="••••••••" className={`w-full p-5 bg-slate-50 border-2 rounded-2xl text-center text-xl font-bold outline-none ${passwordError ? 'border-red-500 animate-shake' : 'border-slate-100'}`} value={passwordInput} onChange={e => setPasswordInput(e.target.value)} autoFocus />
              <button type="submit" className="w-full p-4 bg-orange-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Unlock Dashboard</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DETALHES DO PRODUTO */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-2 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] max-w-6xl w-full flex flex-col lg:flex-row overflow-hidden shadow-2xl my-auto animate-in zoom-in duration-300 max-h-[95vh]">
            <div className="lg:w-3/5 h-[300px] sm:h-[500px] lg:h-auto relative bg-black shrink-0 group">
              <div className="w-full h-full flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${currentProductImgIdx * 100}%)` }}>
                {(selectedProduct.images || [selectedProduct.image]).map((img, i) => (
                  <img key={i} src={img} className="w-full h-full object-contain shrink-0" alt="Work detail" />
                ))}
              </div>
              {(selectedProduct.images?.length > 1) && (
                <>
                  <button onClick={prevProdImg} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-3 rounded-full backdrop-blur-md transition-all"><ChevronLeft size={24} /></button>
                  <button onClick={nextProdImg} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-3 rounded-full backdrop-blur-md transition-all"><ChevronRight size={24} /></button>
                </>
              )}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                {(selectedProduct.images || [selectedProduct.image]).map((_, i) => (
                  <button key={i} onClick={() => setCurrentProductImgIdx(i)} className={`h-1.5 rounded-full transition-all ${i === currentProductImgIdx ? 'w-8 bg-white' : 'w-2 bg-white/40'}`} />
                ))}
              </div>
              <button onClick={() => setSelectedProduct(null)} className="absolute top-6 left-6 bg-black/40 text-white p-2 rounded-full lg:hidden shadow-lg"><X size={24} /></button>
            </div>

            <div className="lg:w-2/5 p-8 sm:p-14 flex flex-col justify-center relative bg-white overflow-y-auto">
              <button onClick={() => setSelectedProduct(null)} className="hidden lg:block absolute top-8 right-8 text-slate-300 hover:text-slate-900 transition-all"><X size={32} /></button>
              <span className="text-orange-600 font-black text-[10px] uppercase bg-orange-50 px-5 py-2.5 rounded-xl w-fit mb-4">{selectedProduct.category}</span>
              <h2 className="text-3xl sm:text-5xl font-black text-slate-900 mb-8 uppercase tracking-tighter leading-tight">{selectedProduct.name}</h2>
              <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 mb-10 shadow-inner max-h-[150px] overflow-y-auto no-scrollbar">
                <p className="text-slate-600 text-lg italic leading-relaxed">"{selectedProduct.description}"</p>
              </div>
              <div className="flex items-center justify-between gap-6 pt-6 border-t border-slate-100 mt-auto">
                <span className="text-4xl font-black text-slate-900">${Number(selectedProduct.price).toLocaleString()}</span>
                <button onClick={() => window.open(`https://wa.me/${siteSettings?.whatsapp}?text=Saw ${selectedProduct.name} and want a quote.`)} className="flex-1 bg-orange-600 text-white py-5 rounded-[2rem] font-black uppercase text-xs shadow-xl flex items-center justify-center gap-3 hover:bg-orange-700 transition-all">Request Quote <ExternalLink size={18} /></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- ✅ MODAL DE CHAT COM REDIRECIONAMENTO --- */}
      <div className={`fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm transition-all transform ${isAiChatOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}`}>
        <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-[420px] overflow-hidden text-left animate-in zoom-in-95">
          <div className="bg-slate-900 p-8 text-white flex justify-between items-center relative">
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg"><MessageSquare size={28} /></div>
              <div className="leading-tight"><h4 className="font-black uppercase tracking-tight text-white">GSI Assistant</h4><p className="text-[10px] text-orange-400 font-bold uppercase tracking-widest">Instant Redirect</p></div>
            </div>
            <button onClick={() => setIsAiChatOpen(false)} className="relative z-10 text-white/40 hover:text-white transition-colors"><X size={28} /></button>
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/20 rounded-full blur-3xl"></div>
          </div>
          <div className="p-10 space-y-6 bg-white text-center">
            {aiMessages.map((msg, i) => (
              <div key={i} className="text-slate-700 text-sm sm:text-lg leading-relaxed font-medium">
                {msg.text.split('\n').map((line, j) => <p key={j}>{line}</p>)}
              </div>
            ))}
            <div className="pt-4 flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-orange-500" size={40} />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Launching WhatsApp...</p>
            </div>
          </div>
        </div>
      </div>
      
      {!isAiChatOpen && (
        <button onClick={openAiChat} className="fixed bottom-6 right-6 sm:bottom-10 sm:right-10 bg-orange-500 text-white p-5 sm:p-6 rounded-[2.2rem] shadow-[0_20px_50px_rgba(243,111,33,0.4)] hover:scale-110 active:scale-95 transition-all z-40 border-4 border-white">
          <MessageSquare size={32} />
        </button>
      )}

    </div>
  );
}
