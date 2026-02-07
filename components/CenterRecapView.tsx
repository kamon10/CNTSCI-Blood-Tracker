
import React, { useMemo, useEffect, useRef, useState } from 'react';
import { DistributionData, User, CNTSCI_CENTERS, BLOOD_GROUPS, PRODUCT_TYPES } from '../types.ts';
import Chart from 'chart.js/auto';

interface CenterRecapViewProps {
  records: DistributionData[];
  currentUser: User | null;
  onRefresh?: () => void;
  isSyncing?: boolean;
}

const CenterRecapView: React.FC<CenterRecapViewProps> = ({ records, currentUser, onRefresh, isSyncing }) => {
  const barChartRef = useRef<HTMLCanvasElement>(null);
  const donutChartRef = useRef<HTMLCanvasElement>(null);
  const barChartInstance = useRef<any>(null);
  const donutChartInstance = useRef<any>(null);

  const now = new Date();
  const [selectedDay, setSelectedDay] = useState('ALL'); // Par défaut 'ALL' pour voir tout le mois/année
  const [selectedMonth, setSelectedMonth] = useState('ALL'); 
  const [selectedYear, setSelectedYear] = useState('ALL'); 
  const [selectedSite, setSelectedSite] = useState('TOUS LES SITES');

  const isSuperAgent = useMemo(() => {
    const affectation = (currentUser?.centreAffectation || "").trim().toUpperCase();
    return affectation === "TOUS LES CENTRES CNTSCI" || affectation === "DIRECTION GENERALE";
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      if (!isSuperAgent) {
        setSelectedSite(currentUser.centreAffectation.trim());
      } else {
        setSelectedSite('TOUS LES SITES');
      }
    }
  }, [currentUser, isSuperAgent]);

  const stats = useMemo(() => {
    const dataArray = Array.isArray(records) ? records : [];
    
    const filteredData = dataArray.filter(r => {
      const dateRaw = String(r.dateDistribution || "").split('T')[0].trim();
      if (!dateRaw) return false;

      // Détection intelligente du format (FR vs ISO)
      let d = "";
      let m = "";
      let y = "";
      
      if (dateRaw.includes('-')) { // Format YYYY-MM-DD
        const parts = dateRaw.split('-');
        y = parts[0];
        m = parts[1].padStart(2, '0');
        d = parts[2].substring(0, 2).padStart(2, '0');
      } else if (dateRaw.includes('/')) { // Format DD/MM/YYYY
        const parts = dateRaw.split('/');
        d = parts[0].padStart(2, '0');
        m = parts[1].padStart(2, '0');
        y = parts[2]?.substring(0, 4);
      }
      
      const recordSite = String(r.centreCntsci || "").trim().toUpperCase();
      const filterSite = selectedSite.trim().toUpperCase();
      
      const siteMatch = filterSite === 'TOUS LES SITES' ? true : recordSite === filterSite;
      const yearMatch = selectedYear === 'ALL' ? true : y === selectedYear;
      const monthMatch = selectedMonth === 'ALL' ? true : m === selectedMonth;
      const dayMatch = selectedDay === 'ALL' ? true : d === selectedDay;

      return siteMatch && yearMatch && monthMatch && dayMatch;
    });

    const s = {
      total: 0,
      cgr: 0,
      etablissements: new Set(),
      types: new Set(),
      groups: BLOOD_GROUPS.reduce((acc, g) => ({...acc, [g]: 0}), {} as any),
      productTypes: PRODUCT_TYPES.reduce((acc, t) => ({...acc, [t]: 0}), {} as any)
    };

    filteredData.forEach(r => {
      const q = Number(r.nbPoches) || 0;
      s.total += q;
      if (r.nomStructuresSanitaire) s.etablissements.add(r.nomStructuresSanitaire);
      if (r.typeProduit) {
        s.types.add(r.typeProduit);
        const pType = String(r.typeProduit);
        s.productTypes[pType] = (s.productTypes[pType] || 0) + q;
        if (pType.toUpperCase().includes('CGR')) s.cgr += q;
      }
      if (r.saGroupe) {
        const grp = String(r.saGroupe).trim();
        s.groups[grp] = (s.groups[grp] || 0) + q;
      }
    });

    return s;
  }, [records, selectedDay, selectedMonth, selectedYear, selectedSite]);

  useEffect(() => {
    if (barChartRef.current) {
      if (barChartInstance.current) barChartInstance.current.destroy();
      barChartInstance.current = new Chart(barChartRef.current, {
        type: 'bar',
        data: {
          labels: BLOOD_GROUPS,
          datasets: [{
            data: BLOOD_GROUPS.map(g => stats.groups[g]),
            backgroundColor: ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'],
            borderRadius: 12,
            barThickness: 32
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { 
            y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, 
            x: { grid: { display: false } } 
          }
        }
      });
    }

    if (donutChartRef.current) {
      if (donutChartInstance.current) donutChartInstance.current.destroy();
      donutChartInstance.current = new Chart(donutChartRef.current, {
        type: 'doughnut',
        data: {
          labels: PRODUCT_TYPES,
          datasets: [{
            data: PRODUCT_TYPES.map(t => stats.productTypes[t]),
            backgroundColor: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#facc15'],
            borderWidth: 0,
            hoverOffset: 15
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '75%',
          plugins: { legend: { display: false } }
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
             <i className="fa-solid fa-calendar-check text-indigo-500 text-[10px]"></i>
             <span className="text-[10px] font-black uppercase text-indigo-600">Vue Analytique</span>
           </div>
        </div>

        <div className="flex items-center gap-3 bg-white p-1.5 rounded-full shadow-lg border border-slate-100">
           <div className="flex items-center gap-4 px-4">
             <i className="fa-solid fa-filter text-slate-300 text-xs"></i>
             <select value={selectedDay} onChange={e => setSelectedDay(e.target.value)} className="text-[10px] font-black uppercase outline-none bg-transparent">
               <option value="ALL">JOURS (TOUS)</option>
               {Array.from({length: 31}, (_, i) => (i+1).toString().padStart(2, '0')).map(d => <option key={d} value={d}>{d}</option>)}
             </select>
             <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="text-[10px] font-black uppercase outline-none bg-transparent">
               <option value="ALL">MOIS (TOUS)</option>
               {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => <option key={m} value={m}>{new Date(2000, parseInt(m)-1).toLocaleString('fr', {month: 'short'}).toUpperCase()}</option>)}
             </select>
             <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="text-[10px] font-black uppercase outline-none bg-transparent">
               <option value="ALL">ANNÉES (TOUTES)</option>
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
           <button onClick={onRefresh} className="w-8 h-8 flex items-center justify-center bg-green-500 text-white rounded-full transition-transform active:rotate-180">
             <i className={`fa-solid fa-sync text-xs ${isSyncing ? 'fa-spin' : ''}`}></i>
           </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Bilan {selectedSite}</h1>
        <div className="px-3 py-1 bg-red-600 text-white text-[8px] font-black rounded-lg tracking-widest animate-pulse">LIVE</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <MiniCard title="Total Servies" value={stats.total} icon="fa-database" color="text-red-500" bgColor="bg-red-50" />
        <MiniCard title="Poches rendues" value="0" icon="fa-rotate-left" color="text-purple-500" bgColor="bg-purple-50" />
        <MiniCard title="Structures servies" value={stats.etablissements.size} icon="fa-hospital" color="text-blue-500" bgColor="bg-blue-50" />
        <MiniCard title="Produits différents" value={stats.types.size} icon="fa-cube" color="text-orange-500" bgColor="bg-orange-50" />
        <MiniCard title="Volume CGR" value={stats.cgr} icon="fa-wave-square" color="text-indigo-500" bgColor="bg-indigo-50" />
      </div>

      <div className="bg-white p-12 rounded-[3.5rem] shadow-xl border border-slate-50 relative overflow-hidden group">
        <div className="flex items-center gap-3 mb-2 text-red-600">
          <i className="fa-solid fa-droplet text-sm"></i>
          <h3 className="text-xl font-black uppercase tracking-tighter">Indicateurs de Performance</h3>
        </div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-12">Données consolidées pour {selectedSite}</p>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
          <div className="lg:col-span-6 bg-slate-50 p-10 rounded-[2.5rem] border border-slate-100 flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Volume total distribué</p>
              <div className="flex items-baseline gap-4">
                <span className="text-7xl font-black text-slate-900 tracking-tighter">{stats.total}</span>
                <span className="text-xl font-black text-red-500 uppercase tracking-widest">Poches</span>
              </div>
            </div>
            <div className="mt-8 flex gap-3">
              <div className="flex-1 h-2 bg-red-100 rounded-full overflow-hidden">
                <div className="h-full bg-red-500" style={{width: '75%'}}></div>
              </div>
              <span className="text-[10px] font-black text-slate-400">Capacité</span>
            </div>
          </div>
          
          <div className="lg:col-span-6 grid grid-cols-2 gap-6">
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-center items-center text-center">
               <i className="fa-solid fa-hospital-user text-3xl text-blue-500 mb-4"></i>
               <p className="text-2xl font-black text-slate-900">{stats.etablissements.size}</p>
               <p className="text-[8px] font-black text-slate-400 uppercase mt-2">Établissements</p>
            </div>
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-center items-center text-center">
               <i className="fa-solid fa-microscope text-3xl text-indigo-500 mb-4"></i>
               <p className="text-2xl font-black text-slate-900">{stats.types.size}</p>
               <p className="text-[8px] font-black text-slate-400 uppercase mt-2">Catégories PSL</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 bg-white p-12 rounded-[3.5rem] shadow-xl border border-slate-50">
          <div className="flex items-center justify-between mb-10">
             <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">Distribution par Groupes</h4>
             </div>
             <span className="text-[9px] font-black text-slate-400 uppercase">Unités / Groupe</span>
          </div>
          <div className="h-[350px] w-full">
            <canvas ref={barChartRef}></canvas>
          </div>
        </div>

        <div className="lg:col-span-5 bg-white p-12 rounded-[3.5rem] shadow-xl border border-slate-50">
          <div className="flex items-center justify-between mb-10">
             <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">Mix Produits</h4>
             </div>
          </div>
          <div className="relative h-[280px] w-full mb-10">
            <canvas ref={donutChartRef}></canvas>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-4xl font-black text-slate-900">{stats.total}</span>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {PRODUCT_TYPES.slice(0, 4).map((t, i) => (
              <div key={t} className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${['bg-red-500', 'bg-orange-400', 'bg-green-500', 'bg-blue-500'][i]}`}></div>
                <div className="min-w-0">
                  <p className="text-[8px] font-black uppercase text-slate-400 truncate">{t}</p>
                  <p className="text-xs font-black text-slate-900">{stats.productTypes[t] || 0}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const MiniCard = ({ title, value, icon, color, bgColor }: any) => (
  <div className="bg-white p-6 rounded-[2.5rem] shadow-md border border-slate-100 flex items-center justify-between group hover:shadow-xl transition-all">
    <div className="flex-1 min-w-0">
      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 truncate">{title}</p>
      <p className="text-3xl font-black text-slate-900 tracking-tighter">{value}</p>
    </div>
    <div className={`w-12 h-12 ${bgColor} ${color} rounded-2xl flex-shrink-0 flex items-center justify-center text-lg shadow-sm ml-4`}>
      <i className={`fa-solid ${icon}`}></i>
    </div>
  </div>
);

export default CenterRecapView;
