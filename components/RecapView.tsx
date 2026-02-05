
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

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const { m, y } = parseDateRobust(String(r.dateDistribution || ""));
      return m === selectedMonth && y === selectedYear && (selectedSite === 'TOUS LES SITES' || r.centreCntsci === selectedSite);
    });
  }, [records, selectedMonth, selectedYear, selectedSite]);

  const stats = useMemo(() => {
    let units = 0, cgr = 0, psl = 0, structs = 0;
    filteredRecords.forEach(r => {
      units += (Number(r.nbCgrAdulte) || 0) + (Number(r.nbCgrPediatrique) || 0) + (Number(r.nbPlasma) || 0) + (Number(r.nbPlaquettes) || 0);
      cgr += (Number(r.nbCgrAdulte) || 0) + (Number(r.nbCgrPediatrique) || 0);
      psl += (Number(r.nbPlasma) || 0) + (Number(r.nbPlaquettes) || 0);
      structs += Number(r.nbStructuresSanitaire) || 0;
    });
    return { units, cgr, psl, structs };
  }, [filteredRecords]);

  return (
    <div className="space-y-10 animate-in fade-in duration-1000">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Advanced Filters Bento */}
        <div className="lg:col-span-12 bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 flex flex-wrap items-center gap-8">
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

        {/* Executive Stats Bento Grid */}
        <StatBlock title="Volume Total" value={stats.units} sub="Unités sanguines" color="red" icon="fa-solid fa-box-open" />
        <StatBlock title="Globules (CGR)" value={stats.cgr} sub="Adulte & Pédia" color="crimson" icon="fa-solid fa-droplet" />
        <StatBlock title="P. Labiles (PSL)" value={stats.psl} sub="Plasma/Plaquettes" color="blue" icon="fa-solid fa-flask" />
        <StatBlock title="Réseau Livré" value={stats.structs} sub="Hôpitaux servis" color="slate" icon="fa-solid fa-truck-medical" />

        {/* Master Data Table */}
        <div className="lg:col-span-12 bg-white rounded-[3.5rem] shadow-2xl border border-slate-50 overflow-hidden">
          <div className="px-12 py-10 bg-slate-900 flex justify-between items-center">
            <div>
              <h3 className="text-white font-black uppercase tracking-[0.25em] text-sm">Registre des Distributions</h3>
              <p className="text-slate-500 text-[10px] font-bold mt-1 uppercase tracking-widest">Archive certifiée {months.find(m => m.v === selectedMonth)?.l} {selectedYear}</p>
            </div>
            <div className="bg-white/5 border border-white/10 px-8 py-4 rounded-2xl text-center backdrop-blur-md">
              <p className="text-white font-black text-2xl leading-none">{filteredRecords.length}</p>
              <p className="text-slate-500 text-[8px] font-black uppercase tracking-widest mt-1">Lignes</p>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            {filteredRecords.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                    <th className="px-12 py-8 text-left">Chronologie</th>
                    <th className="px-8 py-8 text-left">Destination</th>
                    <th className="px-8 py-8 text-center">CGR Total</th>
                    <th className="px-8 py-8 text-center">PSL Total</th>
                    <th className="px-12 py-8 text-right">Confirmation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredRecords.map((r, i) => (
                    <tr key={i} className="group hover:bg-slate-50 transition-all duration-300">
                      <td className="px-12 py-8">
                        <p className="font-black text-slate-900 text-lg leading-none mb-1">
                          {new Date(r.dateDistribution).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">{r.nomAgent || "Agent CNTSCI"}</p>
                      </td>
                      <td className="px-8 py-8">
                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 group-hover:bg-red-50 text-[10px] font-black text-slate-700 group-hover:text-red-700 rounded-xl transition-all uppercase tracking-tighter">
                          <i className="fa-solid fa-hospital-user opacity-30"></i>
                          {r.centreCntsci}
                        </span>
                      </td>
                      <td className="px-8 py-8 text-center">
                        <span className="font-black text-3xl text-red-600 tracking-tighter">
                          {Number(r.nbCgrAdulte) + Number(r.nbCgrPediatrique)}
                        </span>
                      </td>
                      <td className="px-8 py-8 text-center">
                        <span className="font-black text-3xl text-blue-600 tracking-tighter">
                          {Number(r.nbPlasma) + Number(r.nbPlaquettes)}
                        </span>
                      </td>
                      <td className="px-12 py-8 text-right">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 text-[9px] font-black uppercase tracking-widest rounded-full border border-green-100">
                          <i className="fa-solid fa-circle-check"></i> Actif Cloud
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-32 text-center bg-slate-50/30">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl">
                  <i className="fa-solid fa-database text-slate-200 text-4xl"></i>
                </div>
                <h4 className="text-slate-400 font-black uppercase tracking-[0.2em] text-xs">Aucune archive disponible</h4>
                <p className="text-slate-300 text-[10px] font-bold mt-2 italic uppercase">Sélectionnez une autre période ou centre</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatBlock = ({ title, value, sub, color, icon }: any) => {
  const themes: any = {
    red: "bg-red-50 text-red-600 border-red-100 shadow-red-200/20",
    crimson: "bg-rose-50 text-rose-600 border-rose-100 shadow-rose-200/20",
    blue: "bg-blue-50 text-blue-600 border-blue-100 shadow-blue-200/20",
    slate: "bg-slate-100 text-slate-600 border-slate-200 shadow-slate-200/10",
  };
  return (
    <div className="lg:col-span-3 p-10 rounded-[3rem] bg-white border border-slate-100 shadow-xl hover:-translate-y-2 transition-all duration-500 group relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-150 transition-transform duration-1000">
         <i className={`${icon} text-9xl`}></i>
      </div>
      <div className={`w-14 h-14 rounded-2xl mb-8 flex items-center justify-center text-xl shadow-lg transition-transform group-hover:rotate-12 ${themes[color]}`}>
        <i className={icon}></i>
      </div>
      <p className="text-6xl font-black text-slate-900 tracking-tighter mb-2 leading-none">{value.toLocaleString()}</p>
      <div className="flex flex-col">
        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-800">{title}</span>
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{sub}</span>
      </div>
    </div>
  );
};

export default RecapView;
