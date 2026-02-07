
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { DistributionData, CNTSCI_CENTERS, PRODUCT_TYPES, User } from '../types.ts';
import Chart from 'chart.js/auto';

interface RecapViewProps {
  records: DistributionData[];
  onRefresh?: () => void;
  isSyncing?: boolean;
  isAuthenticated?: boolean;
  currentUser?: User | null;
}

const RecapView: React.FC<RecapViewProps> = ({ records, onRefresh, isSyncing, isAuthenticated, currentUser }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<any>(null);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState('ALL'); 
  const [selectedYear, setSelectedYear] = useState('ALL'); // Par défaut 'ALL' pour voir le total global
  const [selectedSite, setSelectedSite] = useState('TOUS LES SITES');

  const isSuperAgent = useMemo(() => {
    const affectation = currentUser?.centreAffectation || "";
    return affectation.toUpperCase() === "TOUS LES CENTRES CNTSCI" || affectation.toUpperCase() === "DIRECTION GENERALE";
  }, [currentUser]);

  useEffect(() => {
    if (isAuthenticated && currentUser) {
      if (!isSuperAgent) {
        setSelectedSite(currentUser.centreAffectation.trim());
      } else {
        setSelectedSite('TOUS LES SITES');
      }
    }
  }, [isAuthenticated, currentUser, isSuperAgent]);

  const stats = useMemo(() => {
    const dataArray = Array.isArray(records) ? records : [];
    
    const filteredData = dataArray.filter(r => {
      const dateRaw = String(r.dateDistribution || "").split('T')[0].trim();
      if (!dateRaw) return false;

      // Détection intelligente du format (FR vs ISO)
      let y = "";
      let m = "";
      if (dateRaw.includes('-')) { // Format YYYY-MM-DD
        const parts = dateRaw.split('-');
        y = parts[0];
        m = parts[1].padStart(2, '0');
      } else if (dateRaw.includes('/')) { // Format DD/MM/YYYY
        const parts = dateRaw.split('/');
        y = parts[2]?.substring(0, 4);
        m = parts[1].padStart(2, '0');
      }
      
      const recordSite = String(r.centreCntsci || "").trim().toUpperCase();
      const filterSite = selectedSite.trim().toUpperCase();
      
      const siteMatch = filterSite === 'TOUS LES SITES' ? true : recordSite === filterSite;
      const yearMatch = selectedYear === 'ALL' ? true : y === selectedYear;
      const monthMatch = selectedMonth === 'ALL' ? true : m === selectedMonth;

      return yearMatch && monthMatch && siteMatch;
    });

    const s = {
      total: 0,
      cgr: 0,
      plasma: 0,
      plaquettes: 0,
      etablissements: new Set(),
      types: new Set(),
      monthly: Array(12).fill(0).map(() => ({ cgr: 0, plaquettes: 0, plasma: 0 })),
      maxMonth: { name: '---', value: 0 }
    };

    filteredData.forEach(r => {
      const q = Number(r.nbPoches) || 0;
      const t = String(r.typeProduit || "").toUpperCase();
      
      // Extraction mois pour le graphique (utilise la date de distribution)
      const dateRaw = String(r.dateDistribution || "").split('T')[0].trim();
      let mIdx = -1;
      if (dateRaw.includes('-')) mIdx = parseInt(dateRaw.split('-')[1]) - 1;
      else if (dateRaw.includes('/')) mIdx = parseInt(dateRaw.split('/')[1]) - 1;

      s.total += q;
      if (t.includes('CGR')) { 
        s.cgr += q; 
        if (mIdx >= 0 && mIdx < 12) s.monthly[mIdx].cgr += q; 
      }
      else if (t.includes('PLASMA')) { 
        s.plasma += q; 
        if (mIdx >= 0 && mIdx < 12) s.monthly[mIdx].plasma += q; 
      }
      else if (t.includes('PLAQUETTES')) { 
        s.plaquettes += q; 
        if (mIdx >= 0 && mIdx < 12) s.monthly[mIdx].plaquettes += q; 
      }

      if (r.nomStructuresSanitaire) s.etablissements.add(r.nomStructuresSanitaire);
      if (r.typeProduit) s.types.add(r.typeProduit);
    });

    const monthNames = ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUI', 'JUL', 'AOÛ', 'SEP', 'OCT', 'NOV', 'DÉC'];
    let maxV = -1;
    s.monthly.forEach((m, i) => {
      const totalMonth = m.cgr + m.plaquettes + m.plasma;
      if (totalMonth > maxV) { maxV = totalMonth; s.maxMonth = { name: monthNames[i], value: totalMonth }; }
    });

    return s;
  }, [records, selectedYear, selectedMonth, selectedSite]);

  useEffect(() => {
    if (chartRef.current) {
      if (chartInstance.current) chartInstance.current.destroy();
      const ctx = chartRef.current.getContext('2d');
      if (!ctx) return;

      chartInstance.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jui', 'Jui', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'],
          datasets: [
            { label: 'CGR', data: stats.monthly.map(m => m.cgr), borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', fill: true, tension: 0.4, pointRadius: 0 },
            { label: 'Plaquettes', data: stats.monthly.map(m => m.plaquettes), borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)', fill: true, tension: 0.4, pointRadius: 0 },
            { label: 'Plasma', data: stats.monthly.map(m => m.plasma), borderColor: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.1)', fill: true, tension: 0.4, pointRadius: 0 }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, grid: { color: '#e2e8f0' } },
            x: { grid: { display: false } }
          }
        }
      });
    }
  }, [stats]);

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
           <div className="bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100 flex items-center gap-2">
             <i className="fa-solid fa-location-dot text-red-500 text-[10px]"></i>
             <span className="text-[10px] font-black uppercase text-red-600 truncate max-w-[150px]">{selectedSite}</span>
           </div>
           <div className="bg-indigo-50 px-4 py-2 rounded-full shadow-sm border border-indigo-100 flex items-center gap-2">
             <i className="fa-solid fa-calendar text-indigo-500 text-[10px]"></i>
             <span className="text-[10px] font-black uppercase text-indigo-600">{now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
           </div>
        </div>

        <div className="flex items-center gap-3 bg-white p-1.5 rounded-full shadow-lg border border-slate-100">
           <div className="flex items-center gap-4 px-4">
             <i className="fa-solid fa-filter text-slate-300 text-xs"></i>
             <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="text-[10px] font-black uppercase outline-none bg-transparent">
               <option value="ALL">TOUS LES MOIS</option>
               {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => <option key={m} value={m}>{new Date(2000, parseInt(m)-1).toLocaleString('fr', {month: 'short'}).toUpperCase()}</option>)}
             </select>
             <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="text-[10px] font-black uppercase outline-none bg-transparent">
               <option value="ALL">TOUTES LES ANNÉES</option>
               {Array.from({length: 5}, (_, i) => (now.getFullYear() - 2 + i).toString()).map(y => <option key={y} value={y}>{y}</option>)}
             </select>
           </div>
           {isSuperAgent && (
             <div className="border-l border-slate-100 pl-4 pr-2 flex items-center gap-3">
               <i className="fa-solid fa-globe text-red-500 text-xs"></i>
               <select value={selectedSite} onChange={e => setSelectedSite(e.target.value)} className="text-[10px] font-black uppercase outline-none bg-transparent min-w-[120px]">
                 <option value="TOUS LES SITES">TOUS LES SITES</option>
                 {CNTSCI_CENTERS.map(c => <option key={c} value={c}>{c}</option>)}
               </select>
             </div>
           )}
           <button onClick={onRefresh} className="w-8 h-8 flex items-center justify-center bg-green-500 text-white rounded-full hover:rotate-180 transition-all duration-500">
             <i className={`fa-solid fa-sync text-xs ${isSyncing ? 'fa-spin' : ''}`}></i>
           </button>
        </div>
      </div>

      <div className="flex items-end justify-between">
        <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">
          {selectedYear === 'ALL' ? 'Cumul Global' : `Bilan ${selectedYear}`}
        </h1>
        <div className="flex gap-2">
           <div className="px-4 py-2 bg-slate-900 text-white text-[9px] font-black rounded-xl uppercase tracking-widest border border-white/10">
             Effectif: {records.length} lignes
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <MiniStatCard title="Total Poches Servies" value={stats.total} icon="fa-database" color="text-red-500" bgColor="bg-red-50" />
        <MiniStatCard title="Poches rendues" value="0" icon="fa-rotate-left" color="text-purple-500" bgColor="bg-purple-50" />
        <MiniStatCard title="Établissements" value={stats.etablissements.size} icon="fa-hospital" color="text-blue-500" bgColor="bg-blue-50" />
        <MiniStatCard title="Types produits" value={stats.types.size} icon="fa-cube" color="text-orange-500" bgColor="bg-orange-50" />
        <MiniStatCard title="Concentrés (CGR)" value={stats.cgr} icon="fa-wave-square" color="text-indigo-500" bgColor="bg-indigo-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white p-10 rounded-[3rem] shadow-xl border border-slate-50 relative overflow-hidden group">
          <div className="absolute top-1/2 right-[-20px] -translate-y-1/2 opacity-5 scale-150">
            <i className="fa-solid fa-database text-[12rem]"></i>
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-4">Volume Distribution - {selectedSite}</p>
            <h2 className="text-8xl font-black text-slate-900 tracking-tighter mb-8">{stats.total}</h2>
            <div className="flex gap-3">
              <span className="px-6 py-2 bg-red-600 text-white text-[10px] font-black rounded-full uppercase tracking-widest shadow-lg shadow-red-600/30">Poches Servies</span>
              <span className="px-6 py-2 bg-slate-100 text-slate-500 text-[10px] font-black rounded-full uppercase tracking-widest">Base de Données</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-50 h-1/2 flex flex-col justify-center">
             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 text-right">Moyenne mensuelle</p>
             <p className="text-5xl font-black text-slate-900 text-right">{stats.total > 0 ? Math.round(stats.total / 12) : 0}</p>
          </div>
          <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-50 h-1/2 flex flex-col justify-center">
             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 text-right">Pic d'activité</p>
             <p className="text-4xl font-black text-slate-900 text-right uppercase">{stats.maxMonth.name}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-12 rounded-[3.5rem] shadow-xl border border-slate-50">
        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-2">Évolution Temporelle</h3>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-12">Analyse comparative des produits sanguins - {selectedSite}</p>
        <div className="h-[400px] w-full">
          <canvas ref={chartRef}></canvas>
        </div>
      </div>
    </div>
  );
};

const MiniStatCard = ({ title, value, icon, color, bgColor }: any) => (
  <div className="bg-white p-6 rounded-[2rem] shadow-md border border-slate-50 flex items-center justify-between group hover:shadow-xl transition-all">
    <div className="flex-1 min-w-0">
      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 truncate">{title}</p>
      <p className="text-2xl font-black text-slate-900 tracking-tighter">{value}</p>
    </div>
    <div className={`w-10 h-10 ${bgColor} ${color} rounded-2xl flex-shrink-0 flex items-center justify-center text-sm shadow-sm ml-4`}>
      <i className={`fa-solid ${icon}`}></i>
    </div>
  </div>
);

export default RecapView;
