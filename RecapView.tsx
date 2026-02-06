
import React, { useMemo, useEffect, useRef, useState } from 'react';
import { DistributionData, User, CNTSCI_CENTERS } from '../types.ts';
import Chart from 'chart.js/auto';

interface CenterRecapViewProps {
  records: DistributionData[];
  currentUser: User | null;
  onRefresh?: () => void;
  isSyncing?: boolean;
}

const SUPER_CENTER_VALUE = "TOUS LES CENTRES CNTSCI";

const CenterRecapView: React.FC<CenterRecapViewProps> = ({ records, currentUser, onRefresh, isSyncing }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<any>(null);

  // Déterminer si l'utilisateur est un superviseur global
  const isSuperAgent = useMemo(() => {
    return currentUser?.centreAffectation === SUPER_CENTER_VALUE || currentUser?.centreAffectation === "DIRECTION GENERALE";
  }, [currentUser]);

  // État pour le centre actuellement visionné (par défaut le sien, ou TOUS pour un super agent)
  const [viewedCenter, setViewedCenter] = useState(() => {
    if (isSuperAgent) return 'TOUS LES CENTRES';
    return currentUser?.centreAffectation || '';
  });

  // Mise à jour si l'utilisateur change
  useEffect(() => {
    if (currentUser) {
      if (!isSuperAgent) {
        setViewedCenter(currentUser.centreAffectation);
      }
    }
  }, [currentUser, isSuperAgent]);

  // Helper pour extraire l'année
  const parseDateYear = (d: any) => {
    const s = String(d);
    if (s.includes('-')) return s.split('T')[0].split('-')[0];
    if (s.includes('/')) {
      const p = s.split('/');
      return p[2]?.substring(0, 4);
    }
    return '';
  };

  // Filtrage des records selon le centre visionné
  const centerRecords = useMemo(() => {
    if (!currentUser) return [];
    if (viewedCenter === 'TOUS LES CENTRES') return records;
    return records.filter(r => r.centreCntsci === viewedCenter);
  }, [records, viewedCenter, currentUser]);

  // Statistiques pour l'année 2026
  const stats2026 = useMemo(() => {
    const s = { total: 0, totalCgr: 0, plasma: 0, plaquettes: 0, count: 0 };
    centerRecords.forEach(r => {
      if (parseDateYear(r.dateDistribution) === '2026') {
        const q = Number(r.nbPoches) || 0;
        const type = String(r.typeProduit).toUpperCase();
        s.total += q;
        s.count++;
        if (type.includes('CGR')) s.totalCgr += q;
        else if (type.includes('PLASMA')) s.plasma += q;
        else if (type.includes('PLAQUETTES')) s.plaquettes += q;
      }
    });
    return s;
  }, [centerRecords]);

  // Statistiques globales du centre sélectionné
  const stats = useMemo(() => {
    const s = {
      totalPoches: 0,
      structuresUnique: new Set<string>(),
      productMix: {} as Record<string, number>,
      dailyVolume: {} as Record<string, number>
    };

    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));

    centerRecords.forEach(r => {
      const qty = Number(r.nbPoches) || 0;
      const date = new Date(r.dateDistribution);
      s.totalPoches += qty;
      if (r.nomStructuresSanitaire) s.structuresUnique.add(r.nomStructuresSanitaire);
      s.productMix[r.typeProduit] = (s.productMix[r.typeProduit] || 0) + qty;
      if (date >= fourteenDaysAgo) {
        const dateStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
        s.dailyVolume[dateStr] = (s.dailyVolume[dateStr] || 0) + qty;
      }
    });

    const topProduct = Object.entries(s.productMix).length > 0 
      ? Object.entries(s.productMix).reduce((a, b) => a[1] > b[1] ? a : b, ["N/A", 0])
      : ["AUCUN", 0];

    return { ...s, topProduct };
  }, [centerRecords]);

  const topStructures = useMemo(() => {
    const map: Record<string, number> = {};
    centerRecords.forEach(r => {
      map[r.nomStructuresSanitaire] = (map[r.nomStructuresSanitaire] || 0) + (Number(r.nbPoches) || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [centerRecords]);

  useEffect(() => {
    if (chartRef.current && Object.keys(stats.dailyVolume).length > 0) {
      try {
        if (chartInstance.current) chartInstance.current.destroy();
        const labels = Object.keys(stats.dailyVolume);
        const data = Object.values(stats.dailyVolume);
        chartInstance.current = new Chart(chartRef.current, {
          type: 'line',
          data: {
            labels,
            datasets: [{
              label: 'Volume Poches',
              data,
              borderColor: viewedCenter === 'TOUS LES CENTRES' ? '#4f46e5' : '#ef4444',
              backgroundColor: viewedCenter === 'TOUS LES CENTRES' ? 'rgba(79, 70, 229, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              fill: true,
              tension: 0.4,
              pointRadius: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
              x: { grid: { display: false } }
            }
          }
        });
      } catch (e) { console.error("Chart.js error:", e); }
    }
    return () => { if (chartInstance.current) chartInstance.current.destroy(); };
  }, [stats.dailyVolume, viewedCenter]);

  if (!currentUser) {
    return (
      <div className="text-center py-20 bg-white rounded-[3rem] shadow-xl border border-slate-100">
        <i className="fa-solid fa-lock text-slate-100 text-6xl mb-6"></i>
        <h2 className="text-xl font-black uppercase text-slate-300">Section Réservée</h2>
        <p className="text-xs text-slate-400 font-bold uppercase mt-2">Accès restreint aux agents authentifiés</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in zoom-in-95 duration-700 pb-20">
      {/* HEADER DE SECTION AVEC SÉLECTEUR POUR SUPERVISEUR */}
      <div className="bg-white p-8 rounded-[3rem] shadow-2xl border border-slate-100 flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-6">
           <div className={`w-16 h-16 ${viewedCenter === 'TOUS LES CENTRES' ? 'bg-indigo-600' : 'bg-red-600'} rounded-3xl flex items-center justify-center text-white text-2xl shadow-xl transition-colors`}>
             <i className={`fa-solid ${viewedCenter === 'TOUS LES CENTRES' ? 'fa-chart-line' : 'fa-hospital-user'}`}></i>
           </div>
           <div>
             <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                  {viewedCenter === 'TOUS LES CENTRES' ? 'Tableau de Bord National' : `Tableau : ${viewedCenter}`}
                </h2>
                {isSuperAgent && (
                   <span className="text-[8px] font-black bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full border border-indigo-100 uppercase tracking-widest animate-pulse">
                     Superviseur
                   </span>
                )}
             </div>
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mt-1">
               <i className="fa-solid fa-user-check text-green-500"></i> Connecté en tant que : {currentUser.nomAgent}
             </p>
           </div>
        </div>

        <div className="flex items-center gap-4">
          {isSuperAgent && (
            <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-200">
              <i className="fa-solid fa-filter text-indigo-500 ml-2"></i>
              <select 
                value={viewedCenter} 
                onChange={(e) => setViewedCenter(e.target.value)}
                className="bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer pr-4"
              >
                <option value="TOUS LES CENTRES">VUE GLOBALE CNTSCI</option>
                {CNTSCI_CENTERS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
          <button onClick={onRefresh} disabled={isSyncing} className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 transition-all flex items-center gap-3">
            <i className={`fa-solid fa-sync ${isSyncing ? 'fa-spin' : ''}`}></i>
            {isSyncing ? 'Mise à jour...' : 'Actualiser'}
          </button>
        </div>
      </div>

      {/* SECTION PERSPECTIVE ANNUELLE 2026 */}
      <section className="bg-slate-50 p-8 rounded-[3rem] border border-slate-200 shadow-inner">
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-1.5 h-6 rounded-full ${viewedCenter === 'TOUS LES CENTRES' ? 'bg-indigo-600' : 'bg-red-600'}`}></div>
          <h2 className="text-lg font-black uppercase tracking-tighter text-slate-800">
            Perspective Annuelle <span className={viewedCenter === 'TOUS LES CENTRES' ? 'text-indigo-600' : 'text-red-600'}>2026</span>
          </h2>
          <span className="text-[8px] font-black bg-white px-3 py-1 rounded-full border border-slate-200 text-slate-400 uppercase tracking-widest">
            {viewedCenter === 'TOUS LES CENTRES' ? 'Territoire National' : 'Suivi Local'}
          </span>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MiniStatCard title="TOTAL 2026" value={stats2026.total} color={viewedCenter === 'TOUS LES CENTRES' ? "bg-indigo-600" : "bg-slate-900"} icon="fa-solid fa-calendar-check" />
          <MiniStatCard title="TOTAL CGR" value={stats2026.totalCgr} color="bg-red-600" icon="fa-solid fa-droplet" />
          <MiniStatCard title="PLASMA" value={stats2026.plasma} color="bg-blue-600" icon="fa-solid fa-vial" />
          <MiniStatCard title="PLAQUETTES" value={stats2026.plaquettes} color="bg-indigo-600" icon="fa-solid fa-flask-vial" />
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`${viewedCenter === 'TOUS LES CENTRES' ? 'bg-indigo-900' : 'bg-slate-900'} p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group transition-colors`}>
          <div className="absolute right-[-20px] bottom-[-20px] text-white/5 text-9xl transform -rotate-12 transition-transform group-hover:rotate-0">
            <i className={`fa-solid ${viewedCenter === 'TOUS LES CENTRES' ? 'fa-globe' : 'fa-droplet'}`}></i>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-4">Volume Historique</p>
          <p className="text-7xl font-black tracking-tighter mb-2">{stats.totalPoches}</p>
          <p className="text-[10px] font-bold text-red-500 uppercase">Cumul toutes périodes</p>
        </div>

        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-xl flex flex-col justify-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Portefeuille Structures</p>
          <p className="text-6xl font-black text-slate-900 tracking-tighter mb-2">{stats.structuresUnique.size}</p>
          <p className="text-[10px] font-bold text-indigo-500 uppercase">Partenaires sanitaires actifs</p>
        </div>

        <div className={`bg-gradient-to-br ${viewedCenter === 'TOUS LES CENTRES' ? 'from-indigo-500 to-indigo-700' : 'from-red-500 to-red-700'} p-10 rounded-[2.5rem] text-white shadow-xl flex flex-col justify-center transition-all`}>
           <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-4">Besoin Majeur</p>
           <p className="text-3xl font-black uppercase tracking-tighter mb-2 leading-none">{stats.topProduct[0]}</p>
           <p className="text-[10px] font-bold text-white/70 uppercase">Sorties : {stats.topProduct[1]} unités</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-white p-12 rounded-[3.5rem] shadow-2xl border border-slate-50 flex flex-col min-h-[450px]">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full animate-pulse ${viewedCenter === 'TOUS LES CENTRES' ? 'bg-indigo-600' : 'bg-red-600'}`}></span> 
              Flux Logistique (14 derniers jours)
            </h3>
            <span className="text-[9px] font-black bg-slate-100 px-3 py-1 rounded-full text-slate-500 uppercase">
              Performance {viewedCenter === 'TOUS LES CENTRES' ? 'Nationale' : 'Locale'}
            </span>
          </div>
          <div className="flex-1 relative">
            {Object.keys(stats.dailyVolume).length > 0 ? (
              <canvas ref={chartRef}></canvas>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-200 uppercase font-black text-xs italic">
                <i className="fa-solid fa-chart-line text-4xl mb-4"></i>
                Données insuffisantes sur 14j
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 bg-white rounded-[3.5rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
          <div className={`p-10 ${viewedCenter === 'TOUS LES CENTRES' ? 'bg-indigo-900' : 'bg-slate-900'} text-white transition-colors`}>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-center">Top 5 Structures Servies</h3>
          </div>
          <div className="flex-1 p-6 space-y-4 overflow-y-auto custom-scrollbar">
            {topStructures.map(([name, qty], i) => (
              <div key={i} className="p-5 bg-slate-50 rounded-3xl border border-slate-100 hover:bg-red-50 hover:border-red-100 transition-all flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <span className={`w-8 h-8 rounded-xl text-[10px] font-black flex items-center justify-center shadow-sm transition-colors ${i === 0 ? (viewedCenter === 'TOUS LES CENTRES' ? 'bg-indigo-600' : 'bg-red-600') + ' text-white' : 'bg-white text-slate-400 group-hover:bg-red-200'}`}>{i+1}</span>
                  <p className="text-[10px] font-bold text-slate-600 uppercase truncate max-w-[150px]">{name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-slate-900">{qty}</p>
                  <p className="text-[7px] font-bold text-slate-400 uppercase">Unités</p>
                </div>
              </div>
            ))}
            {topStructures.length === 0 && <div className="text-center py-24 text-slate-200 uppercase font-black text-[10px]">Registre vide</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

const MiniStatCard = ({ title, value, color, icon }: { title: string, value: number, color: string, icon: string }) => (
  <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-md flex flex-col items-center text-center group hover:scale-105 transition-transform duration-300">
    <div className={`w-8 h-8 ${color} rounded-xl flex items-center justify-center text-white text-xs mb-3 shadow-lg shadow-black/5 transition-colors`}>
      <i className={icon}></i>
    </div>
    <p className="text-2xl font-black text-slate-900 tracking-tighter">{value}</p>
    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">{title}</p>
  </div>
);

export default CenterRecapView;
