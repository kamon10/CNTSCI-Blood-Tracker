
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DistributionData, CNTSCI_CENTERS } from './types';
import { ICONS } from './constants';
import InputGroup from './components/InputGroup';
import HistoryList from './components/HistoryList';
import ScriptInstruction from './components/ScriptInstruction';
import RecapView from './components/RecapView';
import { analyzeDistribution } from './services/geminiService';

// Lien de production configuré par défaut
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
      console.error("Diagnostic Connexion:", error);
      const msg = error.message === "Failed to fetch" 
        ? "Blocage Sécurité : Vérifiez que 'Tout le monde' est sélectionné dans Apps Script" 
        : error.message;
      setConnError(msg);
      if (showNotification) setShowToast('error');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setShowToast(null), 3000);
    }
  }, [scriptUrl, isSyncing]);

  useEffect(() => {
    // Charger le cache immédiat au démarrage
    const saved = localStorage.getItem('cntsci_records');
    if (saved) setRecords(JSON.parse(saved));
    
    // Connexion automatique au démarrage avec l'URL par défaut
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
    if (!scriptUrl) {
      setShowSettings(true);
      return;
    }
    
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
      
      setTimeout(() => fetchRecordsFromSheet(false), 5000);
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
    <div className="min-h-screen bg-slate-50 pb-10 font-sans text-slate-900 selection:bg-red-100">
      <header className="bg-slate-900 text-white p-6 sticky top-0 z-50 shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="bg-gradient-to-br from-red-500 to-red-700 p-4 rounded-3xl shadow-lg shadow-red-900/40 transform -rotate-6">
              <i className="fa-solid fa-droplet text-3xl animate-pulse"></i>
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter leading-none">CNTSCI <span className="text-red-500 italic">Distri</span></h1>
              <div className="mt-1 flex items-center gap-3">
                 <div className={`w-2 h-2 rounded-full ${connError ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse'}`}></div>
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                   {connError ? "ERREUR CONNEXION" : isSyncing ? "SYNC EN COURS..." : `PRÊT • ${lastSync || 'HORS-LIGNE'}`}
                 </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-white/5 p-2 rounded-[2rem] border border-white/10 backdrop-blur-md">
            <button onClick={() => setActiveTab('form')} className={`px-8 py-3 rounded-full text-[10px] font-black uppercase transition-all flex items-center gap-2 ${activeTab === 'form' ? 'bg-white text-slate-900 shadow-xl scale-105' : 'text-slate-400 hover:text-white'}`}>
              <i className="fa-solid fa-pen"></i> Saisie
            </button>
            <button onClick={() => setActiveTab('recap')} className={`px-8 py-3 rounded-full text-[10px] font-black uppercase transition-all flex items-center gap-2 ${activeTab === 'recap' ? 'bg-white text-slate-900 shadow-xl scale-105' : 'text-slate-400 hover:text-white'}`}>
              <i className="fa-solid fa-chart-line"></i> Rapports
            </button>
          </div>

          <div className="flex gap-3">
            <button onClick={() => fetchRecordsFromSheet(true)} className={`w-12 h-12 rounded-2xl border-2 transition-all flex items-center justify-center ${isSyncing ? 'bg-blue-600 border-blue-600' : 'border-white/20 hover:bg-white/10'}`} disabled={isSyncing}>
              <i className={`fa-solid fa-sync ${isSyncing ? 'fa-spin' : ''}`}></i>
            </button>
            <button onClick={() => setShowSettings(!showSettings)} className={`w-12 h-12 rounded-2xl border-2 transition-all flex items-center justify-center ${showSettings ? 'bg-red-600 border-red-600' : 'border-white/20 hover:bg-white/10'}`}>
              <i className="fa-solid fa-sliders"></i>
            </button>
          </div>
        </div>
      </header>

      {showSettings && (
        <div className="max-w-7xl mx-auto px-4 mt-8 space-y-8 animate-in slide-in-from-top-4 duration-500">
          <div className="bg-white rounded-[3rem] p-10 shadow-2xl border-4 border-slate-100">
             <div className="flex justify-between items-start mb-8">
               <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                    <i className="fa-solid fa-plug text-blue-500"></i> Configuration du lien
                  </h3>
                  <p className="text-xs font-bold text-slate-400 mt-1">Lien actuel : {scriptUrl === DEFAULT_SCRIPT_URL ? 'Par défaut' : 'Personnalisé'}</p>
               </div>
               {connError && <span className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase border border-red-100">Erreur détectée</span>}
             </div>
             
             <div className="space-y-6">
                <div className="relative">
                  <input type="text" placeholder="https://script.google.com/macros/s/.../exec" className={`w-full px-8 py-6 bg-slate-50 border-4 rounded-3xl font-mono text-sm outline-none transition-all ${connError ? 'border-red-100 focus:border-red-300' : 'border-slate-100 focus:border-blue-500'}`} value={scriptUrl} onChange={(e) => handleUrlChange(e.target.value)} />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2">
                    {scriptUrl ? <i className="fa-solid fa-check-circle text-green-500 text-xl"></i> : <i className="fa-solid fa-circle-info text-slate-300 text-xl"></i>}
                  </div>
                </div>

                {connError && (
                  <div className="p-6 bg-red-50 rounded-3xl border-2 border-red-100 flex items-start gap-5">
                    <i className="fa-solid fa-circle-exclamation text-2xl text-red-500 mt-1"></i>
                    <div>
                      <p className="text-sm font-black text-red-700 uppercase">Diagnostic technique :</p>
                      <p className="text-sm text-red-900 font-bold italic">"{connError}"</p>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-4">
                  <button onClick={() => fetchRecordsFromSheet(true)} className="bg-slate-900 text-white px-10 py-5 rounded-2xl font-black uppercase text-xs hover:scale-105 transition-all shadow-xl shadow-slate-900/20">Tester le lien</button>
                  <button onClick={() => handleUrlChange(DEFAULT_SCRIPT_URL)} className="bg-white border-2 border-slate-200 text-slate-400 px-10 py-5 rounded-2xl font-black uppercase text-xs hover:text-slate-600 transition-all">Rétablir défaut</button>
                </div>
             </div>
          </div>
          <ScriptInstruction />
        </div>
      )}

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        {activeTab === 'form' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-8">
              <form onSubmit={handleSubmit} className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-200 overflow-hidden">
                <div className="p-8 bg-slate-900 text-white font-black uppercase text-xs tracking-[0.3em] flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                    Saisie Distribution
                  </div>
                  <button type="button" onClick={resetForm} className="hover:text-red-400 transition-colors uppercase text-[10px]">
                    <i className="fa-solid fa-trash-can mr-2"></i> Réinitialiser
                  </button>
                </div>
                <div className="p-8 md:p-14 space-y-12">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <InputGroup label="Nom de l'agent" icon={ICONS.agent}>
                      <input type="text" name="nomAgent" required placeholder="Votre nom complet" value={formData.nomAgent} onChange={handleInputChange} className="w-full px-6 py-5 border-4 border-slate-100 rounded-3xl outline-none focus:border-red-500 bg-slate-50 font-black text-xl placeholder:text-slate-300 transition-all" />
                    </InputGroup>
                    <InputGroup label="Date" icon={ICONS.calendar}>
                      <input type="date" name="dateDistribution" required value={formData.dateDistribution} onChange={handleInputChange} className="w-full px-6 py-5 border-4 border-slate-100 rounded-3xl outline-none focus:border-red-500 bg-slate-50 font-black text-xl transition-all" />
                    </InputGroup>
                  </div>

                  <InputGroup label="Centre de destination" icon={ICONS.center}>
                    <div className="relative mb-4">
                      <i className="fa-solid fa-search absolute left-6 top-1/2 -translate-y-1/2 text-slate-400"></i>
                      <input type="text" placeholder="Filtrer les centres..." className="w-full pl-14 pr-6 py-4 bg-slate-100 rounded-2xl text-xs font-bold outline-none focus:bg-white border-2 border-transparent focus:border-slate-200" value={centerSearch} onChange={(e) => setCenterSearch(e.target.value)} />
                    </div>
                    <select name="centreCntsci" value={formData.centreCntsci} onChange={handleInputChange} className="w-full px-8 py-6 border-4 border-slate-100 rounded-3xl outline-none bg-white font-black text-slate-800 text-2xl appearance-none shadow-inner cursor-pointer hover:border-slate-200 transition-all">
                      {filteredCenters.map(center => <option key={center} value={center}>{center}</option>)}
                    </select>
                  </InputGroup>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-8 bg-red-50/30 p-8 rounded-[3rem] border-2 border-red-50">
                      <h3 className="text-[10px] font-black text-red-600 uppercase tracking-[0.3em] flex items-center gap-3">
                        <i className="fa-solid fa-vial"></i> Globules Rouges (CGR)
                      </h3>
                      <div className="space-y-6">
                        <InputGroup label="CGR ADULTE">
                          <input type="number" name="nbCgrAdulte" placeholder="0" value={formData.nbCgrAdulte} onChange={handleInputChange} className="w-full px-6 py-8 border-4 border-white rounded-[2rem] text-center font-black text-6xl text-red-600 outline-none focus:border-red-500 bg-white shadow-xl" />
                        </InputGroup>
                        <InputGroup label="CGR PEDIATRIQUE">
                          <input type="number" name="nbCgrPediatrique" placeholder="0" value={formData.nbCgrPediatrique} onChange={handleInputChange} className="w-full px-6 py-8 border-4 border-white rounded-[2rem] text-center font-black text-6xl text-red-600 outline-none focus:border-red-500 bg-white shadow-xl" />
                        </InputGroup>
                      </div>
                    </div>
                    <div className="space-y-8 bg-blue-50/30 p-8 rounded-[3rem] border-2 border-blue-50">
                      <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] flex items-center gap-3">
                        <i className="fa-solid fa-flask"></i> Plasma & Plaquettes
                      </h3>
                      <div className="space-y-6">
                        <InputGroup label="PLASMA">
                          <input type="number" name="nbPlasma" placeholder="0" value={formData.nbPlasma} onChange={handleInputChange} className="w-full px-6 py-8 border-4 border-white rounded-[2rem] text-center font-black text-6xl text-blue-600 outline-none focus:border-blue-500 bg-white shadow-xl" />
                        </InputGroup>
                        <InputGroup label="PLAQUETTES">
                          <input type="number" name="nbPlaquettes" placeholder="0" value={formData.nbPlaquettes} onChange={handleInputChange} className="w-full px-6 py-8 border-4 border-white rounded-[2rem] text-center font-black text-6xl text-blue-600 outline-none focus:border-blue-500 bg-white shadow-xl" />
                        </InputGroup>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900 p-10 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-125 transition-transform duration-700">
                       <i className="fa-solid fa-truck-medical text-9xl"></i>
                    </div>
                    <InputGroup label="Établissements Livrés" description="Nombre total de structures sanitaires servies lors de ce trajet.">
                      <input type="number" name="nbStructuresSanitaire" placeholder="0" value={formData.nbStructuresSanitaire} onChange={handleInputChange} className="w-full mt-6 px-6 py-10 bg-white/10 border-4 border-white/20 rounded-[2.5rem] text-center font-black text-7xl text-white outline-none focus:bg-white/20 focus:border-white/50 transition-all" />
                    </InputGroup>
                  </div>
                </div>

                {aiAnalysis && (
                  <div className="mx-8 mb-12 p-8 bg-gradient-to-r from-purple-50 to-blue-50 rounded-[3rem] border-4 border-white shadow-xl flex gap-8 items-center animate-in zoom-in-95 duration-700">
                    <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-4xl shadow-lg shrink-0">
                       {ICONS.ai}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-1">Analyse IA Temps Réel</p>
                      <p className="text-lg text-slate-800 italic font-medium leading-tight">"{aiAnalysis}"</p>
                    </div>
                  </div>
                )}

                <div className="p-10 bg-slate-50 border-t-4 border-slate-100">
                  <button type="submit" disabled={isSubmitting || !scriptUrl} className="group w-full bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white font-black py-10 px-12 rounded-[2.5rem] shadow-2xl shadow-red-500/30 transition-all active:scale-95 flex items-center justify-center gap-8 text-3xl uppercase tracking-tighter">
                    {isSubmitting ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-cloud-arrow-up group-hover:translate-y-[-4px] transition-transform"></i>}
                    {isSubmitting ? 'Envoi...' : 'Enregistrer'}
                  </button>
                </div>
              </form>
            </div>
            <div className="space-y-10">
               <HistoryList records={records} />
            </div>
          </div>
        ) : (
          <RecapView records={records} lastSync={lastSync} onRefresh={() => fetchRecordsFromSheet(true)} isSyncing={isSyncing} />
        )}
      </main>

      {showToast === 'sync' && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-10 py-5 rounded-full shadow-2xl flex items-center gap-5 z-[100] animate-in slide-in-from-bottom-20 border border-white/10">
          <i className="fa-solid fa-arrows-rotate fa-spin text-blue-400"></i>
          <p className="font-black text-xs uppercase tracking-widest">Synchronisation en cours...</p>
        </div>
      )}
      {showToast === 'error' && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-red-600 text-white px-10 py-5 rounded-full shadow-2xl flex items-center gap-5 z-[100] animate-in slide-in-from-bottom-20">
          <i className="fa-solid fa-circle-exclamation"></i>
          <p className="font-black text-xs uppercase tracking-widest">Échec de la connexion</p>
        </div>
      )}
      {showToast === 'success' && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-green-600 text-white px-12 py-6 rounded-3xl shadow-2xl flex items-center gap-6 z-[100] animate-in slide-in-from-bottom-20">
          <i className="fa-solid fa-check-double text-2xl"></i>
          <div>
            <p className="font-black text-lg uppercase leading-none">Données transmises !</p>
            <p className="text-[10px] opacity-80 font-bold uppercase mt-1">Le fichier Sheet a été mis à jour.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
