
import React, { useMemo, useEffect, useRef } from 'react';
import { DistributionData, User } from '../types.ts';
import Chart from 'chart.js/auto';

interface CenterRecapViewProps {
  records: DistributionData[];
  currentUser: User | null;
  onRefresh?: () => void;
  isSyncing?: boolean;
}

const CenterRecapView: React.FC<CenterRecapViewProps> = ({ records, currentUser, onRefresh, isSyncing }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<any>(null);

  const centerRecords = useMemo(() => {
    if (!currentUser) return [];
    return records.filter(r => r.centreCntsci === currentUser.centreAffectation);
  }, [records, currentUser]);

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
        if (chartInstance.current) {
          chartInstance.current.destroy();
        }
        
        const labels = Object.keys(stats.dailyVolume);
        const data = Object.values(stats.dailyVolume);

        chartInstance.current = new Chart(chartRef.current, {
          type: 'line',
          data: {
            labels,
            datasets: [{
              label: 'Volume Poches',
              data,
              borderColor: '#ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              fill: true,
              tension: 0.4,
              pointBackgroundColor: '#ef4444',
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
      } catch (e) {
        console.error("Chart.js init error:", e);
      }
    }
    return () => {
      if (chartInstance.current) chartInstance.current.destroy();
    };
  }, [stats.dailyVolume]);

  if (!currentUser) {
    return (
      <div className="text-center py-20 bg-white rounded-[3rem] shadow-xl border border-slate-100">
        <i className="fa-solid fa-lock text-slate-100 text-6xl mb-6"></i>
        <h2 className="text-xl font-black uppercase text-slate-300">Section Réservée</h2>
        <p className="text-xs text-slate-400 font-bold uppercase mt-2">Veuillez vous connecter pour voir les stats de votre centre</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in zoom-in-95 duration-700 pb-20">
      <div className="bg-white p-8 rounded-[3rem] shadow-2xl border border-slate-100 flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-6">
           <div className="w-16 h-16 bg-red-600 rounded-3xl flex items-center justify-center text-white text-2xl shadow-xl shadow-red-600/30">
             <i className="fa-solid fa-hospital-user"></i>
           </div>
           <div>
             <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Tableau de Bord : <span className="text-red-600">{currentUser.centreAffectation}</span></h2>
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
               <i className="fa-solid fa-user-check text-green-500"></i> Agent Responsable : {currentUser.nomAgent}
             </p>
           </div>
        </div>
        <button onClick={onRefresh} disabled={isSyncing} className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 transition-all flex items-center gap-3">
          <i className={`fa-solid fa-sync ${isSyncing ? 'fa-spin' : ''}`}></i>
          {isSyncing ? 'Mise à jour...' : 'Actualiser'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute right-[-20px] bottom-[-20px] text-white/5 text-9xl transform -rotate-12 transition-transform group-hover:rotate-0">
            <i className="fa-solid fa-droplet"></i>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-4">Volume Total Centre</p>
          <p className="text-7xl font-black tracking-tighter mb-2">{stats.totalPoches}</p>
          <p className="text-[10px] font-bold text-red-500 uppercase">Poches distribuées au total</p>
        </div>

        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-xl flex flex-col justify-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Structures Servies</p>
          <p className="text-6xl font-black text-slate-900 tracking-tighter mb-2">{stats.structuresUnique.size}</p>
          <p className="text-[10px] font-bold text-indigo-500 uppercase">Établissements sanitaires uniques</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-700 p-10 rounded-[2.5rem] text-white shadow-xl flex flex-col justify-center">
           <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-4">Produit le plus sollicité</p>
           <p className="text-3xl font-black uppercase tracking-tighter mb-2 leading-none">{stats.topProduct[0]}</p>
           <p className="text-[10px] font-bold text-white/70 uppercase">Total : {stats.topProduct[1]} poches</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-white p-12 rounded-[3.5rem] shadow-2xl border border-slate-50 flex flex-col min-h-[450px]">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-red-600 animate-pulse"></span> Flux Logistique (14 jours)
            </h3>
            <span className="text-[9px] font-black bg-slate-100 px-3 py-1 rounded-full text-slate-500 uppercase">Performance Live</span>
          </div>
          <div className="flex-1 relative">
            {Object.keys(stats.dailyVolume).length > 0 ? (
              <canvas ref={chartRef}></canvas>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-200 uppercase font-black text-xs italic">
                <i className="fa-solid fa-chart-line text-4xl mb-4"></i>
                Pas de données récentes
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 bg-white rounded-[3.5rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
          <div className="p-10 bg-slate-900 text-white">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-center">Top 5 Clients du Centre</h3>
          </div>
          <div className="flex-1 p-6 space-y-4 overflow-y-auto custom-scrollbar">
            {topStructures.map(([name, qty], i) => (
              <div key={i} className="p-5 bg-slate-50 rounded-3xl border border-slate-100 hover:bg-red-50 hover:border-red-100 transition-all flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <span className={`w-8 h-8 rounded-xl text-[10px] font-black flex items-center justify-center shadow-sm transition-colors ${i === 0 ? 'bg-red-600 text-white' : 'bg-white text-slate-400 group-hover:bg-red-200'}`}>{i+1}</span>
                  <p className="text-[10px] font-bold text-slate-600 uppercase truncate max-w-[150px]">{name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-slate-900">{qty}</p>
                  <p className="text-[7px] font-bold text-slate-400 uppercase">Poches</p>
                </div>
              </div>
            ))}
            {topStructures.length === 0 && <div className="text-center py-24 text-slate-200 uppercase font-black text-[10px]">Aucun mouvement</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CenterRecapView;
