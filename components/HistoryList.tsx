
import React from 'react';
import { DistributionData } from '../types.ts';

interface HistoryListProps {
  records: DistributionData[];
}

const HistoryList: React.FC<HistoryListProps> = ({ records }) => {
  const safeRecords = Array.isArray(records) ? records : [];
  
  return (
    <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 shadow-inner">
            <i className="fa-solid fa-clock-rotate-left"></i>
          </div>
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Flux d'Activité</h3>
        </div>
        <span className="text-[9px] font-bold bg-red-50 text-red-600 px-3 py-1 rounded-full border border-red-100 uppercase tracking-widest">LIVE</span>
      </div>

      <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
        {safeRecords.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-[2rem]">
            <p className="text-xs font-bold text-slate-300 uppercase italic">Aucun mouvement</p>
          </div>
        ) : (
          [...safeRecords].reverse().map((record, idx) => {
            const time = record.horodateur && record.horodateur.includes(' ') 
              ? record.horodateur.split(' ')[1] 
              : '--:--';

            return (
              <div key={idx} className="relative pl-6 border-l-2 border-slate-100 group">
                <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-slate-300 group-hover:bg-red-500 transition-colors"></div>
                <div className="mb-1 flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-800 uppercase tracking-tighter truncate max-w-[150px]">
                    {record.nomStructuresSanitaire || 'Inconnu'}
                  </span>
                  <span className="text-[8px] font-bold text-slate-400">{time}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-xl transition-all duration-300">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[10px] font-bold text-slate-500">Agent: {record.nomAgent || '---'}</p>
                    <p className="text-sm font-black text-red-600">Qté: {record.nbPoches || 0}</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[8px] font-black bg-white px-2 py-1 rounded-md border border-slate-100 uppercase text-slate-600">
                      {record.typeProduit || '---'}
                    </span>
                    <span className="text-[8px] font-black bg-slate-900 text-white px-2 py-1 rounded-md uppercase">
                      GRP: {record.saGroupe || '---'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default HistoryList;
