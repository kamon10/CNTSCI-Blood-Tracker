
import React, { useMemo, useState } from 'react';
import { DistributionData, CNTSCI_CENTERS, BLOOD_GROUPS, PRODUCT_TYPES } from '../types.ts';

interface RecapViewProps {
  records: DistributionData[];
  lastSync?: string | null;
  onRefresh?: () => void;
  isSyncing?: boolean;
  isAuthenticated?: boolean;
}

const RecapView: React.FC<RecapViewProps> = ({ records, onRefresh, isSyncing, isAuthenticated }) => {
  const [selectedDay, setSelectedDay] = useState<string>('TOUS');
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedSite, setSelectedSite] = useState('TOUS LES SITES');

  const months = [
    { v: '01', l: 'JANVIER' }, { v: '02', l: 'FÉVRIER' }, { v: '03', l: 'MARS' }, { v: '04', l: 'AVRIL' },
    { v: '05', l: 'MAI' }, { v: '06', l: 'JUIN' }, { v: '07', l: 'JUILLET' }, { v: '08', l: 'AOÛT' },
    { v: '09', l: 'SEPTEMBRE' }, { v: '10', l: 'OCTOBRE' }, { v: '11', l: 'NOVEMBRE' }, { v: '12', l: 'DÉCEMBRE' }
  ];

  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'));

  const parseDate = (d: any) => {
    const s = String(d);
    if (s.includes('-')) {
      const p = s.split('T')[0].split('-');
      return { d: p[2], m: p[1], y: p[0] };
    } else if (s.includes('/')) {
      const p = s.split('/');
      return { d: p[0], m: p[1], y: p[2]?.substring(0, 4) };
    }
    return { d: '', m: '', y: '' };
  };

  const filteredAnnual = useMemo(() => records.filter(r => parseDate(r.dateDistribution).y === selectedYear), [records, selectedYear]);
  const filteredMonthly = useMemo(() => filteredAnnual.filter(r => parseDate(r.dateDistribution).m === selectedMonth && (selectedSite === 'TOUS LES SITES' || r.centreCntsci === selectedSite)), [filteredAnnual, selectedMonth, selectedSite]);
  const filteredDaily = useMemo(() => {
    if (selectedDay === 'TOUS') return filteredMonthly;
    return filteredMonthly.filter(r => parseDate(r.dateDistribution).d === selectedDay);
  }, [filteredMonthly, selectedDay]);

  const getStats = (data: DistributionData[]) => {
    const s = { total: 0, cgrAdulte: 0, cgrPedia: 0, plasma: 0, plaquettes: 0, structures: new Set() };
    data.forEach(r => {
      const q = Number(r.nbPoches) || 0;
      s.total += q;
      const type = String(r.typeProduit).toUpperCase();
      if (type.includes('ADULTE')) s.cgrAdulte += q;
      else if (type.includes('PEDIATRIQUE') || type.includes('NOURRISSON')) s.cgrPedia += q;
      else if (type.includes('PLASMA')) s.plasma += q;
      else if (type.includes('PLAQUETTES')) s.plaquettes += q;
      if (r.nomStructuresSanitaire) s.structures.add(r.nomStructuresSanitaire);
    });
    return s;
  };

  const annualStats = getStats(filteredAnnual);
  const monthlyStats = getStats(filteredMonthly);
  const dailyStats = getStats(filteredDaily);

  const matrixData = useMemo(() => {
    const tree: any = {};
    filteredDaily.forEach(r => {
      const site = r.centreCntsci;
      const struct = r.nomStructuresSanitaire;
      const prod = r.typeProduit;
      const grp = r.saGroupe;
      const q = Number(r.nbPoches) || 0;

      if (!tree[site]) tree[site] = { structs: {}, total: 0, grpTotals: {} };
      if (!tree[site].structs[struct]) tree[site].structs[struct] = { prods: {} };
      if (!tree[site].structs[struct].prods[prod]) {
        tree[site].structs[struct].prods[prod] = { grps: {}, total: 0 };
      }

      tree[site].structs[struct].prods[prod].grps[grp] = (tree[site].structs[struct].prods[prod].grps[grp] || 0) + q;
      tree[site].structs[struct].prods[prod].total += q;
      tree[site].total += q;
      tree[site].grpTotals[grp] = (tree[site].grpTotals[grp] || 0) + q;
    });
    return tree;
  }, [filteredDaily]);

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-20">
      {/* FILTRES HAUT DE PAGE - GRISE SI NON AUTHENTIFIE */}
      <div className={`bg-white p-6 rounded-[2.5rem] shadow-2xl flex flex-wrap items-center gap-6 border border-slate-100 sticky top-28 z-40 transition-all duration-500 ${!isAuthenticated ? 'opacity-60 grayscale-[0.8] pointer-events-none select-none' : ''}`}>
        
        {!isAuthenticated && (
          <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
            <span className="bg-slate-900/90 text-white text-[8px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-full shadow-2xl backdrop-blur-sm border border-white/10">
              <i className="fa-solid fa-lock mr-2 text-red-500"></i> Accès restreint : Identifiez-vous pour filtrer
            </span>
          </div>
        )}

        <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
           <div className="flex items-center gap-2 px-4 py-2 border-r border-slate-200">
             <i className="fa-solid fa-calendar-day text-blue-600 text-sm"></i>
             <select disabled={!isAuthenticated} value={selectedDay} onChange={e => setSelectedDay(e.target.value)} className="bg-transparent font-black text-xs uppercase outline-none cursor-pointer disabled:cursor-not-allowed">
                <option value="TOUS">JOUR</option>
                {days.map(d => <option key={d} value={d}>{d}</option>)}
             </select>
           </div>
           <div className="flex items-center gap-2 px-4 py-2 border-r border-slate-200">
             <select disabled={!isAuthenticated} value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-transparent font-black text-xs uppercase outline-none cursor-pointer disabled:cursor-not-allowed">
                {months.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
             </select>
           </div>
           <select disabled={!isAuthenticated} value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="bg-transparent px-4 py-2 font-black text-xs uppercase outline-none cursor-pointer disabled:cursor-not-allowed">
              <option value="2024">2024</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
           </select>
        </div>

        <div className="flex-1 flex items-center gap-3 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-200">
          <i className="fa-solid fa-map-pin text-red-500"></i>
          <select disabled={!isAuthenticated} value={selectedSite} onChange={e => setSelectedSite(e.target.value)} className="w-full bg-transparent font-black text-xs uppercase outline-none cursor-pointer disabled:cursor-not-allowed">
            <option value="TOUS LES SITES">TOUS LES CENTRES CNTSCI</option>
            {CNTSCI_CENTERS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <button 
          onClick={onRefresh} 
          disabled={isSyncing || !isAuthenticated} 
          className={`px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-3 shadow-lg ${
            !isAuthenticated 
            ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
            : 'bg-slate-900 text-white hover:bg-red-600 shadow-slate-900/20 active:scale-95'
          }`}
        >
          <i className={`fa-solid fa-rotate ${isSyncing ? 'fa-spin' : ''}`}></i>
          {isSyncing ? 'Chargement...' : 'Rafraîchir'}
        </button>
      </div>

      {/* SECTION BILAN ANNUEL */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1.5 h-6 bg-slate-400 rounded-full"></div>
          <h2 className="text-lg font-black uppercase tracking-tighter text-slate-800 opacity-60">Perspective Annuelle <span className="text-slate-500">{selectedYear}</span></h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <AnnualCard icon="fa-solid fa-globe" title="Total" value={annualStats.total} sub="Cumul Année" />
          <AnnualCard icon="fa-solid fa-droplet text-red-500" title="CGR Adulte" value={annualStats.cgrAdulte} />
          <AnnualCard icon="fa-solid fa-child-reaching text-rose-500" title="CGR Péd." value={annualStats.cgrPedia} />
          <AnnualCard icon="fa-solid fa-vial text-blue-500" title="Plasma" value={annualStats.plasma} />
          <AnnualCard icon="fa-solid fa-flask-vial text-indigo-500" title="Plaquettes" value={annualStats.plaquettes} />
          <AnnualCard icon="fa-solid fa-hospital-user text-slate-500" title="Structures" value={annualStats.structures.size} />
        </div>
      </section>

      {/* SECTION BILAN JOURNALIER / MENSUEL (DYNAMIQUE) */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-1.5 h-6 rounded-full ${selectedDay !== 'TOUS' ? 'bg-red-600' : 'bg-blue-600'}`}></div>
          <h2 className="text-lg font-black uppercase tracking-tighter text-slate-800">
            {selectedDay !== 'TOUS' ? `Bilan Journalier : ${selectedDay} ` : 'Bilan Mensuel : '} 
            <span className={selectedDay !== 'TOUS' ? 'text-red-600' : 'text-blue-600'}>
              {months.find(m=>m.v===selectedMonth)?.l}
            </span>
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          <MonthlyCard 
            gradient={selectedDay !== 'TOUS' ? "from-red-600 to-red-800" : "from-blue-600 to-blue-800"} 
            icon="fa-solid fa-droplet" 
            title="CGR Adulte" 
            value={selectedDay !== 'TOUS' ? dailyStats.cgrAdulte : monthlyStats.cgrAdulte} 
          />
          <MonthlyCard 
            gradient={selectedDay !== 'TOUS' ? "from-red-500 to-red-700" : "from-blue-500 to-blue-700"} 
            icon="fa-solid fa-child" 
            title="CGR Pédia" 
            value={selectedDay !== 'TOUS' ? dailyStats.cgrPedia : monthlyStats.cgrPedia} 
          />
          <MonthlyCard 
            gradient={selectedDay !== 'TOUS' ? "from-red-400 to-red-600" : "from-blue-400 to-blue-600"} 
            icon="fa-solid fa-vial" 
            title="Plasma" 
            value={selectedDay !== 'TOUS' ? dailyStats.plasma : monthlyStats.plasma} 
          />
          <MonthlyCard 
            gradient={selectedDay !== 'TOUS' ? "from-slate-700 to-slate-900" : "from-indigo-600 to-indigo-800"} 
            icon="fa-solid fa-flask-vial" 
            title="Plaquettes" 
            value={selectedDay !== 'TOUS' ? dailyStats.plaquettes : monthlyStats.plaquettes} 
          />
          <MonthlyCard 
            gradient="from-slate-800 to-black" 
            icon="fa-solid fa-truck-medical" 
            title="Structures" 
            value={selectedDay !== 'TOUS' ? dailyStats.structures.size : monthlyStats.structures.size} 
          />
        </div>
      </section>

      {/* REGISTRE DE DISTRIBUTION */}
      <section className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
        <div className="px-10 py-8 bg-white border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <i className="fa-solid fa-table-cells text-red-600 text-xl"></i>
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-800">Registre de Distribution Détaillé</h2>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase text-slate-400">Affichage : <span className="text-red-600">{selectedDay !== 'TOUS' ? `JOUR ${selectedDay}` : 'TOUT LE MOIS'}</span></p>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-4 border-r border-slate-100">Site</th>
                <th className="px-6 py-4 border-r border-slate-100">Structure (FS_NOM)</th>
                <th className="px-6 py-4 border-r border-slate-100">Type de Produit</th>
                {BLOOD_GROUPS.map(g => (
                  <th key={g} className="px-3 py-4 text-center border-r border-slate-100">{g}</th>
                ))}
                <th className="px-4 py-4 text-center bg-purple-50 text-purple-600">Rendu</th>
                <th className="px-8 py-4 text-right bg-slate-50 font-black">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Object.keys(matrixData).length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-20 text-center">
                    <i className="fa-solid fa-folder-open text-4xl text-slate-100 mb-4"></i>
                    <p className="text-[10px] font-black uppercase text-slate-300">Aucune distribution enregistrée pour cette sélection</p>
                  </td>
                </tr>
              ) : (
                Object.entries(matrixData).map(([siteName, siteData]: any) => (
                  <React.Fragment key={siteName}>
                    {Object.entries(siteData.structs).map(([structName, structData]: any, sIdx) => (
                      <React.Fragment key={structName}>
                        {Object.entries(structData.prods).map(([prodName, prodData]: any, pIdx) => (
                          <tr key={prodName} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-6 py-4 border-r border-slate-50 align-top">
                              {sIdx === 0 && pIdx === 0 ? <span className="text-[9px] font-black text-red-600 uppercase whitespace-nowrap">{siteName}</span> : ''}
                            </td>
                            <td className="px-6 py-4 border-r border-slate-50 align-top">
                              {pIdx === 0 ? <p className="text-[10px] font-bold text-slate-700 uppercase leading-tight">{structName}</p> : ''}
                            </td>
                            <td className="px-6 py-4 border-r border-slate-50">
                              <span className="inline-block px-3 py-1 rounded-md bg-slate-100 text-[8px] font-black text-slate-600 uppercase">
                                {prodName}
                              </span>
                            </td>
                            {BLOOD_GROUPS.map(g => {
                              const val = prodData.grps[g] || 0;
                              return (
                                <td key={g} className={`px-3 py-4 text-center border-r border-slate-50 font-black text-xs ${val > 0 ? 'text-slate-900' : 'text-slate-200'}`}>
                                  {val}
                                </td>
                              );
                            })}
                            <td className="px-4 py-4 text-center text-[10px] font-black text-purple-600 bg-purple-50/30">0</td>
                            <td className="px-8 py-4 text-right bg-slate-50/30 font-black text-red-600">
                              {prodData.total}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                    <tr className="bg-slate-50/80 font-black">
                      <td colSpan={2} className="px-6 py-6 text-right uppercase text-[9px] tracking-widest text-slate-400">
                        SOUS-TOTAL {siteName}
                      </td>
                      <td className="px-6 py-6">
                        <span className="px-3 py-1 bg-slate-200 text-slate-700 rounded-md text-[8px] uppercase">TOTAL SITE</span>
                      </td>
                      {BLOOD_GROUPS.map(g => (
                        <td key={g} className="px-3 py-6 text-center text-xs">
                          {siteData.grpTotals[g] || 0}
                        </td>
                      ))}
                      <td className="px-4 py-6 text-center text-purple-600">0</td>
                      <td className="px-8 py-6 text-right bg-red-600 text-white text-xl tracking-tighter rounded-l-xl">
                        {siteData.total}
                      </td>
                    </tr>
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

const AnnualCard = ({ icon, title, value, sub }: any) => (
  <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl hover:shadow-2xl transition-all group">
    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 mb-4 group-hover:scale-110 transition-transform">
      <i className={icon}></i>
    </div>
    <p className="text-3xl font-black text-slate-900 tracking-tighter mb-1">{value}</p>
    <div className="space-y-0.5">
      <p className="text-[9px] font-black uppercase text-slate-800 tracking-widest">{title}</p>
      {sub && <p className="text-[8px] font-bold text-slate-400 uppercase">{sub}</p>}
    </div>
  </div>
);

const MonthlyCard = ({ gradient, icon, title, value }: any) => (
  <div className={`relative overflow-hidden p-8 rounded-[2.5rem] bg-gradient-to-br ${gradient} text-white shadow-2xl shadow-black/10 group`}>
    <div className="absolute top-[-20px] right-[-20px] opacity-10 group-hover:opacity-20 transition-opacity">
      <i className={`${icon} text-9xl`}></i>
    </div>
    <div className="relative z-10">
      <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-xl mb-8">
        <i className={icon}></i>
      </div>
      <p className="text-5xl font-black tracking-tighter mb-2">{value}</p>
      <p className="text-[11px] font-black uppercase tracking-[0.2em] opacity-80">{title}</p>
    </div>
  </div>
);

export default RecapView;
