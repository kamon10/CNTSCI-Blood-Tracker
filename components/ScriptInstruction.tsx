
import React from 'react';

const ScriptInstruction: React.FC = () => {
  const code = `/**
 * SCRIPT CNTSCI v7.0 - HAUTE COMPATIBILITÉ (FORCAGE CORS)
 * Ce script est conçu pour contourner les blocages de sécurité des navigateurs.
 */

const SHEET_NAME = "BASE DIST"; 

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(15000);
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

    // Initialisation en-têtes si vide
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Horodateur", "Nom de l'agent", "Date de distribution", "Centre CNTSCI", "Nombre de CGR ADULTE", "Nombre de CGR PEDIATRIQUE", "Nombre de PLASMA", "Nombre PLAQUETTES", "Nombre Structures Sanitaire"]);
    }

    // SI C'EST UN ENVOI (POST)
    if (e.parameter.nomAgent) {
      const p = e.parameter;
      sheet.appendRow([
        p.horodateur || new Date().toLocaleString('fr-FR'),
        p.nomAgent,
        p.dateDistribution,
        p.centreCntsci,
        p.nbCgrAdulte || 0,
        p.nbCgrPediatrique || 0,
        p.nbPlasma || 0,
        p.nbPlaquettes || 0,
        p.nbStructuresSanitaire || 0
      ]);
      return createResponse({status: "success"});
    }

    // SI C'EST UNE LECTURE (GET)
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return createResponse([]);

    const startRow = Math.max(2, lastRow - 999);
    const data = sheet.getRange(startRow, 1, (lastRow - startRow + 1), 9).getValues().map(row => ({
      horodateur: String(row[0]),
      nomAgent: String(row[1]),
      dateDistribution: String(row[2]),
      centreCntsci: String(row[3]),
      nbCgrAdulte: Number(row[4]) || 0,
      nbCgrPediatrique: Number(row[5]) || 0,
      nbPlasma: Number(row[6]) || 0,
      nbPlaquettes: Number(row[7]) || 0,
      nbStructuresSanitaire: Number(row[8]) || 0
    })).filter(r => r.nomAgent !== "undefined");

    return createResponse(data);

  } catch (err) {
    return createResponse({status: "error", message: err.toString()});
  } finally {
    lock.releaseLock();
  }
}

function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss.getSheetByName(SHEET_NAME)) ss.insertSheet(SHEET_NAME);
  SpreadsheetApp.getUi().alert("Configuration terminée pour l'onglet : " + SHEET_NAME);
}`;

  return (
    <div className="space-y-8 animate-in slide-in-from-top-4">
      <div className="bg-amber-50 border-4 border-amber-200 p-8 rounded-[2.5rem] shadow-xl">
        <h4 className="font-black text-amber-800 text-lg uppercase mb-4 flex items-center gap-3">
          <i className="fa-solid fa-triangle-exclamation text-2xl"></i> Checklist "Connexion Forcée"
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center font-black shrink-0">1</div>
              <p className="text-xs font-bold text-amber-900">Cliquez sur <b>Déployer > Nouveau déploiement</b></p>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center font-black shrink-0">2</div>
              <p className="text-xs font-bold text-amber-900">Type : <b>Application Web</b></p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex gap-4 p-3 bg-white rounded-2xl border-2 border-red-500 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center font-black shrink-0">!</div>
              <p className="text-xs font-black text-red-600 uppercase">Qui a accès : <br/>Sélectionner "TOUT LE MONDE"</p>
            </div>
            <div className="text-[10px] text-amber-700 font-medium italic">
              Note : Sans "Tout le monde", le navigateur bloquera la connexion pour des raisons de sécurité.
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-700 shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-10">
              <i className="fa-solid fa-code text-9xl text-white"></i>
           </div>
           <div className="flex justify-between items-center mb-6 relative z-10">
             <div>
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest italic block">Moteur de Synchro v7.0</span>
                <span className="text-white text-xs font-bold italic">Compatible Chrome, Safari et Mobile</span>
             </div>
             <button 
               onClick={() => navigator.clipboard.writeText(code)}
               className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl text-[10px] font-black transition-all flex items-center gap-3 shadow-lg shadow-blue-500/20 active:scale-95"
             >
               <i className="fa-solid fa-copy"></i> COPIER LE CODE v7.0
             </button>
           </div>
           <pre className="text-[10px] text-slate-300 font-mono overflow-auto max-h-[300px] leading-relaxed bg-black/30 p-6 rounded-2xl border border-white/5">
             {code}
           </pre>
      </div>
    </div>
  );
};

export default ScriptInstruction;
