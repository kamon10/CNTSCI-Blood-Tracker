
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { DistributionData, CNTSCI_CENTERS, CENTER_STRUCTURES_MAP, PRODUCT_TYPES, BLOOD_GROUPS } from './types.ts';
import InputGroup from './components/InputGroup.tsx';
import HistoryList from './components/HistoryList.tsx';
import ScriptInstruction from './components/ScriptInstruction.tsx';
import RecapView from './components/RecapView.tsx';
import WeeklyView from './components/WeeklyView.tsx';
import { analyzeDistribution } from './services/geminiService.ts';

const DEFAULT_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxQtjU9L4SNAcG-HLEz9tW0hH19XaI10CnOjjVY61Qltl4ob62oCkt6Cl5rkiHcmbMknw/exec";

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'form' | 'recap' | 'weekly'>('form');
  const [isSyncing, setIsSyncing] = useState(false);
  const isFetchingRef = useRef(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [scriptUrl, setScriptUrl] = useState<string>(() => localStorage.getItem('cntsci_script_url') || DEFAULT_SCRIPT_URL);
  const [showSettings, setShowSettings] = useState(false);
  
  const [formData, setFormData] = useState<any>({
    nomAgent: localStorage.getItem('cntsci_last_agent') || '',
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
  const [showToast, setShowToast] = useState<'success' | 'error' | 'sync' | null>(null);

  const structureSuggestions = useMemo(() => {
    return CENTER_STRUCTURES_MAP[formData.centreCntsci] || [];
  }, [formData.centreCntsci]);

  const fetchRecordsFromSheet = useCallback(async (showNotification = false) => {
    if (!scriptUrl || isFetchingRef.current) return;
    
    isFetchingRef.current = true;
    setIsSyncing(true);
    if (showNotification) setShowToast('sync');
    
    try {
      const response = await fetch(`${scriptUrl}?action=get_dist&_t=${Date.now()}`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setRecords(data);
        setLastSync(new Date().toLocaleTimeString('fr-FR'));
      }
    } catch (e) {
      console.error("Fetch error:", e);
      if (showNotification) setShowToast('error');
    } finally {
      setIsSyncing(false);
      isFetchingRef.current = false;
      setTimeout(() => setShowToast(null), 3000);
    }
  }, [scriptUrl]);

  useEffect(() => {
    if (scriptUrl) {
      fetchRecordsFromSheet();
    }
  }, [fetchRecordsFromSheet, scriptUrl]);

  const handleUrlChange = (url: string) => {
    const cleanUrl = url.trim().replace(/\s/g, '');
    setScriptUrl(cleanUrl);
    localStorage.setItem('cntsci_script_url', cleanUrl);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'nomAgent') {
      localStorage.setItem('cntsci_last_agent', value);
    }
    setFormData(prev => ({
      ...prev,
      [name]: name === 'nbPoches' ? (value === '' ? '' : Math.max(0, parseInt(value) || 0)) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scriptUrl) {
      setShowSettings(true);
      setShowToast('error');
      return;
    }
    setIsSubmitting(true);
    
    const now = new Date();
    const finalData = {
      horodateur: now.toLocaleString('fr-FR'),
      nomAgent: formData.nomAgent || 'Agent Anonyme',
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
      await fetch(`${scriptUrl}?${params.toString()}`, { method: 'GET' });
      setShowToast('success');
      resetForm();
      setTimeout(() => fetchRecordsFromSheet(false), 2000);
      analyzeDistribution(finalData as any).then(setAiAnalysis);
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
      nbPoches: '',
    }));
    setAiAnalysis(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="sticky top-0 z-[100] px-4 pt-4 md:px-8">
        <div className="max-w-7xl mx-auto bg-slate-900 p-4 rounded-[2rem] shadow-2xl flex justify-between items-center ring-1 ring-white/10">
          <div className="flex items-center gap-4 pl-2">
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-red-600/20">
              <i className="fa-solid fa-chart-line"></i>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-white font-black text-sm uppercase tracking-tighter">CNTSCI <span className="text-red-500">Flux</span></h1>
              <p className="text-[9px] font-bold text-slate-500 uppercase">Analytics Dashboard v12.0</p>
            </div>
          </div>
          
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
            <button 
              onClick={() => setActiveTab('form')} 
              className={`px-4 sm:px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'form' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-white'}`}
            >
              Saisie
            </button>
            <button 
              onClick={() => setActiveTab('recap')} 
              className={`px-4 sm:px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'recap' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-white'}`}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('weekly')} 
              className={`px-4 sm:px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'weekly' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-white'}`}
            >
              Semaine
            </button>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setShowSettings(!showSettings)} className={`w-10 h-10 border rounded-xl flex items-center justify-center transition-all ${showSettings ? 'bg-red-600 border-red-600 text-white shadow-lg' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}>
              <i className="fa-solid fa-gear"></i>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        {showSettings && (
          <div className="mb-8 bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-200 animate-in slide-in-from-top-4">
             <div className="space-y-4 mb-6">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Endpoint Web App (/exec)</label>
                <input type="text" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-[10px] font-mono outline-none focus:border-red-500 transition-all" value={scriptUrl} onChange={(e) => handleUrlChange(e.target.value)} placeholder="https://script.google.com/..." />
             </div>
             <ScriptInstruction />
          </div>
        )}

        <div className={activeTab === 'form' ? 'block' : 'hidden'}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8">
              <form onSubmit={handleSubmit} className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
                <div className="bg-slate-900 p-8 flex justify-between items-center text-white">
                  <div className="flex items-center gap-3">
                    <i className="fa-solid fa-pen-to-square text-red-500"></i>
                    <h2 className="font-black uppercase tracking-widest text-xs">Mouvement Unitaire</h2>
                  </div>
                  <button type="button" onClick={resetForm} className="text-slate-400 hover:text-white transition-colors text-xs"><i className="fa-solid fa-arrow-rotate-left"></i></button>
                </div>

                <div className="p-8 md:p-12 space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <InputGroup label="Agent de Saisie" icon={<i className="fa-solid fa-user-edit text-red-500"></i>}>
                      <input type="text" name="nomAgent" required placeholder="Votre nom" value={formData.nomAgent} onChange={handleInputChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 focus:border-red-500 outline-none transition-all" />
                    </InputGroup>
                    <InputGroup label="Date Distribution" icon={<i className="fa-solid fa-calendar text-red-500"></i>}>
                      <input type="date" name="dateDistribution" required value={formData.dateDistribution} onChange={handleInputChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 focus:border-red-500 outline-none transition-all" />
                    </InputGroup>
                    <InputGroup label="Centre CNTSCI" icon={<i className="fa-solid fa-hospital text-red-500"></i>}>
                      <select name="centreCntsci" value={formData.centreCntsci} onChange={handleInputChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-900 appearance-none focus:border-red-500 outline-none transition-all">
                        {CNTSCI_CENTERS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </InputGroup>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200">
                    <InputGroup label="Structure Sanitaire Servie" icon={<i className="fa-solid fa-map-location text-red-500"></i>}>
                      <input 
                        list="structures-list"
                        type="text" 
                        name="nomStructuresSanitaire" 
                        required 
                        placeholder="Chercher l'établissement rattaché..." 
                        value={formData.nomStructuresSanitaire} 
                        onChange={handleInputChange} 
                        className="w-full px-6 py-5 bg-white border-2 border-slate-100 rounded-2xl font-bold text-slate-800 focus:border-red-500 outline-none transition-all" 
                      />
                      <datalist id="structures-list">
                        {structureSuggestions.map((s, idx) => (
                          <option key={idx} value={s} />
                        ))}
                      </datalist>
                    </InputGroup>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="p-8 bg-slate-900 rounded-[2.5rem] shadow-xl space-y-8">
                       <InputGroup label="Type de Produit" icon={<i className="fa-solid fa-vial text-red-500"></i>}>
                          <select name="typeProduit" value={formData.typeProduit} onChange={handleInputChange} className="w-full px-6 py-4 bg-white/5 border-2 border-white/10 rounded-2xl font-black text-white appearance-none focus:border-red-500 outline-none transition-all">
                            {PRODUCT_TYPES.map(p => <option key={p} value={p} className="text-slate-900">{p}</option>)}
                          </select>
                       </InputGroup>

                       <InputGroup label="Groupe Sanguin (SA_GROUPE)" icon={<i className="fa-solid fa-dna text-red-500"></i>}>
                          <div className="grid grid-cols-4 gap-2">
                            {BLOOD_GROUPS.map(g => (
                              <button 
                                key={g} 
                                type="button"
                                onClick={() => setFormData({...formData, saGroupe: g})}
                                className={`py-3 rounded-xl text-[10px] font-black transition-all border-2 ${formData.saGroupe === g ? 'bg-red-600 border-red-600 text-white' : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/20'}`}
                              >
                                {g}
                              </button>
                            ))}
                          </div>
                       </InputGroup>
                    </div>

                    <div className="p-8 bg-red-50/50 rounded-[2.5rem] border border-red-100 flex flex-col justify-center items-center text-center space-y-6">
                      <i className="fa-solid fa-cubes-stacked text-4xl text-red-200"></i>
                      <InputGroup label="Quantité servie" description="Nombre exact d'unités pour ce produit/groupe.">
                        <input 
                          type="number" 
                          name="nbPoches" 
                          required
                          placeholder="0" 
                          value={formData.nbPoches} 
                          onChange={handleInputChange} 
                          className="w-full px-6 py-6 bg-white border-2 border-red-200 rounded-3xl text-center font-black text-5xl text-red-600 focus:border-red-500 outline-none transition-all shadow-inner" 
                        />
                      </InputGroup>
                    </div>
                  </div>

                  {aiAnalysis && (
                    <div className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl border border-indigo-100 flex gap-5 items-start animate-in zoom-in-95">
                      <div className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-purple-600 shrink-0"><i className="fa-solid fa-wand-magic-sparkles"></i></div>
                      <p className="text-sm font-medium text-slate-700 italic leading-snug">"{aiAnalysis}"</p>
                    </div>
                  )}

                  <button type="submit" disabled={isSubmitting} className="w-full group bg-slate-900 hover:bg-red-600 text-white font-black py-7 rounded-[2rem] shadow-2xl transition-all duration-500 active:scale-[0.98] disabled:bg-slate-300 flex items-center justify-center gap-4 text-sm uppercase tracking-widest">
                    {isSubmitting ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-check-to-slot"></i>}
                    {isSubmitting ? 'Enregistrement...' : 'Valider la distribution'}
                  </button>
                </div>
              </form>
            </div>
            
            <div className="lg:col-span-4 sticky top-32">
              <HistoryList records={records} />
            </div>
          </div>
        </div>

        <div className={activeTab === 'recap' ? 'block' : 'hidden'}>
          <RecapView 
            records={records} 
            lastSync={lastSync} 
            onRefresh={() => fetchRecordsFromSheet(true)} 
            isSyncing={isSyncing} 
          />
        </div>

        <div className={activeTab === 'weekly' ? 'block' : 'hidden'}>
          <WeeklyView 
            records={records} 
            onRefresh={() => fetchRecordsFromSheet(true)} 
            isSyncing={isSyncing} 
          />
        </div>
      </main>

      {showToast && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-8 py-4 rounded-3xl shadow-2xl border border-white/10 flex items-center gap-4 z-[200] animate-in slide-in-from-bottom-10 ${showToast === 'success' ? 'bg-slate-900 text-white' : 'bg-red-600 text-white'}`}>
          <i className={`fa-solid ${showToast === 'success' ? 'fa-check-circle text-green-400' : 'fa-triangle-exclamation'}`}></i>
          <p className="text-[10px] font-black uppercase tracking-widest">{showToast === 'success' ? 'Mouvement synchronisé' : 'Erreur de configuration'}</p>
        </div>
      )}
    </div>
  );
};

export default App;
