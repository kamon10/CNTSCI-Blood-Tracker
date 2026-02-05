
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { DistributionData, CNTSCI_CENTERS, CENTER_STRUCTURES_MAP, PRODUCT_TYPES, BLOOD_GROUPS, User } from './types.ts';
import InputGroup from './components/InputGroup.tsx';
import HistoryList from './components/HistoryList.tsx';
import ScriptInstruction from './components/ScriptInstruction.tsx';
import RecapView from './components/RecapView.tsx';
import CenterRecapView from './components/CenterRecapView.tsx';
import { analyzeDistribution } from './services/geminiService.ts';

// NOUVELLE URL DÉFINITIVE FOURNIE
const DEFAULT_URL = "https://script.google.com/macros/s/AKfycbwmJkITojb2tBgE5O2d-HaA__-y9wdtQO57XI0cl_A7kqRdn-5jnmhDwJezMwc-4e9oSQ/exec";

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'form' | 'recap' | 'center'>('recap');
  const [isSyncing, setIsSyncing] = useState(false);
  const isFetchingRef = useRef(false);
  
  // CHARGEMENT DE L'URL MÉMORISÉE (Priorité à l'URL fournie si le localStorage est vide ou ancien)
  const [scriptUrl, setScriptUrl] = useState<string>(() => {
    const saved = localStorage.getItem('cntsci_script_url_v15');
    return saved || DEFAULT_URL;
  });
  
  const [showSettings, setShowSettings] = useState(false);
  
  // Authentification
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('cntsci_user_session');
    return saved ? JSON.parse(saved) : null;
  });
  const [loginData, setLoginData] = useState({ login: '', motDePasse: '' });
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [formData, setFormData] = useState<any>({
    nomAgent: currentUser?.nomAgent || '',
    dateDistribution: new Date().toISOString().split('T')[0],
    centreCntsci: currentUser?.centreAffectation || CNTSCI_CENTERS[0],
    nomStructuresSanitaire: '',
    typeProduit: PRODUCT_TYPES[0],
    saGroupe: BLOOD_GROUPS[0],
    nbPoches: '',
  });

  const [records, setRecords] = useState<DistributionData[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [showToast, setShowToast] = useState<'success' | 'error' | 'sync' | 'auth_error' | 'url_saved' | 'auto_login' | null>(null);

  useEffect(() => {
    if (currentUser) {
      setFormData(prev => ({
        ...prev,
        nomAgent: currentUser.nomAgent,
        centreCntsci: currentUser.centreAffectation
      }));
    }
  }, [currentUser]);

  const structureSuggestions = useMemo(() => {
    return CENTER_STRUCTURES_MAP[formData.centreCntsci] || [];
  }, [formData.centreCntsci]);

  // FONCTION DE SYNCHRONISATION ET AUTO-LOGIN
  const fetchRecordsAndAutoLogin = useCallback(async (showNotification = false) => {
    if (!scriptUrl || !scriptUrl.startsWith('http')) return;
    if (isFetchingRef.current) return;
    
    isFetchingRef.current = true;
    setIsSyncing(true);
    if (showNotification) setShowToast('sync');
    
    const cleanUrl = scriptUrl.trim();
    
    try {
      // 1. Récupérer les distributions
      const distResponse = await fetch(`${cleanUrl}?action=get_dist&_t=${Date.now()}`);
      if (distResponse.ok) {
        const data = await distResponse.json();
        if (Array.isArray(data)) setRecords(data);
      }

      // 2. Si non connecté, tenter un auto-login avec le premier utilisateur du Sheet
      if (!localStorage.getItem('cntsci_user_session')) {
        const userResponse = await fetch(`${cleanUrl}?action=get_users&_t=${Date.now()}`);
        if (userResponse.ok) {
          const users: User[] = await userResponse.json();
          if (users && users.length > 0) {
            const firstUser = users[0];
            setCurrentUser(firstUser);
            localStorage.setItem('cntsci_user_session', JSON.stringify(firstUser));
            setShowToast('auto_login');
          }
        }
      }
    } catch (e) {
      console.error("Erreur de connexion au Sheet:", e);
      if (showNotification) setShowToast('error');
    } finally {
      setIsSyncing(false);
      isFetchingRef.current = false;
      setTimeout(() => setShowToast(null), 3000);
    }
  }, [scriptUrl]);

  useEffect(() => {
    fetchRecordsAndAutoLogin();
  }, [fetchRecordsAndAutoLogin]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      const resp = await fetch(`${scriptUrl.trim()}?action=get_users&_t=${Date.now()}`);
      if (!resp.ok) throw new Error("Network Error");
      
      const users: User[] = await resp.json();
      const found = users.find(u => 
        String(u.login).trim().toLowerCase() === loginData.login.trim().toLowerCase() && 
        String(u.motDePasse).trim() === loginData.motDePasse.trim()
      );
      
      if (found) {
        setCurrentUser(found);
        localStorage.setItem('cntsci_user_session', JSON.stringify(found));
        setShowToast('success');
        setActiveTab('form');
      } else {
        setShowToast('auth_error');
      }
    } catch (err) {
      console.error("Login error:", err);
      setShowToast('error');
    } finally {
      setIsLoggingIn(false);
      setTimeout(() => setShowToast(null), 3000);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('cntsci_user_session');
    setLoginData({ login: '', motDePasse: '' });
    setActiveTab('recap');
  };

  const saveUrl = () => {
    const cleanUrl = scriptUrl.trim();
    localStorage.setItem('cntsci_script_url_v15', cleanUrl);
    setShowToast('url_saved');
    fetchRecordsAndAutoLogin(true);
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'nbPoches' ? (value === '' ? '' : Math.max(0, parseInt(value) || 0)) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const now = new Date();
    const finalData = {
      horodateur: now.toLocaleString('fr-FR'),
      nomAgent: formData.nomAgent,
      dateDistribution: formData.dateDistribution,
      centreCntsci: formData.centreCntsci,
      nomStructuresSanitaire: formData.nomStructuresSanitaire,
      typeProduit: formData.typeProduit,
      saGroupe: formData.saGroupe,
      nbPoches: formData.nbPoches || 0,
    };

    const params = new URLSearchParams();
    params.append('action', 'post_dist');
    Object.entries(finalData).forEach(([key, val]) => params.append(key, val.toString()));

    try {
      const resp = await fetch(`${scriptUrl.trim()}?${params.toString()}`);
      if (!resp.ok) throw new Error();
      setShowToast('success');
      resetForm();
      setTimeout(() => fetchRecordsAndAutoLogin(false), 2000);
      analyzeDistribution(finalData as any).then(setAiAnalysis);
    } catch (error) {
      console.error("Submit error:", error);
      setShowToast('error');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setShowToast(null), 3000);
    }
  };

  const resetForm = () => {
    setFormData(prev => ({ ...prev, nbPoches: '' }));
    setAiAnalysis(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="sticky top-0 z-[100] px-4 pt-4 md:px-8">
        <div className="max-w-7xl mx-auto bg-slate-900 p-4 rounded-[2rem] shadow-2xl flex justify-between items-center ring-1 ring-white/10">
          <div className="flex items-center gap-4 pl-2">
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-red-600/20">
              <i className="fa-solid fa-droplet"></i>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-white font-black text-sm uppercase tracking-tighter">CNTSCI <span className="text-red-500">Flux</span></h1>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">SÉCURISÉ v15.0</p>
            </div>
          </div>
          
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
            <button onClick={() => setActiveTab('recap')} className={`px-4 sm:px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'recap' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-white'}`}>Bilan Global</button>
            <button onClick={() => setActiveTab('form')} className={`px-4 sm:px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'form' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-white'}`}>Saisie</button>
            <button onClick={() => setActiveTab('center')} className={`px-4 sm:px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'center' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-white'}`}>Mon Centre</button>
          </div>

          <div className="flex gap-2 items-center">
            {currentUser ? (
              <div className="flex items-center gap-3">
                <div className="hidden md:flex flex-col items-end leading-none">
                  <span className="text-[8px] font-black text-red-500 uppercase mb-0.5 tracking-tighter">Session Active</span>
                  <span className="text-[10px] font-black text-white uppercase">{currentUser.nomAgent}</span>
                </div>
                <button onClick={handleLogout} className="w-10 h-10 bg-red-600 hover:bg-red-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-red-600/20 transition-all active:scale-95" title="Déconnexion">
                  <i className="fa-solid fa-power-off"></i>
                </button>
              </div>
            ) : (
              <button onClick={() => setActiveTab('form')} className="px-5 py-2.5 bg-indigo-600 rounded-xl text-white font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20">Identification</button>
            )}
            <button onClick={() => setShowSettings(!showSettings)} className={`w-10 h-10 border rounded-xl flex items-center justify-center transition-all ${showSettings ? 'bg-slate-700 border-slate-600 text-white shadow-lg' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}>
              <i className="fa-solid fa-gear"></i>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        {showSettings && (
          <div className="mb-8 bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-200 animate-in slide-in-from-top-4">
             <div className="mb-6 px-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Configuration du Lien Sheet</h3>
                  <span className="text-[8px] font-black bg-green-100 text-green-600 px-3 py-1 rounded-md border border-green-200 uppercase">Sauvegardé</span>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">URL Web App Google Script</label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input 
                      type="text" 
                      className="flex-1 px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-[10px] font-mono outline-none focus:border-indigo-500 transition-all"
                      value={scriptUrl}
                      onChange={(e) => setScriptUrl(e.target.value)}
                      placeholder="https://script.google.com/macros/s/.../exec"
                    />
                    <button onClick={saveUrl} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase hover:bg-indigo-600 transition-all shadow-lg shadow-slate-900/20">
                      Forcer l'URL & Tester
                    </button>
                  </div>
                </div>
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-4 items-center">
                  <i className="fa-solid fa-circle-check text-blue-500"></i>
                  <p className="text-[10px] text-blue-700 font-medium leading-tight">
                    Le lien fourni a été mémorisé. L'application se connectera automatiquement à ce Sheet à chaque démarrage.
                  </p>
                </div>
             </div>
             <ScriptInstruction />
          </div>
        )}

        <div className={activeTab === 'recap' ? 'block' : 'hidden'}>
          <RecapView 
            records={records} 
            onRefresh={() => fetchRecordsAndAutoLogin(true)} 
            isSyncing={isSyncing} 
            isAuthenticated={!!currentUser}
          />
        </div>

        <div className={activeTab === 'form' ? 'block' : 'hidden'}>
          {!currentUser ? (
            <div className="max-w-md mx-auto py-16 animate-in fade-in zoom-in-95 duration-500 text-center">
               <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100 relative overflow-hidden">
                 <i className="fa-solid fa-circle-notch fa-spin text-4xl text-indigo-600 mb-6"></i>
                 <h2 className="text-xl font-black uppercase text-slate-900 tracking-tighter">Connexion Automatique...</h2>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Récupération des agents depuis le Sheet</p>
                 <button onClick={() => fetchRecordsAndAutoLogin(true)} className="mt-8 px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase">Réessayer la connexion</button>
               </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-500">
              <div className="lg:col-span-8">
                <form onSubmit={handleSubmit} className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
                  <div className="bg-slate-900 p-8 flex justify-between items-center text-white">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                      <h2 className="font-black uppercase tracking-widest text-xs">Saisie de Distribution</h2>
                    </div>
                    <span className="text-[9px] font-black uppercase px-3 py-1 bg-red-600 rounded-lg shadow-sm border border-red-500/20">{currentUser.centreAffectation}</span>
                  </div>

                  <div className="p-8 md:p-12 space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <InputGroup label="Agent de Saisie" icon={<i className="fa-solid fa-user-check text-red-600"></i>}>
                        <input type="text" readOnly value={currentUser.nomAgent} className="w-full px-6 py-4 bg-slate-100 border-2 border-slate-100 rounded-2xl font-bold text-slate-500 outline-none cursor-not-allowed text-xs" />
                      </InputGroup>
                      <InputGroup label="Date Distribution" icon={<i className="fa-solid fa-calendar text-red-600"></i>}>
                        <input type="date" name="dateDistribution" required value={formData.dateDistribution} onChange={handleInputChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 focus:border-red-500 outline-none transition-all text-xs" />
                      </InputGroup>
                      <InputGroup label="Centre Emetteur" icon={<i className="fa-solid fa-hospital text-red-600"></i>}>
                        <input type="text" readOnly value={currentUser.centreAffectation} className="w-full px-6 py-4 bg-slate-100 border-2 border-slate-100 rounded-2xl font-black text-slate-500 outline-none cursor-not-allowed text-xs" />
                      </InputGroup>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200">
                      <InputGroup label="Structure Sanitaire Servie (FS_NOM)" icon={<i className="fa-solid fa-truck-ramp-box text-red-600"></i>}>
                        <input list="structures-list" type="text" name="nomStructuresSanitaire" required placeholder="Rechercher l'établissement..." value={formData.nomStructuresSanitaire} onChange={handleInputChange} className="w-full px-6 py-5 bg-white border-2 border-slate-100 rounded-2xl font-bold text-slate-800 focus:border-red-500 outline-none transition-all text-sm uppercase" />
                        <datalist id="structures-list">{structureSuggestions.map((s, idx) => <option key={idx} value={s} />)}</datalist>
                      </InputGroup>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="p-8 bg-slate-900 rounded-[2.5rem] shadow-xl space-y-8">
                         <InputGroup label="Type de Produit Sanguin" icon={<i className="fa-solid fa-vial text-red-500"></i>}>
                            <select name="typeProduit" value={formData.typeProduit} onChange={handleInputChange} className="w-full px-6 py-4 bg-white/5 border-2 border-white/10 rounded-2xl font-black text-white appearance-none focus:border-red-500 outline-none transition-all text-xs">
                              {PRODUCT_TYPES.map(p => <option key={p} value={p} className="text-slate-900">{p}</option>)}
                            </select>
                         </InputGroup>
                         <InputGroup label="Groupe Sanguin (SA_GROUPE)" icon={<i className="fa-solid fa-dna text-red-500"></i>}>
                            <div className="grid grid-cols-4 gap-2">
                              {BLOOD_GROUPS.map(g => (
                                <button key={g} type="button" onClick={() => setFormData({...formData, saGroupe: g})} className={`py-3 rounded-xl text-[10px] font-black transition-all border-2 ${formData.saGroupe === g ? 'bg-red-600 border-red-600 text-white' : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/20'}`}>{g}</button>
                              ))}
                            </div>
                         </InputGroup>
                      </div>
                      <div className="p-8 bg-red-50/50 rounded-[2.5rem] border border-red-100 flex flex-col justify-center items-center text-center space-y-6">
                        <InputGroup label="Nombre de poches" description="Quantité exacte livrée.">
                          <input type="number" name="nbPoches" required placeholder="0" value={formData.nbPoches} onChange={handleInputChange} className="w-full px-6 py-6 bg-white border-2 border-red-200 rounded-3xl text-center font-black text-5xl text-red-600 focus:border-red-500 outline-none transition-all shadow-inner" />
                        </InputGroup>
                      </div>
                    </div>

                    <button type="submit" disabled={isSubmitting} className="w-full group bg-slate-900 hover:bg-red-600 text-white font-black py-7 rounded-[2rem] shadow-2xl transition-all duration-500 active:scale-[0.98] disabled:bg-slate-300 flex items-center justify-center gap-4 text-sm uppercase tracking-widest">
                      {isSubmitting ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-cloud-arrow-up"></i>}
                      {isSubmitting ? 'Enregistrement...' : 'Finaliser la distribution'}
                    </button>
                  </div>
                </form>
              </div>
              <div className="lg:col-span-4 sticky top-32">
                <HistoryList records={records} />
              </div>
            </div>
          )}
        </div>

        <div className={activeTab === 'center' ? 'block' : 'hidden'}>
          <CenterRecapView records={records} currentUser={currentUser} onRefresh={() => fetchRecordsAndAutoLogin(true)} isSyncing={isSyncing} />
        </div>
      </main>

      {showToast && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-8 py-4 rounded-3xl shadow-2xl border border-white/10 flex items-center gap-4 z-[200] animate-in slide-in-from-bottom-10 ${
          showToast === 'success' || showToast === 'url_saved' || showToast === 'auto_login' ? 'bg-slate-900 text-white' : 
          showToast === 'sync' ? 'bg-indigo-600 text-white' : 'bg-red-600 text-white'
        }`}>
          <i className={`fa-solid ${
            showToast === 'success' || showToast === 'url_saved' || showToast === 'auto_login' ? 'fa-circle-check text-green-400' : 
            showToast === 'sync' ? 'fa-rotate fa-spin' : 'fa-triangle-exclamation'
          }`}></i>
          <p className="text-[10px] font-black uppercase tracking-widest">
            {showToast === 'success' ? 'Opération réussie' : 
             showToast === 'url_saved' ? 'Lien mémorisé définitivement !' :
             showToast === 'auto_login' ? 'Connexion Agent automatique réussie' :
             showToast === 'sync' ? 'Sychronisation...' : 'Erreur de connexion'}
          </p>
        </div>
      )}
    </div>
  );
};

export default App;
