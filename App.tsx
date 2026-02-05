
import React, { useState, useEffect, useMemo } from 'react';
import { DistributionData, CNTSCI_CENTERS } from './types';
import { ICONS, APP_THEME } from './constants';
import InputGroup from './components/InputGroup';
import HistoryList from './components/HistoryList';
import ScriptInstruction from './components/ScriptInstruction';
import { analyzeDistribution } from './services/geminiService';

const DEFAULT_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzhHFr8F3gvFnEcs4hgFVgbGacbTZVt14GoDQvrpz0pKEAMl6vA_1fWLedOCMGYZxXLMA/exec";

const App: React.FC = () => {
  const [formData, setFormData] = useState<DistributionData>({
    horodateur: '',
    nomAgent: '',
    dateDistribution: new Date().toISOString().split('T')[0],
    centreCntsci: CNTSCI_CENTERS[0],
    nbCgrAdulte: 0,
    nbCgrPediatrique: 0,
    nbPlasma: 0,
    nbPlaquettes: 0,
    nbStructuresSanitaire: 0,
  });

  const [records, setRecords] = useState<DistributionData[]>([]);
  const [appScriptUrl, setAppScriptUrl] = useState<string>(DEFAULT_SCRIPT_URL);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [showToast, setShowToast] = useState<'success' | 'error' | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [centerSearch, setCenterSearch] = useState('');

  const filteredCenters = useMemo(() => {
    return CNTSCI_CENTERS.filter(c => 
      c.toLowerCase().includes(centerSearch.toLowerCase())
    );
  }, [centerSearch]);

  useEffect(() => {
    const savedRecords = localStorage.getItem('cntsci_records');
    const savedUrl = localStorage.getItem('cntsci_script_url');
    if (savedRecords) setRecords(JSON.parse(savedRecords));
    if (savedUrl) setAppScriptUrl(savedUrl);
  }, []);

  const saveUrl = (url: string) => {
    setAppScriptUrl(url);
    localStorage.setItem('cntsci_script_url', url);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.startsWith('nb') ? Math.max(0, parseInt(value) || 0) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appScriptUrl) {
      setShowSettings(true);
      return;
    }

    setIsSubmitting(true);
    setAiAnalysis(null);

    const now = new Date();
    // Formatage de la date pour le Sheet (JJ/MM/AAAA HH:MM:SS)
    const horodateur = now.getDate().toString().padStart(2, '0') + '/' + 
                      (now.getMonth()+1).toString().padStart(2, '0') + '/' + 
                      now.getFullYear() + ' ' + 
                      now.getHours().toString().padStart(2, '0') + ':' + 
                      now.getMinutes().toString().padStart(2, '0') + ':' + 
                      now.getSeconds().toString().padStart(2, '0');

    const newRecord: DistributionData = {
      ...formData,
      horodateur: horodateur,
      id: now.getTime().toString(),
    };

    try {
      // Utilisation de text/plain pour éviter les problèmes de CORS préflight avec Apps Script
      await fetch(appScriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(newRecord),
      });

      // Analyse IA en arrière-plan
      analyzeDistribution(newRecord).then(setAiAnalysis);

      const updatedRecords = [...records, newRecord];
      setRecords(updatedRecords);
      localStorage.setItem('cntsci_records', JSON.stringify(updatedRecords));

      setShowToast('success');
      setTimeout(() => setShowToast(null), 3000);
      resetCounts();
    } catch (error) {
      console.error("Erreur d'envoi:", error);
      setShowToast('error');
      setTimeout(() => setShowToast(null), 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetCounts = () => {
    setFormData(prev => ({
      ...prev,
      nbCgrAdulte: 0,
      nbCgrPediatrique: 0,
      nbPlasma: 0,
      nbPlaquettes: 0,
      nbStructuresSanitaire: 0,
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 lg:pb-0 font-sans">
      <header className={`${APP_THEME.secondary} text-white p-6 shadow-md sticky top-0 z-40`}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-red-600 p-3 rounded-xl shadow-lg">
              <i className="fa-solid fa-droplet text-2xl text-white"></i>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">CNTSCI Distribution</h1>
              <div className="flex items-center gap-2">
                <p className="text-slate-400 text-[10px] uppercase tracking-widest font-bold">Base : "BASE DIST"</p>
                <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg transition-colors border ${showSettings ? 'bg-white text-slate-900 border-white' : 'bg-white/5 text-white border-white/10 hover:bg-white/10'}`}
          >
            {ICONS.settings} Paramètres
          </button>
        </div>
      </header>

      {showSettings && (
        <div className="max-w-6xl mx-auto px-4 mt-4 animate-in slide-in-from-top-2">
          <div className="bg-white rounded-2xl p-6 shadow-xl border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">{ICONS.settings} Configuration de la liaison</h2>
            <div className="space-y-4">
              <InputGroup label="URL Apps Script" description="C'est l'URL de votre déploiement 'Application Web'.">
                <input
                  type="url"
                  value={appScriptUrl}
                  onChange={(e) => saveUrl(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none font-mono text-xs focus:ring-2 focus:ring-red-500"
                />
              </InputGroup>
              <ScriptInstruction />
            </div>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 bg-slate-50 border-b border-slate-100 font-bold text-slate-800 uppercase text-xs tracking-wider">
              {ICONS.plus} Saisie de distribution
            </div>

            <div className="p-6 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                <InputGroup label="Nom de l'agent" icon={ICONS.agent}>
                  <input
                    type="text"
                    name="nomAgent"
                    required
                    placeholder="Votre nom"
                    value={formData.nomAgent}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-red-500"
                  />
                </InputGroup>
                <InputGroup label="Date de distribution" icon={ICONS.calendar}>
                  <input
                    type="date"
                    name="dateDistribution"
                    required
                    value={formData.dateDistribution}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-red-500"
                  />
                </InputGroup>
              </div>

              <InputGroup label="Centre CNTSCI" icon={ICONS.center}>
                <div className="space-y-2">
                  <div className="relative">
                    <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                    <input 
                      type="text" 
                      placeholder="Filtrer les centres..." 
                      className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-red-500"
                      value={centerSearch}
                      onChange={(e) => setCenterSearch(e.target.value)}
                    />
                  </div>
                  <select
                    name="centreCntsci"
                    value={formData.centreCntsci}
                    onChange={handleInputChange}
                    className="w-full px-4 py-4 border border-slate-300 rounded-xl outline-none bg-white font-bold text-slate-700"
                  >
                    {filteredCenters.map(center => (
                      <option key={center} value={center}>{center}</option>
                    ))}
                  </select>
                </div>
              </InputGroup>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-red-600 uppercase tracking-widest border-b pb-2">Concentrés de Globules Rouges</h3>
                  <InputGroup label="Nombre de CGR ADULTE">
                    <input type="number" name="nbCgrAdulte" value={formData.nbCgrAdulte} onChange={handleInputChange} className="w-full px-4 py-4 border border-slate-300 rounded-2xl text-center font-bold text-3xl focus:ring-2 focus:ring-red-500 outline-none" />
                  </InputGroup>
                  <InputGroup label="Nombre de CGR PEDIATRIQUE">
                    <input type="number" name="nbCgrPediatrique" value={formData.nbCgrPediatrique} onChange={handleInputChange} className="w-full px-4 py-4 border border-slate-300 rounded-2xl text-center font-bold text-3xl focus:ring-2 focus:ring-red-500 outline-none" />
                  </InputGroup>
                </div>

                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b pb-2">Plasma & Plaquettes</h3>
                  <InputGroup label="Nombre de PLASMA">
                    <input type="number" name="nbPlasma" value={formData.nbPlasma} onChange={handleInputChange} className="w-full px-4 py-4 border border-slate-300 rounded-2xl text-center font-bold text-3xl focus:ring-2 focus:ring-blue-500 outline-none" />
                  </InputGroup>
                  <InputGroup label="Nombre PLAQUETTES">
                    <input type="number" name="nbPlaquettes" value={formData.nbPlaquettes} onChange={handleInputChange} className="w-full px-4 py-4 border border-slate-300 rounded-2xl text-center font-bold text-3xl focus:ring-2 focus:ring-blue-500 outline-none" />
                  </InputGroup>
                </div>
              </div>

              <div className="bg-slate-900 p-6 rounded-2xl text-white">
                <InputGroup label="Nombre Structures Sanitaire" description="Total des hôpitaux/cliniques servis.">
                  <input type="number" name="nbStructuresSanitaire" value={formData.nbStructuresSanitaire} onChange={handleInputChange} className="w-full px-4 py-4 bg-white/10 border border-white/20 rounded-2xl text-center font-black text-4xl text-white outline-none focus:bg-white/20" />
                </InputGroup>
              </div>
            </div>

            {aiAnalysis && (
              <div className="mx-6 mb-6 p-4 bg-purple-50 rounded-xl border border-purple-100 flex gap-4 animate-in fade-in">
                <div className="text-xl">{ICONS.ai}</div>
                <p className="text-xs text-purple-900 italic leading-relaxed font-medium">"{aiAnalysis}"</p>
              </div>
            )}

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white font-bold py-5 px-16 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center gap-4 text-lg"
              >
                {isSubmitting ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-cloud-arrow-up"></i>}
                {isSubmitting ? 'Enregistrement...' : 'Enregistrer dans le Sheet'}
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-6 text-xs uppercase tracking-widest flex items-center gap-2 border-b pb-3">
              <i className="fa-solid fa-chart-line text-red-500"></i> Totaux Session
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-red-50 rounded-2xl">
                <span className="text-[10px] font-black text-red-600 uppercase">CGR Totaux</span>
                <span className="text-3xl font-black text-red-700">{records.reduce((a,b) => a + b.nbCgrAdulte + b.nbCgrPediatrique, 0)}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-blue-50 rounded-2xl">
                <span className="text-[10px] font-black text-blue-600 uppercase">Plaq/Plasma</span>
                <span className="text-3xl font-black text-blue-700">{records.reduce((a,b) => a + b.nbPlasma + b.nbPlaquettes, 0)}</span>
              </div>
            </div>
          </div>
          <HistoryList records={records} />
        </div>
      </main>

      {showToast === 'success' && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-5 rounded-3xl shadow-2xl flex items-center gap-4 z-50 animate-in slide-in-from-bottom-10">
          <i className="fa-solid fa-circle-check text-green-400 text-2xl"></i>
          <span className="font-bold">Données transmises avec succès !</span>
        </div>
      )}

      {showToast === 'error' && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-red-600 text-white px-8 py-5 rounded-3xl shadow-2xl flex items-center gap-4 z-50 animate-in slide-in-from-bottom-10">
          <i className="fa-solid fa-triangle-exclamation text-white text-2xl"></i>
          <span className="font-bold">Erreur : Vérifiez votre connexion ou l'URL du script.</span>
        </div>
      )}
    </div>
  );
};

export default App;
