
import React from 'react';
import { DistributionData } from '../types';
import { ICONS } from '../constants';

interface HistoryListProps {
  records: DistributionData[];
}

const HistoryList: React.FC<HistoryListProps> = ({ records }) => {
  if (records.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-dashed border-slate-300">
        <p className="text-slate-500">Aucun enregistrement récent.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
        {ICONS.history}
        Historique Local (Session)
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        {[...records].reverse().map((record, idx) => (
          <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 hover:border-red-100 transition-colors">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold px-2 py-1 bg-red-50 text-red-600 rounded-full">
                {record.centreCntsci}
              </span>
              <span className="text-[10px] text-slate-400">{record.horodateur}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex flex-col">
                <span className="text-slate-400 text-[10px] uppercase">Agent</span>
                <span className="font-medium truncate">{record.nomAgent}</span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-slate-400 text-[10px] uppercase">Date Dist.</span>
                <span className="font-medium">{record.dateDistribution}</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-50 flex flex-wrap gap-3">
              <span className="text-xs bg-slate-50 px-2 py-1 rounded">CGR: {record.nbCgrAdulte + record.nbCgrPediatrique}</span>
              <span className="text-xs bg-slate-50 px-2 py-1 rounded">PSL: {record.nbPlasma + record.nbPlaquettes}</span>
              <span className="text-xs bg-slate-50 px-2 py-1 rounded">Struct: {record.nbStructuresSanitaire}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistoryList;
