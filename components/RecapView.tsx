
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
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Filter Card */}
        <div className="lg:col-span-12 bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100">
            <i className="fa-solid fa-calendar-alt text-red-500"></i>
            <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-transparent font-black text-[10px] uppercase tracking-widest outline-none">
              {months.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
            </select>
            <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="bg-transparent font-black text-[10px] uppercase tracking-widest outline-none">
              {['2024', '2025', '2026'].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex-1 flex items-center gap-3 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100">
            <i className="fa-solid fa-hospital-user text-red-500"></i>
            <select value={selectedSite} onChange={e => setSelectedSite(e.target.value)} className="w-full bg-transparent font-black text-[10px] uppercase tracking-widest outline-none">
              <option value="TOUS LES SITES">TOUS LES CENTRES CNTSCI</option>
              {CNTSCI_CENTERS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button onClick={onRefresh} className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all flex items-center gap-2">
            <i className={`fa-solid fa-sync ${isSyncing ? 'fa-spin' : ''}`}></i> Actualiser
          </button>
        </div>

        {/* KPI Cards */}
        <StatBlock title="Unités Distribuées" value={stats.units} sub="Total mensuel" color="red" icon="fa-solid fa-box-tissue" />
        <StatBlock title="CGR (A+P)" value={stats.cgr} sub="Globules rouges" color="crimson" icon="fa-solid fa-droplet" />
        <StatBlock title="Plasma & Plaquettes" value={stats.psl} sub="Produits labiles" color="blue" icon="fa-solid fa-flask-vial" />
        <StatBlock title="Établissements" value={stats.structs} sub="Structures livrées" color="slate" icon="fa-solid fa-truck-medical" />

        {/* Main Data Table */}
        <div className="lg:col-span-12 bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
          <div className="px-10 py-8 bg-slate-900 flex justify-between items-center">
            <div>
              <h3 className="text-white font-black uppercase tracking-widest text-xs">Mouvements de Distribution</h3>
              <p className="text-slate-500 text-[10px] font-bold mt-1">Données certifiées pour {months.find(m => m.v === selectedMonth)?.l}</p>
            </div>
            <div className="text-right">
              <p className="text-white font-black text-xl">{filteredRecords.length}</p>
              <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest">Entrées</p>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            {filteredRecords.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    <th className="px-10 py-6 text-left">Date</th>
                    <th className="px-6 py-6 text-left">Centre</th>
                    <th className="px-6 py-6 text-center">CGR Total</th>
                    <th className="px-6 py-6 text-center">PSL Total</th>
                    <th className="px-10 py-6 text-right">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredRecords.map((r, i) => (
                    <tr key={i} className="group hover:bg-slate-50 transition-all duration-300">
                      <td className="px-10 py-6">
                        <p className="font-black text-slate-800 text-sm">
                          {new Date(r.dateDistribution).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{r.nomAgent}</p>
                      </td>
                      <td className="px-6 py-6">
                        <span className="inline-block px-3 py-1 bg-slate-100 group-hover:bg-red-50 text-[9px] font-black text-slate-600 group-hover:text-red-600 rounded-lg transition-colors uppercase">
                          {r.centreCntsci}
                        </span>
                      </td>
                      <td className="px-6 py-6 text-center font-black text-red-600 text-lg">
                        {Number(r.nbCgrAdulte) + Number(r.nbCgrPediatrique)}
                      </td>
                      <td className="px-6 py-6 text-center font-black text-blue-600 text-lg">
                        {Number(r.nbPlasma) + Number(r.nbPlaquettes)}
                      </td>
                      <td className="px-10 py-6 text-right">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-green-600 text-[8px] font-black uppercase tracking-widest rounded-full border border-green-100">
                          <i className="fa-solid fa-check-double"></i> Synchronisé
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-20 text-center">
                <i className="fa-solid fa-database text-slate-100 text-8xl mb-6"></i>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Aucune donnée pour cette période</p>
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
    red: "bg-red-50 text-red-600 border-red-100 shadow-red-100/50",
    crimson: "bg-rose-50 text-rose-600 border-rose-100 shadow-rose-100/50",
    blue: "bg-blue-50 text-blue-600 border-blue-100 shadow-blue-100/50",
    slate: "bg-slate-100 text-slate-600 border-slate-200 shadow-slate-100/50",
  };
  return (
    <div className={`lg:col-span-3 p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-xl hover:-translate-y-2 transition-all duration-500 group`}>
      <div className={`w-12 h-12 rounded-2xl mb-6 flex items-center justify-center text-xl transition-all group-hover:scale-110 ${themes[color]}`}>
        <i className={icon}></i>
      </div>
      <p className="text-4xl font-black text-slate-900 tracking-tighter mb-1">{value.toLocaleString()}</p>
      <div className="flex flex-col">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-800">{title}</span>
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{sub}</span>
      </div>
    </div>
  );
};

export default RecapView;
