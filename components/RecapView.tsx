
import React, { useMemo, useState } from 'react';
import { DistributionData, CNTSCI_CENTERS } from '../types';

interface RecapViewProps {
  records: DistributionData[];
  lastSync?: string | null;
  onRefresh?: () => void;
  isSyncing?: boolean;
}

const RecapView: React.FC<RecapViewProps> = ({ records, lastSync, onRefresh, isSyncing }) => {
  const [selectedDay, setSelectedDay] = useState('TOUS'); 
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedSite, setSelectedSite] = useState('TOUS LES SITES');

  const months = [
    { v: '01', l: 'JANVIER' }, { v: '02', l: 'FÉVRIER' }, { v: '03', l: 'MARS' }, { v: '04', l: 'AVRIL' },
    { v: '05', l: 'MAI' }, { v: '06', l: 'JUIN' }, { v: '07', l: 'JUILLET' }, { v: '08', l: 'AOÛT' },
    { v: '09', l: 'SEPTEMBRE' }, { v: '10', l: 'OCTOBRE' }, { v: '11', l: 'NOVEMBRE' }, { v: '12', l: 'DÉCEMBRE' }
  ];

  // Analyse robuste de la date (gère YYYY-MM-DD, DD/MM/YYYY et Date Strings de Google)
  const parseDateRobust = (dateStr: string) => {
    if (!dateStr) return { d: '', m: '', y: '' };
    
    const parts = dateStr.includes('-') ? dateStr.split('-') : dateStr.split('/');
    if (parts.length === 3) {
      if (parts[0].length === 4) { // YYYY-MM-DD
        return { d: parts[2].padStart(2, '0'), m: parts[1].padStart(2, '0'), y: parts[0] };
      } else { // DD/MM/YYYY
        return { d: parts[0].padStart(2, '0'), m: parts[1].padStart(2, '0'), y: parts[2] };
      }
    }

    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return {
          d: d.getDate().toString().padStart(2, '0'),
          m: (d.getMonth() + 1).toString().padStart(2, '0'),
          y: d.getFullYear().toString()
        };
      }
    } catch (e) {}

    return { d: '', m: '', y: '' };
  };

  const formatDateFr = (dateStr: string) => {
    const { d, m, y } = parseDateRobust(dateStr);
    if (!d || !m || !y) return dateStr;
    return `${d}/${m}/${y}`;
  };

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const { d, m, y } = parseDateRobust(String(r.dateDistribution || ""));
      
      const matchDay = selectedDay === 'TOUS' ? true : d === selectedDay;
      const matchMonth = m === selectedMonth;
      const matchYear = y === selectedYear;
      const matchSite = selectedSite === 'TOUS LES SITES' ? true : r.centreCntsci === selectedSite;
      
      return matchDay && matchMonth && matchYear && matchSite;
    });
  }, [records, selectedDay, selectedMonth, selectedYear, selectedSite]);

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
    <div className="space-y-10 animate-in fade-in zoom-in-95 duration-700 pb-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
           <div className="flex items-center gap-4 mb-2">
             <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-xl shadow-lg">
                <i className="fa-solid fa-chart-simple"></i>
             </div>
             <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">Rapport <span className="text-red-600 italic">Global</span></h1>
           </div>
           <p className="text-sm font-bold text-slate-400 uppercase tracking-widest pl-1">
             Analyse des données {records.length > 0 ? `(${records.length} entrées en mémoire)` : '(Aucune donnée)'}
           </p>
        </div>
        
        <div className="flex flex-wrap gap-3">
           <div className="bg-white px-6 py-4 rounded-3xl shadow-xl border-2 border-slate-100 flex items-center gap-4">
              <i className="fa-solid fa-database text-blue-500 text-lg"></i>
              <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Source</p>
                 <p className="text-sm font-black text-slate-800 leading-none">{lastSync ? `Sync à ${lastSync}` : 'Cache Local'}</p>
              </div>
           </div>
           <button onClick={onRefresh} disabled={isSyncing} className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-3xl font-black text-xs uppercase transition-all shadow-xl shadow-red-500/20 active:scale-95 flex items-center gap-3">
              <i className={`fa-solid fa-sync ${isSyncing ? 'fa-spin' : ''}`}></i>
              Actualiser
           </button>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] shadow-2xl border-4 border-slate-100 p-8 flex flex-wrap items-center gap-8">
          <div className="flex items-center gap-4 border-r-2 border-slate-100 pr-8">
             <i className="fa-solid fa-calendar-check text-slate-300"></i>
             <div className="flex gap-2">
                <select value={selectedDay} onChange={e => setSelectedDay(e.target.value)} className="font-black text-slate-900 bg-slate-50 px-4 py-2 rounded-xl outline-none text-sm appearance-none cursor-pointer hover:bg-slate-100 transition-all">
                  <option value="TOUS">JOUR : TOUS</option>
                  {Array.from({length: 31}, (_, i) => (i+1).toString().padStart(2, '0')).map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="font-black text-slate-900 bg-slate-50 px-4 py-2 rounded-xl outline-none text-sm appearance-none cursor-pointer hover:bg-slate-100 transition-all">
                  {months.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
                </select>
                <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="font-black text-slate-900 bg-slate-50 px-4 py-2 rounded-xl outline-none text-sm appearance-none cursor-pointer hover:bg-slate-100 transition-all">
                  {['2024', '2025', '2026'].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
             </div>
          </div>
          
          <div className="flex-1 flex items-center gap-4 min-w-[200px]">
             <i className="fa-solid fa-location-arrow text-red-500"></i>
             <select value={selectedSite} onChange={e => setSelectedSite(e.target.value)} className="w-full font-black text-slate-900 bg-slate-50 px-6 py-2 rounded-xl outline-none text-sm appearance-none cursor-pointer hover:bg-slate-100 transition-all">
                <option value="TOUS LES SITES">TOUS LES CENTRES CNTSCI</option>
                {CNTSCI_CENTERS.map(c => <option key={c} value={c}>{c}</option>)}
             </select>
          </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatKpi title="UNITÉS TOTALES" value={stats.units} icon="fa-solid fa-box-open" color="red" />
        <StatKpi title="GLOBULES (CGR)" value={stats.cgr} icon="fa-solid fa-droplet" color="indigo" />
        <StatKpi title="PLASMA / PLAQUETTES" value={stats.psl} icon="fa-solid fa-flask-vial" color="blue" />
        <StatKpi title="SITES LIVRÉS" value={stats.structs} icon="fa-solid fa-truck-ramp-box" color="purple" />
      </div>

      {records.length === 0 ? (
        <div className="bg-white rounded-[4rem] p-20 text-center shadow-2xl border-4 border-dashed border-slate-100 animate-in fade-in duration-1000">
            <div className="w-32 h-32 rounded-full bg-red-50 text-red-300 flex items-center justify-center text-6xl mx-auto mb-10 shadow-inner">
               <i className="fa-solid fa-plug-circle-xmark"></i>
            </div>
            <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tighter mb-6 italic">Aucune donnée</h3>
            <p className="text-slate-400 font-bold max-w-xl mx-auto mb-12 leading-relaxed text-lg">
                La base de données locale est vide. Effectuez une saisie ou configurez le lien Google Script.
            </p>
            <div className="flex flex-wrap justify-center gap-6">
               <button onClick={onRefresh} className="bg-slate-900 text-white px-12 py-6 rounded-[2rem] font-black uppercase text-xs tracking-widest hover:scale-105 transition-all shadow-2xl shadow-slate-900/40 active:scale-95">
                  Tenter une synchro
               </button>
            </div>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="bg-amber-50 rounded-[4rem] p-20 text-center border-4 border-dashed border-amber-100">
            <i className="fa-solid fa-filter-circle-xmark text-7xl text-amber-200 mb-8"></i>
            <h3 className="text-3xl font-black text-amber-800 uppercase tracking-tighter mb-4">Filtres Trop Restrictifs</h3>
            <p className="text-amber-700 font-bold mb-4 opacity-70">
              Aucune donnée pour {selectedMonth}/{selectedYear} avec les filtres actuels.
            </p>
            {records.length > 0 && (
              <div className="bg-white/50 inline-block p-4 rounded-2xl border border-amber-200 mb-8">
                <p className="text-xs font-black text-amber-900 uppercase">
                  <i className="fa-solid fa-info-circle mr-2"></i>
                  {records.length} entrées totales détectées dans l'historique global.
                </p>
              </div>
            )}
            <div className="block">
              <button onClick={() => {setSelectedDay('TOUS'); setSelectedSite('TOUS LES SITES'); setSelectedMonth((new Date().getMonth() + 1).toString().padStart(2, '0'));}} className="bg-amber-600 text-white px-10 py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-amber-500/20 active:scale-95 transition-all">
                Voir le mois en cours
              </button>
            </div>
        </div>
      ) : (
        <div className="bg-white rounded-[3.5rem] shadow-2xl border-4 border-slate-50 overflow-hidden">
           <div className="p-10 bg-slate-900 text-white flex justify-between items-center">
                <div>
                   <h3 className="text-2xl font-black uppercase tracking-tighter">Tableau des Mouvements</h3>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Données filtrées : {filteredRecords.length} / {records.length}</p>
                </div>
                <div className="flex gap-4">
                   <span className="bg-white/10 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">
                     {months.find(m => m.v === selectedMonth)?.l} {selectedYear}
                   </span>
                </div>
           </div>
           
           <div className="overflow-x-auto">
             <table className="w-full text-left">
               <thead>
                  <tr className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] border-b-2 border-slate-50 bg-slate-50/50">
                      <th className="py-8 pl-10">Date Distribution</th>
                      <th className="py-8">Centre Destination</th>
                      <th className="py-8 text-center">CGR Total</th>
                      <th className="py-8 text-center">PSL Total</th>
                      <th className="py-8 text-center pr-10">Status Sync</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {filteredRecords.slice(0, 50).map((r, i) => (
                      <tr key={i} className="group hover:bg-slate-50 transition-all duration-300">
                          <td className="py-8 pl-10">
                              <p className="font-black text-slate-900 text-lg leading-none">
                                {formatDateFr(String(r.dateDistribution))}
                              </p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">Agent: {r.nomAgent || 'Non spécifié'}</p>
                          </td>
                          <td className="py-8">
                              <span className="font-black text-slate-700 text-xs uppercase bg-slate-100 px-4 py-2 rounded-xl group-hover:bg-red-50 group-hover:text-red-600 transition-colors">
                                {r.centreCntsci}
                              </span>
                          </td>
                          <td className="py-8 text-center">
                              <span className="font-black text-2xl text-red-600 tracking-tighter">
                                {Number(r.nbCgrAdulte) + Number(r.nbCgrPediatrique)}
                              </span>
                          </td>
                          <td className="py-8 text-center">
                              <span className="font-black text-2xl text-blue-600 tracking-tighter">
                                {Number(r.nbPlasma) + Number(r.nbPlaquettes)}
                              </span>
                          </td>
                          <td className="py-8 text-center pr-10">
                              <div className="inline-flex items-center gap-2 bg-green-50 text-green-600 px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest">
                                 <i className="fa-solid fa-check-double"></i> DISPONIBLE
                              </div>
                          </td>
                      </tr>
                  ))}
               </tbody>
             </table>
           </div>
        </div>
      )}
    </div>
  );
};

const StatKpi = ({ title, value, icon, color }: { title: string, value: number, icon: string, color: string }) => {
  const colors: any = {
    red: "from-red-500 to-red-600 shadow-red-200 text-red-600",
    indigo: "from-indigo-500 to-indigo-600 shadow-indigo-200 text-indigo-600",
    blue: "from-blue-500 to-blue-600 shadow-blue-200 text-blue-600",
    purple: "from-purple-500 to-purple-600 shadow-purple-200 text-purple-600",
  };

  return (
    <div className="bg-white p-10 rounded-[3.5rem] shadow-xl border-2 border-slate-50 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group relative overflow-hidden">
       <div className={`absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br opacity-5 rounded-full group-hover:scale-150 transition-transform duration-700 ${colors[color]}`}></div>
       <div className="relative z-10 flex flex-col justify-between h-full">
         <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl mb-8 bg-slate-50 ${colors[color].split(' ')[2]} shadow-inner`}>
            <i className={icon}></i>
         </div>
         <div>
            <p className="text-5xl font-black text-slate-900 tracking-tighter mb-1">{value.toLocaleString()}</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
         </div>
       </div>
    </div>
  );
};

export default RecapView;
