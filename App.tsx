
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { DistributionData, CNTSCI_CENTERS, CENTER_STRUCTURES_MAP, PRODUCT_TYPES, BLOOD_GROUPS, User } from './types.ts';
import InputGroup from './components/InputGroup.tsx';
import HistoryList from './components/HistoryList.tsx';
import RecapView from './components/RecapView.tsx';
import CenterRecapView from './components/CenterRecapView.tsx';
import UserManagementView from './components/UserManagementView.tsx';
import ScriptInstruction from './components/ScriptInstruction.tsx';
import { analyzeDistribution } from './services/geminiService.ts';

const DEFAULT_URL = "https://script.google.com/macros/s/AKfycbwmJkITojb2tBgE5O2d-HaA__-y9wdtQO57XI0cl_A7kqRdn-5jnmhDwJezMwc-4e9oSQ/exec";
const SUPER_CENTER_VALUE = "TOUS LES CENTRES CNTSCI";

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'form' | 'recap' | 'center' | 'admin'>('recap');
  const [isSyncing, setIsSyncing] = useState(false);
  const isFetchingRef = useRef(false);
  
  const [scriptUrl, setScriptUrl] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('cntsci_script_url_v15');
      return saved || DEFAULT_URL;
    } catch {
      return DEFAULT_URL;
    }
  });
  
  const [showSettings, setShowSettings] = useState(false);
  
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('cntsci_user_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  
  const [loginData, setLoginData] = useState({ login: '', motDePasse: '' });
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [formData, setFormData] = useState<any>({
    nomAgent: '',
    dateDistribution: new Date().toISOString().split('T')[0],
    centreCntsci: CNTSCI_CENTERS[0],
    nomStructuresSanitaire: '',
    typeProduit: PRODUCT_TYPES[0],
    saGroupe: BLOOD_GROUPS[0],
    nbPoches: '',
  });

  const [records, setRecords] = useState<DistributionData[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [showToast, setShowToast] = useState<'success' | 'error' | 'sync' | 'auth_error' | 'url_saved' | null>(null);

  const isAgentAuthenticated = useMemo(() => {
    if (!currentUser) return false;
    const name = currentUser.nomAgent.toUpperCase();
    return name !== "VISITEUR" && name !== "AUCUN" && name !== "";
  }, [currentUser]);

  // Vérifie si l'utilisateur a les droits sur tous les centres
  const isSuperAgent = useMemo(() => {
    return currentUser?.centreAffectation === SUPER_CENTER_VALUE;
  }, [currentUser]);

  // Vérifie si l'utilisateur est un administrateur DIRECTION GENERALE
  const isAdmin = useMemo(() => {
    return currentUser?.centreAffectation === "DIRECTION GENERALE";
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      setFormData(prev => ({
        ...prev,
        nomAgent: currentUser.nomAgent,
        // Si super agent, on initialise avec le premier centre de la liste s'il n'est pas déjà valide
        centreCntsci: isSuperAgent ? CNTSCI_CENTERS[0] : currentUser.centreAffectation,
        nomStructuresSanitaire: '' // Reset structure on user change
      }));
    }
  }, [currentUser, isSuperAgent]);

  const structureSuggestions = useMemo(() => {
    return CENTER_STRUCTURES_MAP[formData.centreCntsci] || [];
  }, [formData.centreCntsci]);

  const fetchRecordsAndAutoLogin = useCallback(async (showNotification = false) => {
    const cleanUrl = scriptUrl.trim();
    if (!cleanUrl || !cleanUrl.startsWith('http')) return;
    if (isFetchingRef.current) return;
    
    isFetchingRef.current = true;
    setIsSyncing(true);
    if (showNotification) setShowToast('sync');
    
    try {
      const distResponse = await fetch(`${cleanUrl}?action=get_dist&_t=${Date.now()}`);
      if (distResponse.ok) {
        const data = await distResponse.json();
        if (Array.isArray(data)) setRecords(data);
      }

      if (!localStorage.getItem('cntsci_user_session')) {
        const userResponse = await fetch(`${cleanUrl}?action=get_users&_t=${Date.now()}`);
        if (userResponse.ok) {
          const users: User[] = await userResponse.json();
          const visitorUser = users?.find(u => u.nomAgent.toUpperCase() === "VISITEUR") || users?.[0];
          
          if (visitorUser) {
            setCurrentUser(visitorUser);
            localStorage.setItem('cntsci_user_session', JSON.stringify(visitorUser));
          }
        }
      }
    } catch (e) {
      console.error("Erreur de synchronisation:", e);
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
      if (!resp.ok) throw new Error("Réponse serveur incorrecte");
      
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
    fetchRecordsAndAutoLogin();
    setActiveTab('recap');
  };

  const saveUrl = () => {
    const cleanUrl = scriptUrl.trim();
    localStorage.setItem('cntsci_script_url_v15', cleanUrl);
    setShowToast('url_saved');
    fetchRecordsAndAutoLogin(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: name === 'nbPoches' ? (value === '' ? '' : Math.max(0, parseInt(value) || 0)) : value };
      // Si on change le centre, on réinitialise la structure
      if (name === 'centreCntsci') {
        newData.nomStructuresSanitaire = '';
      }
      return newData;
    });
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
      setFormData(prev => ({ ...prev, nbPoches: '' }));
      setAiAnalysis(null);
      setTimeout(() => fetchRecordsAndAutoLogin(false), 2000);
      analyzeDistribution(finalData as any).then(setAiAnalysis);
    } catch (error) {
      setShowToast('error');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setShowToast(null), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="sticky top-0 z-[100] px-4 pt-4 md:px-8">
        <div className="max-w-7xl mx-auto bg-slate-900 p-3 sm:p-4 rounded-[1.5rem] sm:rounded-[2rem] shadow-2xl flex justify-between items-center ring-1 ring-white/10">
          <div className="flex items-center gap-3 sm:gap-4 pl-1 sm:pl-2">
            <div className="w-8 h-8 sm:w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-red-600/20">
              <i className="fa-solid fa-droplet text-sm sm:text-base"></i>
            </div>
            <div className="hidden lg:block">
              <h1 className="text-white font-black text-sm uppercase tracking-tighter">CNTSCI <span className="text-red-500">Flux</span></h1>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">PRO v15.0</p>
            </div>
          </div>
          
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 mx-2">
            <button onClick={() => setActiveTab('recap')} className={`px-3 sm:px-6 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'recap' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
              <i className="fa-solid fa-chart-pie md:mr-2"></i> <span className="hidden md:inline">Recap</span>
            </button>
            {isAgentAuthenticated && (
              <>
                <button onClick={() => setActiveTab('center')} className={`px-3 sm:px-6 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'center' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                  <i className="fa-solid fa-hospital md:mr-2"></i> <span className="hidden md:inline">Centre</span>
                </button>
                <button onClick={() => setActiveTab('form')} className={`px-3 sm:px-6 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'form' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                  <i className="fa-solid fa-plus-circle md:mr-2"></i> <span className="hidden md:inline">Saisie</span>
                </button>
                {isAdmin && (
                  <button onClick={() => setActiveTab('admin')} className={`px-3 sm:px-6 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'admin' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-indigo-400 hover:text-white hover:bg-white/5'}`}>
                    <i className="fa-solid fa-user-shield md:mr-2"></i> <span className="hidden md:inline">Admin</span>
                  </button>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3">
            {!isAgentAuthenticated && (
              <button 
                onClick={() => setActiveTab('form')}
                className="flex items-center gap-2 sm:gap-3 bg-red-600 hover:bg-red-700 text-white px-3 sm:px-5 py-2.5 rounded-2xl transition-all shadow-xl shadow-red-600/40 active:scale-95 border border-red-500/50"
                title="Connexion Agent"
              >
                <i className="fa-solid fa-user-shield text-xs"></i>
                <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Connecter Agent</span>
              </button>
            )}

            <button onClick={() => setShowSettings(!showSettings)} className="w-8 h-8 sm:w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all">
              <i className="fa-solid fa-gear"></i>
            </button>

            {currentUser && (
              <div className="flex items-center gap-2 sm:gap-3 ml-1">
                <div className="hidden md:flex flex-col items-end leading-none">
                  <span className={`text-[8px] font-black uppercase mb-0.5 tracking-tighter ${isAgentAuthenticated ? 'text-green-500' : 'text-amber-500'}`}>
                    {isAgentAuthenticated ? 'AGENT' : 'VISITEUR'}
                  </span>
                  <span className="text-[10px] font-black text-white uppercase">{currentUser.nomAgent}</span>
                </div>
                <button onClick={handleLogout} className="px-3 sm:px-4 py-2 bg-white/5 hover:bg-red-600/20 text-slate-400 hover:text-red-500 rounded-xl border border-white/5 transition-all text-[10px] font-black uppercase tracking-widest">
                  <i className="fa-solid fa-right-from-bracket sm:hidden"></i>
                  <span className="hidden sm:inline">Sortie</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 pt-8">
        {showSettings && (
          <div className="mb-8 bg-white p-8 rounded-[2.5rem] shadow-2xl border border-slate-100 animate-in slide-in-from-top-4 duration-500">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 mb-6 flex items-center gap-2">
              <i className="fa-solid fa-link text-indigo-500"></i> Configuration du Point de Terminaison
            </h3>
            <div className="flex flex-col sm:flex-row gap-4">
              <input 
                type="text" 
                value={scriptUrl} 
                onChange={(e) => setScriptUrl(e.target.value)}
                placeholder="URL Google Apps Script"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
              <button onClick={saveUrl} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                Mettre à jour
              </button>
            </div>
            <div className="mt-8 pt-8 border-t border-slate-100">
               <ScriptInstruction />
            </div>
          </div>
        )}

        {activeTab === 'recap' && (
          <RecapView 
            records={records} 
            onRefresh={() => fetchRecordsAndAutoLogin(true)} 
            isSyncing={isSyncing}
            isAuthenticated={isAgentAuthenticated}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'center' && (
          isAgentAuthenticated ? (
            <CenterRecapView 
              records={records} 
              currentUser={currentUser} 
              onRefresh={() => fetchRecordsAndAutoLogin(true)} 
              isSyncing={isSyncing} 
            />
          ) : (
            <div className="text-center py-24 bg-white rounded-[3rem] shadow-xl border border-slate-100 animate-in fade-in duration-500">
              <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-200 text-4xl mx-auto mb-8 shadow-inner">
                <i className="fa-solid fa-lock"></i>
              </div>
              <h2 className="text-xl font-black uppercase text-slate-900 tracking-tighter">Section Réservée</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 max-w-xs mx-auto leading-relaxed">
                Le tableau de bord de centre est réservé aux agents authentifiés.
              </p>
              <button 
                onClick={() => setActiveTab('form')}
                className="mt-8 bg-red-600 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-red-700 transition-all"
              >
                Se connecter en tant qu'Agent
              </button>
            </div>
          )
        )}

        {activeTab === 'admin' && isAdmin && (
          <UserManagementView 
            scriptUrl={scriptUrl} 
            onRefresh={() => fetchRecordsAndAutoLogin(false)}
            isSyncing={isSyncing}
          />
        )}

        {activeTab === 'form' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className={isAgentAuthenticated ? "lg:col-span-7" : "lg:col-span-12 max-w-2xl mx-auto w-full"}>
              {!isAgentAuthenticated ? (
                <div className="bg-white p-12 rounded-[3rem] shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-500">
                  <div className="mb-10 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-300 text-3xl mx-auto mb-6 shadow-inner">
                      <i className="fa-solid fa-user-lock"></i>
                    </div>
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Espace Agent</h2>
                    <p className="text-xs text-slate-400 font-bold uppercase mt-2">Authentifiez-vous pour saisir des données</p>
                  </div>
                  
                  <form onSubmit={handleLogin} className="space-y-6">
                    <InputGroup label="Identifiant" icon={<i className="fa-solid fa-user"></i>}>
                      <input 
                        type="text" 
                        value={loginData.login} 
                        onChange={(e) => setLoginData({...loginData, login: e.target.value})}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-xs font-bold focus:border-red-600 outline-none transition-all"
                        required
                        placeholder="Identifiant agent"
                      />
                    </InputGroup>
                    <InputGroup label="Mot de passe" icon={<i className="fa-solid fa-key"></i>}>
                      <input 
                        type="password" 
                        value={loginData.motDePasse} 
                        onChange={(e) => setLoginData({...loginData, motDePasse: e.target.value})}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-xs font-bold focus:border-red-600 outline-none transition-all"
                        required
                        placeholder="••••••••"
                      />
                    </InputGroup>
                    <button 
                      type="submit" 
                      disabled={isLoggingIn}
                      className="w-full bg-red-600 hover:bg-red-700 text-white py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-red-600/20 transition-all flex items-center justify-center gap-3"
                    >
                      {isLoggingIn ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-right-to-bracket"></i>}
                      Ouvrir la session Agent
                    </button>
                  </form>
                </div>
              ) : (
                <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100">
                  <div className="flex items-center justify-between mb-10">
                    <h2 className="text-xs font-black uppercase tracking-widest text-slate-800 flex items-center gap-3">
                      <i className="fa-solid fa-pen-to-square text-red-600"></i> Nouvelle Distribution
                    </h2>
                    <div className="flex flex-col items-end">
                      <span className="text-[8px] font-black bg-red-50 text-red-600 px-3 py-1 rounded-full border border-red-100 uppercase mb-1">
                        Profil: {currentUser?.centreAffectation}
                      </span>
                      {!isSuperAgent && (
                         <span className="text-[10px] font-black text-slate-400 uppercase">
                           Centre: {formData.centreCntsci}
                         </span>
                      )}
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <InputGroup label="Date" icon={<i className="fa-solid fa-calendar"></i>}>
                        <input name="dateDistribution" type="date" value={formData.dateDistribution} onChange={handleInputChange} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-xs font-bold focus:border-red-600 outline-none transition-all" />
                      </InputGroup>
                      
                      {/* Affichage conditionnel du sélecteur de centre pour les Super Agents */}
                      {isSuperAgent ? (
                        <InputGroup label="Sélectionner le Centre" icon={<i className="fa-solid fa-building-shield"></i>}>
                          <select name="centreCntsci" value={formData.centreCntsci} onChange={handleInputChange} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-xs font-bold focus:border-red-600 outline-none transition-all" required>
                            {CNTSCI_CENTERS.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </InputGroup>
                      ) : null}

                      <InputGroup label="Structure Sanitaire" icon={<i className="fa-solid fa-hospital"></i>}>
                        <select name="nomStructuresSanitaire" value={formData.nomStructuresSanitaire} onChange={handleInputChange} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-xs font-bold focus:border-red-600 outline-none transition-all" required>
                          <option value="">Sélectionner une structure</option>
                          {structureSuggestions.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </InputGroup>

                      <InputGroup label="Type de Produit" icon={<i className="fa-solid fa-vial"></i>}>
                        <select name="typeProduit" value={formData.typeProduit} onChange={handleInputChange} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-xs font-bold focus:border-red-600 outline-none transition-all">
                          {PRODUCT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </InputGroup>

                      <InputGroup label="Groupe Sanguin" icon={<i className="fa-solid fa-droplet"></i>}>
                        <select name="saGroupe" value={formData.saGroupe} onChange={handleInputChange} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-xs font-bold focus:border-red-600 outline-none transition-all">
                          {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </InputGroup>

                      <InputGroup label="Quantité (Poches)" icon={<i className="fa-solid fa-hashtag"></i>}>
                        <input name="nbPoches" type="number" value={formData.nbPoches} onChange={handleInputChange} placeholder="0" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-xs font-bold focus:border-red-600 outline-none transition-all" required min="1" />
                      </InputGroup>
                    </div>

                    {aiAnalysis && (
                      <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="flex items-center gap-2 mb-2 text-purple-600">
                          <i className="fa-solid fa-wand-magic-sparkles text-[10px]"></i>
                          <span className="text-[9px] font-black uppercase tracking-widest">Analyse IA</span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-700 leading-relaxed italic">"{aiAnalysis}"</p>
                      </div>
                    )}

                    <div className="flex gap-4 pt-4">
                      <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-slate-900/20 hover:bg-red-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                      >
                        {isSubmitting ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-paper-plane"></i>}
                        Valider la distribution
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
            
            {isAgentAuthenticated && (
              <div className="lg:col-span-5">
                <HistoryList records={records} currentUser={currentUser} />
              </div>
            )}
          </div>
        )}
      </main>

      {showToast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-bottom-10 duration-500">
          <div className={`px-8 py-4 rounded-full shadow-2xl border flex items-center gap-4 ${
            showToast === 'success' ? 'bg-green-600 border-green-500 text-white' :
            showToast === 'auth_error' ? 'bg-amber-500 border-amber-400 text-white' :
            showToast === 'sync' ? 'bg-slate-900 border-slate-800 text-white' :
            'bg-red-600 border-red-500 text-white'
          }`}>
            <i className={`fa-solid ${
              showToast === 'success' ? 'fa-circle-check' :
              showToast === 'sync' ? 'fa-sync fa-spin' :
              'fa-circle-exclamation'
            }`}></i>
            <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
              {showToast === 'success' ? 'Opération réussie' :
               showToast === 'auth_error' ? 'Identifiants incorrects' :
               showToast === 'url_saved' ? 'Configuration enregistrée' :
               showToast === 'sync' ? 'Mise à jour des données...' :
               'Une erreur est survenue'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
