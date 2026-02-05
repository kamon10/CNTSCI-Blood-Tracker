
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { DistributionData, CNTSCI_CENTERS } from '../types.ts';
import Chart from 'chart.js/auto';

interface WeeklyViewProps {
  records: DistributionData[];
  onRefresh?: () => void;
  isSyncing?: boolean;
}

const WeeklyView: React.FC<WeeklyViewProps> = ({ records, onRefresh, isSyncing }) => {
  const [selectedWeekDate, setSelectedWeekDate] = useState(new Date().toISOString().split('T')[0]);
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<any>(null);

  const weekInfo = useMemo(() => {
    const curr = new Date(selectedWeekDate);
    const first = curr.getDate() - curr.getDay() + 1; // Monday
    const last = first + 6; // Sunday
    
    const start = new Date(curr.setDate(first));
    const end = new Date(curr.setDate(last));
    
    return { start, end };
  }, [selectedWeekDate]);

  const filteredWeekly = useMemo(() => {
    return records.filter(r => {
      const d = new Date(r.dateDistribution);
      return d >= weekInfo.start && d <= weekInfo.end;
    });
  }, [records, weekInfo]);

  const dailyBreakdown = useMemo(() => {
    const days = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE'];
    const stats: any = days.reduce((acc, d) => ({ ...acc, [d]: 0 }), {});
    
    filteredWeekly.forEach(r => {
      const date = new Date(r.dateDistribution);
      const dayName = days[date.getDay() === 0 ? 6 : date.getDay() - 1];
      stats[dayName] += Number(r.nbPoches);
    });
    
    return stats;
  }, [filteredWeekly]);

  const weeklyStats = useMemo(() => {
    let total = 0;
    let products: any = {};
    filteredWeekly.forEach(r => {
      const q = Number(r.nbPoches);
      total += q;
      products[r.typeProduit] = (products[r.typeProduit] || 0) + q;
    });
    return { total, products };
  }, [filteredWeekly]);

  useEffect(() => {
    if (chartRef.current) {
      if (chartInstance.current) chartInstance.current.destroy();
      
      const labels = Object.keys(dailyBreakdown);
      const data = Object.values(dailyBreakdown);

      chartInstance.current = new Chart(chartRef.current, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Volume Quotidien',
            data,
            backgroundColor: 'rgba(239, 68, 68, 0.8)',
            borderRadius: 12,
            borderWidth: 0,
            barThickness: 32
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
    }
  }, [dailyBreakdown]);

  const formatDateLabel = (d: Date) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });

  return (
    <div className="space-y-10 animate-in fade-in zoom-in-95 duration-700 pb-20">
      {/* FILTRES HEBDO */}
      <div className="bg-white p-8 rounded-[3rem] shadow-2xl border border-slate-100 flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-5">
           <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg shadow-indigo-600/20">
             <i className="fa-solid fa-calendar-week"></i>
           </div>
           <div>
             <h2 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Analyse Hebdomadaire</h2>
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Suivi des flux sur 7 jours</p>
           </div>
        </div>

        <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-200">
           <input 
             type="date" 
             value={selectedWeekDate} 
             onChange={e => setSelectedWeekDate(e.target.value)}
             className="bg-transparent px-4 py-2 font-black text-xs outline-none uppercase"
           />
           <div className="px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-100 text-[10px] font-black text-indigo-600 uppercase">
             {formatDateLabel(weekInfo.start)} — {formatDateLabel(weekInfo.end)}
           </div>
           <button onClick={onRefresh} disabled={isSyncing} className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-red-600 transition-all">
             <i className={`fa-solid fa-sync ${isSyncing ? 'fa-spin' : ''}`}></i>
           </button>
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute right-[-20px] bottom-[-20px] text-white/5 text-9xl transform -rotate-12 transition-transform group-hover:rotate-0">
            <i className="fa-solid fa-boxes-stacked"></i>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-4">Volume Hebdo Total</p>
          <p className="text-6xl font-black tracking-tighter mb-2">{weeklyStats.total}</p>
          <p className="text-[10px] font-bold text-indigo-400 uppercase">Poches distribuées cette semaine</p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl flex flex-col justify-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 text-center">Pic d'activité</p>
          <div className="flex items-end justify-around h-24 gap-2 px-4">
             {Object.entries(dailyBreakdown).map(([day, val]: any) => (
               <div key={day} className="flex flex-col items-center gap-2 group cursor-help">
                 <div className="w-3 bg-slate-100 rounded-full relative h-full">
                    <div 
                      className="absolute bottom-0 left-0 w-full bg-indigo-500 rounded-full transition-all duration-1000" 
                      style={{ height: `${(val / Math.max(...Object.values(dailyBreakdown) as number[], 1)) * 100}%` }}
                    ></div>
                 </div>
                 <span className="text-[7px] font-black text-slate-300">{day.substring(0, 3)}</span>
               </div>
             ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 p-8 rounded-[2.5rem] text-white shadow-xl">
           <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-6 text-center">Product Mix (Hebdo)</p>
           <div className="space-y-3">
              {Object.entries(weeklyStats.products).map(([name, qty]: any, i) => (
                <div key={i} className="flex justify-between items-center bg-white/10 p-2 rounded-lg">
                  <span className="text-[8px] font-black uppercase truncate max-w-[120px]">{name}</span>
                  <span className="text-xs font-black">{qty}</span>
                </div>
              ))}
              {Object.keys(weeklyStats.products).length === 0 && <p className="text-center text-[10px] italic opacity-50">Aucun produit</p>}
           </div>
        </div>
      </div>

      {/* TREND CHART */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-50 flex flex-col min-h-[400px]">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 mb-10 flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-indigo-600"></span> Courbe Logistique Hebdomadaire
          </h3>
          <div className="flex-1">
            <canvas ref={chartRef}></canvas>
          </div>
        </div>

        <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
          <div className="p-8 bg-slate-900 text-white">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-center">Structures actives ce cycle</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {filteredWeekly.reduce((acc: any, curr) => {
              if(!acc.includes(curr.nomStructuresSanitaire)) acc.push(curr.nomStructuresSanitaire);
              return acc;
            }, []).map((name: string, i: number) => (
              <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-indigo-50 transition-colors flex items-center gap-4">
                <span className="w-6 h-6 rounded-full bg-white text-[10px] font-black text-indigo-600 flex items-center justify-center shadow-sm">{i+1}</span>
                <p className="text-[10px] font-bold text-slate-600 uppercase truncate">{name}</p>
              </div>
            ))}
            {filteredWeekly.length === 0 && <div className="text-center py-20 text-slate-200 uppercase font-black text-[10px]">Silence radio</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklyView;
