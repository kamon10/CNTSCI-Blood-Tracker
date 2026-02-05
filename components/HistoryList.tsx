
import React from 'react';
import { DistributionData } from '../types';

interface HistoryListProps {
  records: DistributionData[];
}

const HistoryList: React.FC<HistoryListProps> = ({ records }) => {
  return (
    <div className="bg-white rounded-[3rem] p-10 shadow-2xl border border-slate-100 overflow-hidden">
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl">
            <i className="fa-solid fa-clock-rotate-left"></i>
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Activité</h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">Saisies de session</p>
          </div>
        </div>
        <div className="bg-red-50 text-red-600 px-4 py-2 rounded-xl border border-red-100 text-[8px] font-black uppercase tracking-[0.2em]">
          Live
        </div>
      </div>

      <div className="space-y-8 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
        {records.length === 0 ? (
          <div className="text-center py-20 border-4 border-dashed border-slate-50 rounded-[2.5rem]">
            <i className="fa-solid fa-feather-pointed text-slate-100 text-6xl mb-4"></i>
            <p className="text-[10px] font-black text-slate-300 uppercase italic tracking-widest">En attente de saisie...</p>
          </div>
        ) : (
          [...records].reverse().map((record, idx) => (
            <div key={idx} className="relative pl-8 border-l-4 border-slate-100 group">
              <div className="absolute left-[-10px] top-0 w-4 h-4 rounded-full border-4 border-white bg-slate-300 group-hover:bg-red-600 transition-colors duration-500 shadow-sm"></div>
              
              <div className="mb-2 flex justify-between items-end">
                <span className="text-[11px] font-black text-slate-900 uppercase tracking-tighter truncate max-w-[180px]">{record.centreCntsci}</span>
                <span className="text-[9px] font-bold text-slate-400">{record.horodateur.split(' ')[1]}</span>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 group-hover:bg-white group-hover:shadow-2xl group-hover:shadow-red-500/5 group-hover:border-red-50 transition-all duration-500">
                <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-3">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Agent: <span className="text-slate-800 font-black">{record.nomAgent}</span></p>
                  <p className="text-[11px] font-black text-red-600">+{Number(record.nbCgrAdulte) + Number(record.nbCgrPediatrique) + Number(record.nbPlasma) + Number(record.nbPlaquettes)} P.S.</p>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/50 px-3 py-2 rounded-lg border border-slate-100">
                    <p className="text-[7px] font-black text-red-500 uppercase tracking-widest mb-1">CGR Total</p>
                    <p className="text-sm font-black text-slate-800 leading-none">{Number(record.nbCgrAdulte) + Number(record.nbCgrPediatrique)}</p>
                  </div>
                  <div className="bg-white/50 px-3 py-2 rounded-lg border border-slate-100">
                    <p className="text-[7px] font-black text-blue-500 uppercase tracking-widest mb-1">PSL Total</p>
                    <p className="text-sm font-black text-slate-800 leading-none">{Number(record.nbPlasma) + Number(record.nbPlaquettes)}</p>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default HistoryList;
