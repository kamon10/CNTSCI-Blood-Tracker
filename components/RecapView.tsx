
import React, { useMemo, useState } from 'react';
import { DistributionData, CNTSCI_CENTERS } from '../types';

interface RecapViewProps {
  records: DistributionData[];
  lastSync?: string | null;
  onRefresh?: () => void;
  isSyncing?: boolean;
}

const RecapView: React.FC<RecapViewProps> = ({ records, lastSync, onRefresh, isSyncing }) => {
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedSite, setSelectedSite] = useState('TOUS LES SITES');

  const months = [
    { v: '01', l: 'JANVIER' }, { v: '02', l: 'FÉVRIER' }, { v: '03', l: 'MARS' }, { v: '04', l: 'AVRIL' },
    { v: '05', l: 'MAI' }, { v: '06', l: 'JUIN' }, { v: '07', l: 'JUILLET' }, { v: '08', l: 'AOÛT' },
    { v: '09', l: 'SEPTEMBRE' }, { v: '10', l: 'OCTOBRE' }, { v: '11', l: 'NOVEMBRE' }, { v: '12', l: 'DÉCEMBRE' }
  ];

  const parseDateRobust = (dateStr: string) => {
    if (!dateStr) return { d: '', m: '', y: '' };
    const parts = dateStr.includes('-') ? dateStr.split('-') : dateStr.split('/');
    if (parts.length === 3) {
      if (parts[0].length === 4) return { d: parts[2].padStart(2, '0'), m: parts[1].padStart(2, '0'), y: parts[0] };
      return { d: parts[0].padStart(2, '0'), m: parts[1].padStart(2, '0'), y: parts[2] };
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return { d: d.getDate().toString().padStart(2, '0'), m: (d.getMonth() + 1).toString().padStart(2, '0'), y: d.getFullYear().toString() };
    }
    return { d: '', m: '', y: '' };
  };

  // Agrégation Annuelle
  const yearlyStats = useMemo(() => {
    const yearRecords = records.filter(r => {
      const { y } = parseDateRobust(String(r.dateDistribution || ""));
      return y === selectedYear && (selectedSite === 'TOUS LES SITES' || r.centreCntsci === selectedSite);
    });

    let cgrA = 0, cgrP = 0, plasma = 0, plaq = 0;
    yearRecords.forEach(r => {
      cgrA += Number(r.nbCgrAdulte) || 0;
      cgrP += Number(r.nbCgrPediatrique) || 0;
      plasma += Number(r.nbPlasma) || 0;
      plaq += Number(r.nbPlaquettes) || 0;
    });

    return { total: cgrA + cgrP + plasma + plaq, cgrA, cgrP, plasma, plaq, count: yearRecords.length };
  }, [records, selectedYear, selectedSite]);

  // Agrégation Mensuelle
  const monthlyStats = useMemo(() => {
    const monthRecords = records.filter(r => {
      const { m, y } = parseDateRobust(String(r.dateDistribution || ""));
      return m === selectedMonth && y === selectedYear && (selectedSite === 'TOUS LES SITES' || r.centreCntsci === selectedSite);
    });

    let cgrA = 0, cgrP = 0, plasma = 0, plaq = 0;
    monthRecords.forEach(r => {
      cgrA += Number(r.nbCgrAdulte) || 0;
      cgrP += Number(r.nbCgrPediatrique) || 0;
      plasma += Number(r.nbPlasma) || 0;
      plaq += Number(r.nbPlaquettes) || 0;
    });

    return { total: cgrA + cgrP + plasma + plaq, cgrA, cgrP, plasma, plaq, count: monthRecords.length };
  }, [records, selectedMonth, selectedYear, selectedSite]);

  // Agrégation Quotidienne (Jour par Jour pour le mois sélectionné)
  const dailyBreakdown = useMemo(() => {
    const monthRecords = records.filter(r => {
      const { m, y } = parseDateRobust(String(r.dateDistribution || ""));
      return m === selectedMonth && y === selectedYear && (selectedSite === 'TOUS LES SITES' || r.centreCntsci === selectedSite);
    });

    const days: { [key: string]: any } = {};
    monthRecords.forEach(r => {
      const { d } = parseDateRobust(String(r.dateDistribution || ""));
      if (!days[d]) days[d] = { d, cgrA: 0, cgrP: 0, plasma: 0, plaq: 0, total: 0 };
      days[d].cgrA += Number(r.nbCgrAdulte) || 0;
      days[d].cgrP += Number(r.nbCgrPediatrique) || 0;
      days[d].plasma += Number(r.nbPlasma) || 0;
      days[d].plaq += Number(r.nbPlaquettes) || 0;
      days[d].total = days[d].cgrA + days[d].cgrP + days[d].plasma + days[d].plaq;
    });

    return Object.values(days).sort((a, b) => Number(b.d) - Number(a.d));
  }, [records, selectedMonth, selectedYear, selectedSite]);

  return (
    <div className="space-y-12 animate-in fade-in duration-1000 pb-10">
      
      {/* 1. FILTRES STRATÉGIQUES */}
      <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 flex flex-wrap items-center gap-8">
        <div className="flex items-center gap-4 bg-slate-50 px-6 py-4 rounded-2xl border border-slate-100">
          <i className="fa-solid fa-calendar-check text-red-500 text-lg"></i>
          <div className="flex gap-4">
            <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-transparent font-black text-xs uppercase tracking-widest outline-none cursor-pointer">
              {months.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
            </select>
            <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="bg-transparent font-black text-xs uppercase tracking-widest outline-none cursor-pointer">
              {['2024', '2025', '2026'].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        
        <div className="flex-1 flex items-center gap-4 bg-slate-50 px-6 py-4 rounded-2xl border border-slate-100 min-w-[300px]">
          <i className="fa-solid fa-map-location-dot text-red-500 text-lg"></i>
          <select value={selectedSite} onChange={e => setSelectedSite(e.target.value)} className="w-full bg-transparent font-black text-xs uppercase tracking-widest outline-none cursor-pointer">
            <option value="TOUS LES SITES">TOUS LES CENTRES CNTSCI</option>
            {CNTSCI_CENTERS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        
        <button onClick={onRefresh} className="px-10 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-600 transition-all flex items-center gap-3 shadow-lg active:scale-95">
          <i className={`fa-solid fa-arrows-rotate ${isSyncing ? 'fa-spin' : ''}`}></i> Rafraîchir
        </button>
      </div>

      {/* 2. BILAN ANNUEL (CONSOLIDE) */}
      <section className="space-y-6">
        <div className="flex items-center gap-4 pl-4">
          <div className="w-2 h-8 bg-red-600 rounded-full"></div>
          <h2 className="text-xl font-black uppercase tracking-tighter">Bilan Annuel <span className="text-red-600">{selectedYear}</span></h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <CompactStat title="Total Annuel" value={yearlyStats.total} sub="Toutes poches" color="slate" icon="fa-solid fa-globe" />
          <CompactStat title="CGR Adulte" value={yearlyStats.cgrA} sub="Total Année" color="red" icon="fa-solid fa-droplet" />
          <CompactStat title="CGR Péd." value={yearlyStats.cgrP} sub="Total Année" color="crimson" icon="fa-solid fa-baby" />
          <CompactStat title="Plasma" value={yearlyStats.plasma} sub="Total Année" color="blue" icon="fa-solid fa-vial" />
          <CompactStat title="Plaquettes" value={yearlyStats.plaq} sub="Total Année" color="blue" icon="fa-solid fa-flask" />
        </div>
      </section>

      {/* 3. BILAN MENSUEL (SELECTIONNE) */}
      <section className="space-y-6">
        <div className="flex items-center gap-4 pl-4">
          <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
          <h2 className="text-xl font-black uppercase tracking-tighter">Bilan Mensuel <span className="text-blue-600">{months.find(m => m.v === selectedMonth)?.l}</span></h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatBlockPremium title="CGR Adulte" value={monthlyStats.cgrA} color="red" icon="fa-solid fa-droplet" />
          <StatBlockPremium title="CGR Pédia" value={monthlyStats.cgrP} color="crimson" icon="fa-solid fa-baby" />
          <StatBlockPremium title="Plasma" value={monthlyStats.plasma} color="blue" icon="fa-solid fa-vial" />
          <StatBlockPremium title="Plaquettes" value={monthlyStats.plaq} color="indigo" icon="fa-solid fa-vial-circle-check" />
        </div>
      </section>

      {/* 4. DETAIL QUOTIDIEN & REGISTRE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Total par Jour */}
        <div className="lg:col-span-4 bg-white rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden">
          <div className="p-8 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-black uppercase tracking-widest text-xs text-slate-800">Total par Jour</h3>
            <span className="text-[10px] font-bold text-slate-400">Ce mois</span>
          </div>
          <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
            {dailyBreakdown.length > 0 ? (
              <div className="divide-y divide-slate-50">
                {dailyBreakdown.map((day, idx) => (
                  <div key={idx} className="p-6 hover:bg-slate-50 transition-colors flex justify-between items-center group">
                    <div>
                      <p className="text-xs font-black text-slate-400 uppercase">Jour</p>
                      <p className="text-2xl font-black text-slate-900 leading-none">{day.d}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-red-600 group-hover:scale-110 transition-transform">{day.total} <span className="text-[10px] text-slate-400">poches</span></p>
                      <div className="flex gap-2 justify-end mt-1">
                        <span className="text-[8px] font-bold text-red-400">CGR:{day.cgrA + day.cgrP}</span>
                        <span className="text-[8px] font-bold text-blue-400">PSL:{day.plasma + day.plaq}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-20 text-center opacity-20">
                <i className="fa-solid fa-calendar-minus text-6xl"></i>
              </div>
            )}
          </div>
        </div>

        {/* Registre Complet */}
        <div className="lg:col-span-8 bg-white rounded-[3.5rem] shadow-2xl border border-slate-50 overflow-hidden">
          <div className="px-10 py-8 bg-slate-900 flex justify-between items-center">
            <h3 className="text-white font-black uppercase tracking-[0.25em] text-sm">Registre Détaillé</h3>
            <span className="bg-white/10 text-white px-4 py-1 rounded-full text-[10px] font-black">{monthlyStats.count} entrées</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="px-8 py-6 text-left">Date</th>
                  <th className="px-6 py-6 text-center">CGR A.</th>
                  <th className="px-6 py-6 text-center">CGR P.</th>
                  <th className="px-6 py-6 text-center">Plasma</th>
                  <th className="px-6 py-6 text-center">Plaq.</th>
                  <th className="px-8 py-6 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {records.filter(r => {
                  const { m, y } = parseDateRobust(String(r.dateDistribution || ""));
                  return m === selectedMonth && y === selectedYear && (selectedSite === 'TOUS LES SITES' || r.centreCntsci === selectedSite);
                }).map((r, i) => (
                  <tr key={i} className="group hover:bg-slate-50 transition-all duration-300">
                    <td className="px-8 py-6">
                      <p className="font-black text-slate-900 text-sm">
                        {parseDateRobust(String(r.dateDistribution)).d}/{selectedMonth}/{selectedYear}
                      </p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase truncate max-w-[120px]">{r.nomAgent}</p>
                    </td>
                    <td className="px-6 py-6 text-center font-black text-slate-600">{r.nbCgrAdulte}</td>
                    <td className="px-6 py-6 text-center font-black text-slate-600">{r.nbCgrPediatrique}</td>
                    <td className="px-6 py-6 text-center font-black text-slate-600">{r.nbPlasma}</td>
                    <td className="px-6 py-6 text-center font-black text-slate-600">{r.nbPlaquettes}</td>
                    <td className="px-8 py-6 text-right">
                      <span className="font-black text-lg text-red-600">
                        {Number(r.nbCgrAdulte) + Number(r.nbCgrPediatrique) + Number(r.nbPlasma) + Number(r.nbPlaquettes)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// COMPOSANTS DE STATS OPTIMISÉS
const CompactStat = ({ title, value, sub, color, icon }: any) => {
  const themes: any = {
    red: "text-red-600 bg-red-50 border-red-100",
    crimson: "text-rose-600 bg-rose-50 border-rose-100",
    blue: "text-blue-600 bg-blue-50 border-blue-100",
    slate: "text-slate-600 bg-slate-50 border-slate-100",
  };
  return (
    <div className={`p-6 rounded-[2rem] bg-white border border-slate-100 shadow-md hover:shadow-xl transition-all duration-300`}>
      <div className={`w-10 h-10 rounded-xl mb-4 flex items-center justify-center text-sm ${themes[color]}`}>
        <i className={icon}></i>
      </div>
      <p className="text-3xl font-black text-slate-900 tracking-tighter leading-none mb-1">{value.toLocaleString()}</p>
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-800">{title}</p>
      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{sub}</p>
    </div>
  );
};

const StatBlockPremium = ({ title, value, color, icon }: any) => {
  const colors: any = {
    red: "from-red-600 to-red-800 shadow-red-500/20",
    crimson: "from-rose-500 to-rose-700 shadow-rose-500/20",
    blue: "from-blue-500 to-blue-700 shadow-blue-500/20",
    indigo: "from-indigo-500 to-indigo-700 shadow-indigo-500/20",
  };
  return (
    <div className={`p-8 rounded-[2.5rem] bg-gradient-to-br ${colors[color]} text-white shadow-2xl hover:scale-105 transition-all duration-500 group relative overflow-hidden`}>
      <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-150 transition-transform duration-1000">
        <i className={`${icon} text-9xl`}></i>
      </div>
      <div className="relative z-10">
        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-6 backdrop-blur-md">
           <i className={icon}></i>
        </div>
        <p className="text-5xl font-black tracking-tighter mb-1">{value.toLocaleString()}</p>
        <p className="text-[11px] font-black uppercase tracking-[0.2em] opacity-80">{title}</p>
      </div>
    </div>
  );
};

export default RecapView;
