
import React, { useMemo, useState, useEffect } from 'react';
import { DistributionData, CNTSCI_CENTERS, BLOOD_GROUPS, PRODUCT_TYPES, User } from '../types.ts';

interface RecapViewProps {
  records: DistributionData[];
  lastSync?: string | null;
  onRefresh?: () => void;
  isSyncing?: boolean;
  isAuthenticated?: boolean;
  currentUser?: User | null;
}

const SUPER_CENTER_VALUE = "TOUS LES CENTRES CNTSCI";

const RecapView: React.FC<RecapViewProps> = ({ records, onRefresh, isSyncing, isAuthenticated, currentUser }) => {
  // Déterminer si l'utilisateur est un superviseur global
  const isSuperAgent = useMemo(() => {
    return currentUser?.centreAffectation === SUPER_CENTER_VALUE || currentUser?.centreAffectation === "DIRECTION GENERALE";
  }, [currentUser]);
  
  // Initialisation du site sélectionné : si agent standard, on force son centre. Si superviseur, "TOUS LES SITES" par défaut.
  const [selectedSite, setSelectedSite] = useState(() => {
    if (isAuthenticated && currentUser && !isSuperAgent) {
      return currentUser.centreAffectation;
    }
    return 'TOUS LES SITES';
  });

  const [selectedDay, setSelectedDay] = useState<string>('TOUS');
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  // Synchronisation du site sélectionné lors d'un changement d'utilisateur
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      if (!isSuperAgent) {
        setSelectedSite(currentUser.centreAffectation);
      } else {
        // Un superviseur garde la possibilité de voir tous les sites
        if (selectedSite !== 'TOUS LES SITES' && !CNTSCI_CENTERS.includes(selectedSite)) {
            setSelectedSite('TOUS LES SITES');
        }
      }
    }
  }, [isAuthenticated, currentUser, isSuperAgent]);

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

  // Filtrage des records de base : 
  // - Si agent standard (non superviseur), on restreint strictement à son centre d'affectation.
  // - Si superviseur ou visiteur, on garde tous les records pour permettre le filtrage global.
  const baseRecords = useMemo(() => {
    if (isAuthenticated && currentUser && !isSuperAgent) {
      return records.filter(r => r.centreCntsci === currentUser.centreAffectation);
    }
    return records;
  }, [records, isAuthenticated, currentUser, isSuperAgent]);

  const filteredAnnual = useMemo(() => baseRecords.filter(r => parseDate(r.dateDistribution).y === selectedYear), [baseRecords, selectedYear]);
  
  const filteredMonthly = useMemo(() => {
    return filteredAnnual.filter(r => {
      const d = parseDate(r.dateDistribution);
      const monthMatch = d.m === selectedMonth;
      const siteMatch = selectedSite === 'TOUS LES SITES' || r.centreCntsci === selectedSite;
      return monthMatch && siteMatch;
    });
  }, [filteredAnnual, selectedMonth, selectedSite]);

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
    <div className="space-y-12 pb-20">
      {/* BARRE DE FILTRES */}
      <div className={`bg-white p-6 rounded-[2.5rem] shadow-2xl flex flex-wrap items-center gap-6 border border-slate-100 sticky top-28 z-40 transition-all ${!isAuthenticated ? 'bg-slate-50' : ''}`}>
        
        {!isAuthenticated && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center pointer-events-none">
            <span className="bg-slate-900 text-white text-[8px] font-black uppercase tracking-widest px-5 py-2.5 rounded-full shadow-2xl border border-white/10 flex items-center gap-3 opacity-100 pointer-events-auto">
               <i className="fa-solid fa-lock text-red-500 text-xs"></i> 
               MODE LECTURE : CONTRÔLES VERROUILLÉS (VISITEUR)
            </span>
          </div>
        )}

        {/* Sélecteurs de Date */}
        <div className={`flex bg-slate-50 p-1.5 rounded-2xl border border-slate-200 transition-all ${!isAuthenticated ? 'grayscale opacity-50 blur-[0.5px]' : ''}`}>
           <div className="flex items-center gap-2 px-4 py-2 border-r border-slate-200">
             <i className="fa-solid fa-calendar-day text-blue-600 text-sm"></i>
             <select 
               disabled={!isAuthenticated} 
               value={selectedDay} 
               onChange={e => setSelectedDay(e.target.value)} 
               className="bg-transparent font-black text-xs uppercase outline-none cursor-pointer disabled:cursor-not-allowed"
             >
                <option value="TOUS">JOUR</option>
                {days.map(d => <option key={d} value={d}>{d}</option>)}
             </select>
           </div>
           <div className="flex items-center gap-2 px-4 py-2 border-r border-slate-200">
             <select 
               disabled={!isAuthenticated} 
               value={selectedMonth} 
               onChange={e => setSelectedMonth(e.target.value)} 
               className="bg-transparent font-black text-xs uppercase outline-none cursor-pointer disabled:cursor-not-allowed"
             >
                {months.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
             </select>
           </div>
           <select 
             disabled={!isAuthenticated} 
             value={selectedYear} 
             onChange={e => setSelectedYear(e.target.value)} 
             className="bg-transparent px-4 py-2 font-black text-xs uppercase outline-none cursor-pointer disabled:cursor-not-allowed"
           >
              <option value="2024">2024</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
           </select>
        </div>

        {/* Sélecteur de Centre - Déverrouillé pour Super Agents */}
        <div className={`flex-1 flex items-center gap-3 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-200 transition-all ${!isAuthenticated ? 'grayscale opacity-50 blur-[0.5px]' : ''}`}>
          <i className="fa-solid fa-map-pin text-red-500"></i>
          {isAuthenticated && !isSuperAgent ? (
            <div className="flex flex-col">
              <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Votre Centre</span>
              <span className="text-[10px] font-black text-slate-900 uppercase">{currentUser?.centreAffectation}</span>
            </div>
          ) : (
            <select 
              disabled={!isAuthenticated} 
              value={selectedSite} 
              onChange={e => setSelectedSite(e.target.value)} 
              className="w-full bg-transparent font-black text-xs uppercase outline-none cursor-pointer disabled:cursor-not-allowed"
            >
              <option value="TOUS LES SITES">TOUS LES CENTRES CNTSCI</option>
              {CNTSCI_CENTERS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
        </div>

        {/* Bouton Rafraîchir */}
        <button 
          onClick={onRefresh} 
          disabled={isSyncing || !isAuthenticated} 
          className={`px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-3 shadow-lg ${
            !isAuthenticated 
            ? 'bg-slate-300 text-slate-500 cursor-not-allowed grayscale' 
            : 'bg-slate-900 text-white hover:bg-red-600 active:scale-95'
          }`}
        >
          <i className={`fa-solid fa-rotate ${isSyncing ? 'fa-spin' : ''}`}></i>
          {isSyncing ? 'Synchronisation...' : 'Rafraîchir'}
        </button>
      </div>

      {/* SECTION BILAN ANNUEL */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1.5 h-6 bg-slate-400 rounded-full"></div>
          <h2 className="text-lg font-black uppercase tracking-tighter text-slate-800 opacity-60">
            Perspective Annuelle <span className="text-slate-500">{selectedYear}</span>
            {isAuthenticated && !isSuperAgent && <span className="ml-3 text-red-600 text-sm">| {currentUser?.centreAffectation}</span>}
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <AnnualCard icon="fa-solid fa-globe" title="Total" value={annualStats.total} sub="Cumul Année" />
          <AnnualCard icon="fa-solid fa-droplet text-red-500" title="CGR Adulte" value={annualStats.cgrAdulte} />
          <AnnualCard icon="fa-solid fa-child-reaching text-rose-500" title="CGR Péd." value={annualStats.cgrPedia} />
          <AnnualCard icon="fa-solid fa-vial text-blue-500" title="Plasma" value={annualStats.plasma} />
          <AnnualCard icon="fa-solid fa-flask-vial text-indigo-500" title="Plaquettes" value={annualStats.plaquettes} />
        </div>
      </section>

      {/* SECTION BILAN JOURNALIER */}
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
          <MonthlyCard gradient={selectedDay !== 'TOUS' ? "from-red-600 to-red-800" : "from-blue-600 to-blue-800"} icon="fa-solid fa-droplet" title="CGR Adulte" value={selectedDay !== 'TOUS' ? dailyStats.cgrAdulte : monthlyStats.cgrAdulte} />
          <MonthlyCard gradient={selectedDay !== 'TOUS' ? "from-red-500 to-red-700" : "from-blue-500 to-blue-700"} icon="fa-solid fa-child" title="CGR Pédia" value={selectedDay !== 'TOUS' ? dailyStats.cgrPedia : monthlyStats.cgrPedia} />
          <MonthlyCard gradient={selectedDay !== 'TOUS' ? "from-red-400 to-red-600" : "from-blue-400 to-blue-600"} icon="fa-solid fa-vial" title="Plasma" value={selectedDay !== 'TOUS' ? dailyStats.plasma : monthlyStats.plasma} />
          <MonthlyCard gradient={selectedDay !== 'TOUS' ? "from-slate-700 to-slate-900" : "from-indigo-600 to-indigo-800"} icon="fa-solid fa-flask-vial" title="Plaquettes" value={selectedDay !== 'TOUS' ? dailyStats.plaquettes : monthlyStats.plaquettes} />
          <MonthlyCard gradient="from-slate-800 to-black" icon="fa-solid fa-truck-medical" title="Structures" value={selectedDay !== 'TOUS' ? dailyStats.structures.size : monthlyStats.structures.size} />
        </div>
      </section>

      {/* REGISTRE DE DISTRIBUTION - PLEIN ACCÈS POUR AGENTS ET SUPERVISEURS */}
      {isAuthenticated ? (
        <section className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <i className="fa-solid fa-table-cells text-red-600 text-xl"></i>
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-800">Registre détaillé</h2>
            </div>
            <div className="flex items-center gap-2">
              {isSuperAgent && <span className="text-[8px] font-black bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full border border-indigo-100 uppercase tracking-widest">Vue Superviseur</span>}
              <span className="text-[8px] font-black bg-green-50 text-green-600 px-3 py-1 rounded-full border border-green-100 uppercase tracking-widest">Session Active</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-4">Site</th>
                  <th className="px-6 py-4">Structure</th>
                  <th className="px-6 py-4">Produit</th>
                  {BLOOD_GROUPS.map(g => (
                    <th key={g} className="px-3 py-4 text-center">{g}</th>
                  ))}
                  <th className="px-8 py-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.keys(matrixData).length === 0 ? (
                  <tr><td colSpan={14} className="py-20 text-center text-[10px] font-black uppercase text-slate-300">Aucune donnée trouvée pour cette période</td></tr>
                ) : (
                  Object.entries(matrixData).map(([siteName, siteData]: any) => (
                    <React.Fragment key={siteName}>
                      {Object.entries(siteData.structs).map(([structName, structData]: any, sIdx) => (
                        <React.Fragment key={structName}>
                          {Object.entries(structData.prods).map(([prodName, prodData]: any, pIdx) => (
                            <tr key={prodName} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 text-[9px] font-black text-red-600">{sIdx === 0 && pIdx === 0 ? siteName : ''}</td>
                              <td className="px-6 py-4 text-[10px] font-bold text-slate-700">{pIdx === 0 ? structName : ''}</td>
                              <td className="px-6 py-4"><span className="px-2 py-1 rounded bg-slate-100 text-[8px] font-black">{prodName}</span></td>
                              {BLOOD_GROUPS.map(g => (
                                <td key={g} className={`px-3 py-4 text-center font-black text-xs ${(prodData.grps[g] || 0) > 0 ? 'text-slate-900' : 'text-slate-200'}`}>{prodData.grps[g] || 0}</td>
                              ))}
                              <td className="px-8 py-4 text-right font-black text-red-600">{prodData.total}</td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem] py-16 text-center">
           <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-300 mx-auto mb-6 shadow-sm">
             <i className="fa-solid fa-eye-slash text-2xl"></i>
           </div>
           <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Registre confidentiel</h3>
           <p className="text-[10px] font-bold text-slate-300 uppercase mt-2">Connectez-vous en tant qu'agent pour voir le détail des structures</p>
        </div>
      )}
    </div>
  );
};

const AnnualCard = ({ icon, title, value, sub }: any) => (
  <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl">
    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 mb-4"><i className={icon}></i></div>
    <p className="text-3xl font-black text-slate-900 tracking-tighter mb-1">{value}</p>
    <p className="text-[9px] font-black uppercase text-slate-800 tracking-widest">{title}</p>
    {sub && <p className="text-[8px] font-bold text-slate-400 uppercase">{sub}</p>}
  </div>
);

const MonthlyCard = ({ gradient, icon, title, value }: any) => (
  <div className={`p-8 rounded-[2.5rem] bg-gradient-to-br ${gradient} text-white shadow-xl`}>
    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-xl mb-8"><i className={icon}></i></div>
    <p className="text-5xl font-black tracking-tighter mb-2">{value}</p>
    <p className="text-[11px] font-black uppercase tracking-widest opacity-80">{title}</p>
  </div>
);

export default RecapView;
