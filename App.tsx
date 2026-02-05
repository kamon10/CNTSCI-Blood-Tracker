
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DistributionData, CNTSCI_CENTERS } from './types';
import { ICONS } from './constants';
import InputGroup from './components/InputGroup';
import HistoryList from './components/HistoryList';
import ScriptInstruction from './components/ScriptInstruction';
import RecapView from './components/RecapView';
import { analyzeDistribution } from './services/geminiService';

const DEFAULT_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxCUbBffPJ1l-NnPwEU48MFcGV4Uu8Jlg8chZhENyK0CeFcyq4dHIfZA0Y4ZrcI_Fc-0Q/exec";

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'form' | 'recap'>('form');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [scriptUrl, setScriptUrl] = useState<string>(() => localStorage.getItem('cntsci_script_url') || DEFAULT_SCRIPT_URL);
  const [connError, setConnError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<any>({
    nomAgent: '',
    dateDistribution: new Date().toISOString().split('T')[0],
    centreCntsci: CNTSCI_CENTERS[0],
    nbCgrAdulte: '',
    nbCgrPediatrique: '',
    nbPlasma: '',
    nbPlaquettes: '',
    nbStructuresSanitaire: '',
  });

  const [records, setRecords] = useState<DistributionData[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [showToast, setShowToast] = useState<'success' | 'error' | 'sync' | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [centerSearch, setCenterSearch] = useState('');

  const fetchRecordsFromSheet = useCallback(async (showNotification = false) => {
    if (!scriptUrl || isSyncing) return;
    setIsSyncing(true);
    if (showNotification) setShowToast('sync');
    setConnError(null);
    
    try {
      const response = await fetch(scriptUrl, {
        method: 'GET',
        mode: 'cors',
        headers: { 'Accept': 'application/json' },
      });
      
      if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setRecords(data);
        localStorage.setItem('cntsci_records', JSON.stringify(data));
        setLastSync(new Date().toLocaleTimeString('fr-FR'));
      } else {
        throw new Error("Données JSON invalides reçues");
      }
    } catch (error: any) {
      console.error("Connexion Error:", error);
      setConnError(error.message === "Failed to fetch" ? "Serveur inaccessible" : error.message);
      if (showNotification) setShowToast('error');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setShowToast(null), 3000);
    }
  }, [scriptUrl, isSyncing]);

  useEffect(() => {
    const saved = localStorage.getItem('cntsci_records');
    if (saved) setRecords(JSON.parse(saved));
    if (scriptUrl) fetchRecordsFromSheet();
  }, [scriptUrl, fetchRecordsFromSheet]);

  const handleUrlChange = (newUrl: string) => {
    const cleanUrl = newUrl.trim();
    setScriptUrl(cleanUrl);
    localStorage.setItem('cntsci_script_url', cleanUrl);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.startsWith('nb') ? (value === '' ? '' : Math.max(0, parseInt(value) || 0)) : value
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
      nbCgrAdulte: formData.nbCgrAdulte || 0,
      nbCgrPediatrique: formData.nbCgrPediatrique || 0,
      nbPlasma: formData.nbPlasma || 0,
      nbPlaquettes: formData.nbPlaquettes || 0,
      nbStructuresSanitaire: formData.nbStructuresSanitaire || 0,
    };

    const params = new URLSearchParams();
    Object.entries(finalData).forEach(([key, val]) => params.append(key, val.toString()));

    try {
      const recordToSave: DistributionData = { ...finalData, id: now.getTime().toString() } as DistributionData;
      setRecords(prev => [...prev, recordToSave]);

      await fetch(scriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      analyzeDistribution(recordToSave).then(setAiAnalysis);
      setShowToast('success');
      resetForm();
      setTimeout(() => fetchRecordsFromSheet(false), 3000);
    } catch (error) {
      setShowToast('error');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setShowToast(null), 3000);
    }
  };

  const resetForm = () => {
    setFormData(prev => ({
      ...prev,
      nomAgent: '', 
      nbCgrAdulte: '',
      nbCgrPediatrique: '',
      nbPlasma: '',
      nbPlaquettes: '',
      nbStructuresSanitaire: '',
    }));
    setAiAnalysis(null);
  };

  const filteredCenters = useMemo(() => {
    return CNTSCI_CENTERS.filter(c => 
      c.toLowerCase().includes(centerSearch.toLowerCase())
    );
  }, [centerSearch]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20 selection:bg-red-100">
      {/* Background Accents */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-15%] right-[-10%] w-[50%] h-[50%] bg-red-500/5 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[100px] rounded-full"></div>
      </div>

      <header className="sticky top-0 z-[100] px-4 pt-4 md:px-8 md:pt-6">
        <div className="max-w-7xl mx-auto bg-slate-900/95 backdrop-blur-xl border border-white/10 p-4 rounded-[2.5rem] shadow-2xl shadow-slate-900/40 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4 group">
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-800 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/20 transform rotate-3 group-hover:rotate-0 transition-transform duration-500">
              <i className="fa-solid fa-droplet text-white text-xl animate-pulse"></i>
            </div>
            <div>
              <h1 className="text-xl font-black text-white uppercase tracking-tighter leading-none">
                CNTSCI <span className="text-red-500">Flux</span>
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <div className={`w-2 h-2 rounded-full ${connError ? 'bg-amber-500' : 'bg-green-500 animate-pulse'}`}></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {isSyncing ? 'Mise à jour...' : connError ? 'Erreur de lien' : 'Connecté'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex bg-white/5 p-1 rounded-[1.5rem] border border-white/5">
            <button 
              onClick={() => setActiveTab('form')} 
              className={`px-8 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'form' ? 'bg-white text-slate-900 shadow-xl scale-105' : 'text-slate-400 hover:text-white'}`}
            >
              <i className="fa-solid fa-plus-circle mr-2"></i>Saisie
            </button>
            <button 
              onClick={() => setActiveTab('recap')} 
              className={`px-8 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'recap' ? 'bg-white text-slate-900 shadow-xl scale-105' : 'text-slate-400 hover:text-white'}`}
            >
              <i className="fa-solid fa-chart-pie mr-2"></i>Analyse
            </button>
          </div>

          <div className="flex gap-2">
            <button onClick={() => fetchRecordsFromSheet(true)} className="w-11 h-11 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white hover:bg-white/10 transition-all active:scale-90">
              <i className={`fa-solid fa-arrows-rotate ${isSyncing ? 'fa-spin' : ''}`}></i>
            </button>
            <button onClick={() => setShowSettings(!showSettings)} className={`w-11 h-11 border rounded-2xl flex items-center justify-center transition-all active:scale-90 ${showSettings ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-500/20' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}>
              <i className="fa-solid fa-gear"></i>
            </button>
          </div>
        </div>
      </header>

      {showSettings && (
        <div className="max-w-7xl mx-auto px-4 mt-8 animate-in slide-in-from-top-4 duration-500">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                <i className="fa-solid fa-link"></i>
              </div>
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Lien Google Script</h3>
            </div>
            <div className="flex flex-col md:flex-row gap-4">
              <input 
                type="text" 
                className="flex-1 px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-mono outline-none focus:border-red-500 transition-all"
                value={scriptUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="https://script.google.com/..."
              />
              <button onClick={() => handleUrlChange(DEFAULT_SCRIPT_URL)} className="px-6 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg">
                Rétablir défaut
              </button>
            </div>
            {connError && <p className="mt-4 text-[10px] font-bold text-red-500 uppercase flex items-center gap-2"><i className="fa-solid fa-circle-exclamation"></i> Diagnostic: {connError}</p>}
          </div>
          <div className="mt-6"><ScriptInstruction /></div>
        </div>
      )}

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        {activeTab === 'form' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-8">
              <form onSubmit={handleSubmit} className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-100 overflow-hidden hover:shadow-red-500/10 transition-shadow duration-700">
                <div className="bg-slate-900 p-8 flex justify-between items-center">
                  <div>
                    <h2 className="text-white font-black uppercase tracking-[0.25em] text-xs">Formulaire de Sortie</h2>
                    <p className="text-slate-500 text-[10px] font-bold mt-1">Validation immédiate cloud</p>
                  </div>
                  <button type="button" onClick={resetForm} className="text-slate-400 hover:text-white transition-colors text-xs p-2">
                    <i className="fa-solid fa-trash-can"></i>
                  </button>
                </div>

                <div className="p-8 md:p-14 space-y-12">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <InputGroup label="Identité Agent" icon={<i className="fa-solid fa-id-badge text-red-500"></i>}>
                      <input type="text" name="nomAgent" required placeholder="Ex: Jean Dupont" value={formData.nomAgent} onChange={handleInputChange} className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-bold text-slate-800 focus:border-red-500 focus:bg-white outline-none transition-all placeholder:text-slate-300" />
                    </InputGroup>
                    <InputGroup label="Date Distribution" icon={<i className="fa-solid fa-calendar text-red-500"></i>}>
                      <input type="date" name="dateDistribution" required value={formData.dateDistribution} onChange={handleInputChange} className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-bold text-slate-800 focus:border-red-500 focus:bg-white outline-none transition-all" />
                    </InputGroup>
                  </div>

                  <InputGroup label="Centre Bénéficiaire" icon={<i className="fa-solid fa-building-shield text-red-500"></i>}>
                    <div className="relative group/select">
                      <select name="centreCntsci" value={formData.centreCntsci} onChange={handleInputChange} className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black text-slate-900 appearance-none focus:border-red-500 focus:bg-white outline-none transition-all cursor-pointer">
                        {CNTSCI_CENTERS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <i className="fa-solid fa-chevron-down absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/select:text-red-500 pointer-events-none transition-colors"></i>
                    </div>
                  </InputGroup>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="p-8 bg-red-50/50 rounded-[3rem] border border-red-100 space-y-8">
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-red-600 block mb-2">Unités CGR</span>
                      <div className="grid grid-cols-1 gap-6">
                        <InputGroup label="Adulte">
                          <input type="number" name="nbCgrAdulte" placeholder="0" value={formData.nbCgrAdulte} onChange={handleInputChange} className="w-full px-6 py-6 bg-white border-2 border-red-100 rounded-[2rem] text-center font-black text-5xl text-red-600 focus:border-red-500 outline-none transition-all shadow-sm" />
                        </InputGroup>
                        <InputGroup label="Pédiatrique">
                          <input type="number" name="nbCgrPediatrique" placeholder="0" value={formData.nbCgrPediatrique} onChange={handleInputChange} className="w-full px-6 py-6 bg-white border-2 border-red-100 rounded-[2rem] text-center font-black text-5xl text-red-600 focus:border-red-500 outline-none transition-all shadow-sm" />
                        </InputGroup>
                      </div>
                    </div>
                    <div className="p-8 bg-blue-50/50 rounded-[3rem] border border-blue-100 space-y-8">
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 block mb-2">Unités PSL</span>
                      <div className="grid grid-cols-1 gap-6">
                        <InputGroup label="Plasma">
                          <input type="number" name="nbPlasma" placeholder="0" value={formData.nbPlasma} onChange={handleInputChange} className="w-full px-6 py-6 bg-white border-2 border-blue-100 rounded-[2rem] text-center font-black text-5xl text-blue-600 focus:border-blue-500 outline-none transition-all shadow-sm" />
                        </InputGroup>
                        <InputGroup label="Plaquettes">
                          <input type="number" name="nbPlaquettes" placeholder="0" value={formData.nbPlaquettes} onChange={handleInputChange} className="w-full px-6 py-6 bg-white border-2 border-blue-100 rounded-[2rem] text-center font-black text-5xl text-blue-600 focus:border-blue-500 outline-none transition-all shadow-sm" />
                        </InputGroup>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-200">
                    <InputGroup label="Structures Livrées" description="Total des établissements servis ce jour.">
                      <input type="number" name="nbStructuresSanitaire" placeholder="0" value={formData.nbStructuresSanitaire} onChange={handleInputChange} className="w-full mt-4 px-8 py-8 bg-white border-2 border-slate-100 rounded-[2rem] font-black text-center text-6xl text-slate-800 focus:border-slate-400 outline-none transition-all shadow-inner" />
                    </InputGroup>
                  </div>

                  {aiAnalysis && (
                    <div className="p-8 bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] border border-white/10 flex gap-6 items-center animate-in zoom-in-95 duration-500">
                      <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-red-500 text-xl shadow-lg shadow-black/20">
                        <i className="fa-solid fa-robot"></i>
                      </div>
                      <div className="flex-1">
                        <p className="text-[9px] font-black uppercase tracking-widest text-red-400 mb-1">Observation IA CNTSCI</p>
                        <p className="text-sm font-medium text-slate-100 italic leading-snug">"{aiAnalysis}"</p>
                      </div>
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="w-full group bg-slate-900 hover:bg-red-600 text-white font-black py-8 rounded-[2.5rem] shadow-2xl hover:shadow-red-500/20 transition-all duration-500 active:scale-[0.98] disabled:bg-slate-300 flex items-center justify-center gap-6 text-base uppercase tracking-[0.25em]"
                  >
                    {isSubmitting ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-paper-plane group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"></i>}
                    {isSubmitting ? 'Finalisation...' : 'Valider la Distribution'}
                  </button>
                </div>
              </form>
            </div>
            
            <div className="lg:col-span-4 lg:sticky lg:top-36">
              <HistoryList records={records} />
            </div>
          </div>
        ) : (
          <RecapView records={records} lastSync={lastSync} onRefresh={() => fetchRecordsFromSheet(true)} isSyncing={isSyncing} />
        )}
      </main>

      {/* Dynamic Notifications */}
      {showToast === 'success' && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-10 py-5 rounded-[2rem] shadow-2xl border border-white/10 flex items-center gap-5 z-[200] animate-in slide-in-from-bottom-12">
          <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white text-lg">
            <i className="fa-solid fa-check"></i>
          </div>
          <div>
             <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Enregistrement OK</p>
             <p className="text-[9px] font-bold text-slate-400 uppercase">Données transmises au cloud</p>
          </div>
        </div>
      )}
      
      {showToast === 'sync' && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-10 py-5 rounded-[2rem] shadow-2xl border border-white/10 flex items-center gap-5 z-[200] animate-in slide-in-from-bottom-12">
          <i className="fa-solid fa-arrows-rotate fa-spin text-blue-400 text-xl"></i>
          <p className="text-[10px] font-black uppercase tracking-widest">Rafraîchissement global...</p>
        </div>
      )}
    </div>
  );
};

export default App;
