import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, ShoppingCart, ChevronRight, Filter, MessageSquare, X, Send,
  Info, Package, Star, Zap, Plus, Trash2, Settings, Image as ImageIcon,
  ExternalLink, PenTool, Layers, Printer, Truck, Maximize,
  LayoutDashboard, PlusCircle, Lock, ShieldCheck
} from 'lucide-react';

// Importações do Firebase
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, doc, onSnapshot, addDoc, deleteDoc, query } from 'firebase/firestore';

// --- CONFIGURAÇÕES DA MARCA THE GSI GROUP ---
const COMPANY_NAME = "The GSI Group";
const COMPANY_TAGLINE = "Sinalização e Comunicação Visual";
const PRIMARY_COLOR = "#F36F21"; 
const WHATSAPP_NUMBER = "17860000000"; 
const ADMIN_PASSWORD = "GSI_FLORIDA_2026"; // Senha oficial do Dashboard

// Categorias oficiais do menu e do formulário
const CATEGORIES = ["Todos", "Car Wrap", "Letreiros Luminosos", "Window Graphics", "Wall Graphics", "Laser/CNC", "Outdoor Signs", "Design Gráfico"];

// --- INICIALIZAÇÃO DO FIREBASE (Regras 1, 2, 3) ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'the-gsi-group-prod';

export default function App() {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [filter, setFilter] = useState("Todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  
  // Estados de Segurança
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  
  // Estado do Formulário
  const [newProduct, setNewProduct] = useState({ name: '', category: 'Car Wrap', price: '', description: '', image: '' });
  
  // Estado do Chat
  const [aiMessages, setAiMessages] = useState([{ role: 'assistant', text: `Olá! Bem-vindo à ${COMPANY_NAME}. Como posso ajudar no seu projeto hoje?` }]);
  const [userInput, setUserInput] = useState("");
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  // Regra 3: Autenticação obrigatória antes de consultas
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) { console.error("Erro Auth:", err); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // Regra 1: Sincronização em tempo real (Paths estritos)
  useEffect(() => {
    if (!user) return;
    const productsRef = collection(db, 'artifacts', appId, 'public', 'data', 'products');
    const unsubscribe = onSnapshot(productsRef, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(docs);
    }, (error) => console.error("Erro Firestore:", error));
    return () => unsubscribe();
  }, [user]);

  // Regra 2: Filtragem em memória
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCategory = filter === "Todos" || p.category === filter;
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, filter, searchTerm]);// Handlers de Segurança e Admin
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

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!user || !isAdminMode) return;
    try {
      const productsRef = collection(db, 'artifacts', appId, 'public', 'data', 'products');
      await addDoc(productsRef, { ...newProduct, price: Number(newProduct.price), rating: 5 });
      setNewProduct({ ...newProduct, name: '', price: '', description: '', image: '' });
    } catch (err) { console.error("Erro ao adicionar:", err); }
  };

  const handleDeleteProduct = async (id) => {
    if (!user || !isAdminMode) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', id));
    } catch (err) { console.error("Erro ao apagar:", err); }
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || isLoadingAi) return;
    const userMsg = { role: 'user', text: userInput };
    setAiMessages(prev => [...prev, userMsg]);
    setUserInput("");
    setIsLoadingAi(true);
    const apiKey = ""; 
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: userInput }] }], systemInstruction: { parts: [{ text: `És um consultor especialista da ${COMPANY_NAME} na Flórida.` }] } })
      });
      const data = await response.json();
      setAiMessages(prev => [...prev, { role: 'assistant', text: data?.candidates?.[0]?.content?.parts?.[0]?.text || "Como posso ajudar?" }]);
    } catch (error) { setAiMessages(prev => [...prev, { role: 'assistant', text: "Erro na conexão IA." }]); } finally { setIsLoadingAi(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-orange-100">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 h-20 flex justify-between items-center px-4 sm:px-8 shadow-sm">
        <div className="flex flex-col cursor-pointer" onClick={() => setFilter("Todos")}>
          <h1 className="text-2xl font-black italic tracking-tighter leading-none uppercase">THE <span style={{ color: PRIMARY_COLOR }}>GSI</span> GROUP</h1>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{COMPANY_TAGLINE}</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={handleAdminToggle} className={`p-3 rounded-2xl transition-all ${isAdminMode ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-100'}`}><LayoutDashboard className="w-5 h-5" /></button>
          <button className="bg-slate-900 text-white px-6 py-2.5 rounded-2xl text-sm font-bold shadow-lg">Contato</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-10">
        {isAdminMode && (
          <div className="mb-16 space-y-8 animate-in slide-in-from-top duration-500">
            <div className="bg-white border-2 border-orange-100 rounded-[3rem] p-8 shadow-2xl">
              <h2 className="text-2xl font-bold mb-8 flex items-center gap-3 italic"><PlusCircle className="text-orange-500" /> Adicionar Projeto</h2>
              <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <input placeholder="Nome do Trabalho" className="p-4 bg-slate-50 border rounded-2xl outline-orange-500" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} required />
                <select className="p-4 bg-slate-50 border rounded-2xl outline-orange-500 appearance-none" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})}>
                  {CATEGORIES.filter(c => c !== "Todos").map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input placeholder="Preço ($)" type="number" className="p-4 bg-slate-50 border rounded-2xl outline-orange-500" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} required />
                <input placeholder="Link Direto da Imagem (PostImages.org)" className="md:col-span-3 p-4 bg-slate-50 border rounded-2xl outline-orange-500" value={newProduct.image} onChange={e => setNewProduct({...newProduct, image: e.target.value})} required />
                <textarea placeholder="Descrição para o catálogo..." className="md:col-span-3 p-4 bg-slate-50 border rounded-2xl outline-orange-500 h-28" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} required />
                <button type="submit" className="md:col-span-3 bg-orange-600 text-white font-black py-5 rounded-[2rem] shadow-xl active:scale-95 transition-all">Publicar Agora</button>
              </form>
            </div>
            <div className="bg-slate-900 rounded-[3rem] p-8 text-white shadow-2xl">
              <h3 className="text-xl font-bold mb-6 text-orange-500 italic"><Layers className="inline w-5 h-5 mr-2"/> Inventário Online ({products.length})</h3>
              <div className="max-h-[300px] overflow-y-auto no-scrollbar pr-2">
                <table className="w-full text-left">
                  <tbody className="divide-y divide-white/5">
                    {products.map(p => (
                      <tr key={p.id} className="group hover:bg-white/5">
                        <td className="py-4 px-4 font-bold text-sm">{p.name}</td>
                        <td className="py-4 px-4 text-xs text-slate-400 uppercase tracking-widest">{p.category}</td>
                        <td className="py-4 px-4 text-right"><button onClick={() => handleDeleteProduct(p.id)} className="text-slate-600 hover:text-red-500 p-2"><Trash2 className="w-5 h-5" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {!isAdminMode && (
          <div className="mb-12 bg-[#F36F21] rounded-[3rem] p-10 text-white relative overflow-hidden flex flex-col md:flex-row items-center justify-between shadow-2xl">
            <div className="relative z-10 max-w-xl">
              <h2 className="text-4xl md:text-5xl font-black mb-4 leading-none uppercase tracking-tight text-white">Destaque-se <br/><span className="text-neutral-900 underline decoration-4 underline-offset-8">na Flórida.</span></h2>
              <p className="text-orange-50 mb-8 text-lg font-medium opacity-90 leading-relaxed">Sinalização de alto impacto e envelopamento profissional para o seu negócio.</p>
              <button onClick={() => setIsAiChatOpen(true)} className="bg-neutral-900 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-black transition-all shadow-xl"><MessageSquare className="w-5 h-5" /> Consultor IA</button>
            </div>
            <PenTool className="w-72 h-72 text-white/10 absolute -right-10 -bottom-10 rotate-12" />
          </div>
        )}

        <div className="flex gap-3 overflow-x-auto pb-10 no-scrollbar scroll-smooth">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)} className={`px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap shadow-sm ${filter === cat ? "bg-slate-900 text-white shadow-xl" : "bg-white text-slate-500 border border-slate-200 hover:border-orange-500"}`}>{cat}</button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredProducts.map(product => (
            <div key={product.id} className="group bg-white rounded-[3.5rem] border border-slate-100 p-4 hover:shadow-2xl transition-all duration-500 flex flex-col relative">
              <div className="aspect-square rounded-[2.5rem] overflow-hidden bg-slate-50 mb-6 relative shadow-inner"><img src={product.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt={product.name} /></div>
              <div className="flex-1 px-2 flex flex-col">
                <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-1">{product.category}</span>
                <h3 className="font-bold text-slate-900 text-xl mb-3 group-hover:text-orange-600 transition-colors leading-tight">{product.name}</h3>
                <div className="flex justify-between items-center mt-auto pt-6 border-t border-slate-50">
                  <span className="text-2xl font-black text-slate-900">${product.price}</span>
                  <button onClick={() => setSelectedProduct(product)} className="bg-slate-900 text-white p-4 rounded-[1.5rem] shadow-lg active:scale-90 transition-all"><Maximize className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl animate-in fade-in">
          <div className="bg-white rounded-[3rem] p-10 max-w-sm w-full shadow-2xl text-center space-y-6">
            <Lock className="w-12 h-12 text-orange-600 mx-auto" />
            <h2 className="text-2xl font-black italic uppercase leading-none">Admin Access</h2>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <input type="password" placeholder="SENHA" className={`w-full p-6 bg-slate-50 border-2 rounded-2xl text-center text-xl font-bold outline-none ${passwordError ? 'border-red-500 bg-red-50' : 'border-slate-100'}`} value={passwordInput} onChange={e => setPasswordInput(e.target.value)} autoFocus />
              <button type="submit" className="w-full p-5 bg-orange-600 text-white rounded-2xl font-black shadow-lg hover:bg-orange-700 transition-all">Desbloquear</button>
            </form>
          </div>
        </div>
      )}

      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-white rounded-[4rem] max-w-5xl w-full flex flex-col md:flex-row overflow-hidden shadow-2xl my-auto animate-in zoom-in duration-300">
            <div className="md:w-1/2 h-[400px] md:h-auto relative bg-slate-100 shadow-inner"><img src={selectedProduct.image} className="w-full h-full object-cover" alt={selectedProduct.name} /></div>
            <div className="md:w-1/2 p-10 md:p-16 flex flex-col justify-center relative">
              <button onClick={() => setSelectedProduct(null)} className="absolute top-8 right-8 text-slate-300 hover:text-slate-900 transition-colors"><X className="w-8 h-8" /></button>
              <div>
                <span className="text-orange-600 font-black text-xs uppercase tracking-widest">{selectedProduct.category}</span>
                <h2 className="text-5xl font-black text-slate-900 mt-6 mb-10 leading-tight">{selectedProduct.name}</h2>
                <p className="text-slate-600 mb-10 leading-relaxed text-lg">{selectedProduct.description}</p>
                <div className="flex flex-col sm:flex-row justify-between items-center gap-6 pt-10 border-t border-slate-100 mt-auto">
                  <span className="text-4xl font-black text-slate-900">${Number(selectedProduct.price).toLocaleString()}</span>
                  <button onClick={() => window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=Quero um orçamento para ${selectedProduct.name}`)} className="bg-orange-600 text-white px-14 py-6 rounded-[2.5rem] font-black shadow-xl flex items-center gap-4">Orçamento <ExternalLink className="w-5 h-5" /></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`fixed bottom-8 right-8 z-50 transition-all transform ${isAiChatOpen ? 'scale-100 translate-y-0' : 'scale-0 translate-y-20 pointer-events-none'}`}>
        <div className="bg-white rounded-[3.5rem] shadow-2xl w-[360px] sm:w-[420px] h-[650px] flex flex-col border border-slate-100 overflow-hidden">
          <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
            <div className="flex items-center gap-4"><div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg"><MessageSquare className="w-6 h-6 text-white" /></div><h4 className="font-bold text-sm tracking-wide text-white">Assistente IA</h4></div>
            <button onClick={() => setIsAiChatOpen(false)}><X className="w-5 h-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/50 no-scrollbar">
            {aiMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] p-5 rounded-[2rem] text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-orange-600 text-white rounded-tr-none' : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'}`}>{msg.text}</div></div>
            ))}
          </div>
          <div className="p-6 bg-white border-t border-slate-100 flex gap-3">
            <input className="flex-1 bg-slate-100 rounded-2xl px-6 py-4 text-sm outline-none focus:ring-2 focus:ring-orange-500" placeholder="Pergunte aqui..." value={userInput} onChange={e => setUserInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSendMessage()} />
            <button onClick={handleSendMessage} className="bg-slate-900 text-white p-4 rounded-2xl shadow-xl hover:bg-orange-600 transition-all"><Send className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
      {!isAiChatOpen && <button onClick={() => setIsAiChatOpen(true)} className="fixed bottom-10 right-10 bg-orange-500 text-white p-6 rounded-[2.5rem] shadow-2xl hover:scale-110 active:scale-95 transition-all z-40 group shadow-orange-500/40"><MessageSquare className="w-8 h-8" /></button>}
      <footer className="bg-slate-900 text-white py-16 mt-20 text-center border-t border-white/5"><h2 className="text-2xl font-black italic uppercase tracking-tighter mb-4">THE <span className="text-orange-500">GSI</span> GROUP</h2><p className="text-slate-500 text-[10px] uppercase tracking-[0.4em]">© 2026 THE GSI GROUP • FLORIDA • USA</p></footer>
    </div>
  );
}
