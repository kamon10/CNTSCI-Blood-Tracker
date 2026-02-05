
import React from 'react';

const ScriptInstruction: React.FC = () => {
  const code = `/**
 * SCRIPT CNTSCI v10.1 - STRUCTURE TRANSACTIONNELLE
 * IMPORTANT : Votre Google Sheet doit avoir 8 colonnes dans l'ordre suivant :
 * 1. Horodateur | 2. Nom de l'agent | 3. Date de distribution | 4. Centre CNTSCI
 * 5. Structure Sanitaire Servie | 6. Type Produit | 7. SA_GROUPE | 8. Quantité servie
 */

const SHEET_DIST = "BASE DIST"; 

function doGet(e) { return handleRequest(e); }
function doPost(e) { return handleRequest(e); }

function handleRequest(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const action = e.parameter.action;
    if (!action) return createResponse({status:"error", message:"No action"});

    let dSheet = getOrCreate(ss, SHEET_DIST, [
      "Horodateur", 
      "Nom de l'agent", 
      "Date de distribution", 
      "Centre CNTSCI", 
      "Structure Sanitaire Servie", 
      "Type Produit", 
      "SA_GROUPE", 
      "Quantité servie"
    ]);

    if (action === 'get_dist') {
      const last = dSheet.getLastRow();
      if (last < 2) return createResponse([]);
      const data = dSheet.getRange(2, 1, last-1, 8).getValues();
      return createResponse(data.map(r => ({
        horodateur: r[0], 
        nomAgent: r[1], 
        dateDistribution: r[2], 
        centreCntsci: r[3], 
        nomStructuresSanitaire: r[4], 
        typeProduit: r[5], 
        saGroupe: r[6], 
        nbPoches: r[7]
      })));
    }

    if (action === 'post_dist') {
      dSheet.appendRow([
        e.parameter.horodateur || new Date().toLocaleString(), 
        e.parameter.nomAgent, 
        e.parameter.dateDistribution, 
        e.parameter.centreCntsci, 
        e.parameter.nomStructuresSanitaire,
        e.parameter.typeProduit,
        e.parameter.saGroupe,
        e.parameter.nbPoches || 0
      ]);
      return createResponse({status:"success"});
    }
  } catch(e) { return createResponse({status:"error", message:e.toString()}); }
  finally { lock.releaseLock(); }
}

function getOrCreate(ss, n, h) {
  let s = ss.getSheetByName(n);
  if(!s) { s = ss.insertSheet(n); s.appendRow(h); }
  return s;
}

function createResponse(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}`;

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 p-8 rounded-[2rem] text-white border border-red-500/30">
        <h4 className="text-red-500 font-black uppercase text-sm mb-4 flex items-center gap-2">
          <i className="fa-solid fa-code"></i> Mise à jour Script v10.1 Obligatoire
        </h4>
        <p className="text-[10px] font-bold text-slate-300 mb-6 leading-relaxed">
          <span className="text-red-400">Attention :</span> Votre fichier Sheet doit impérativement comporter 8 colonnes. <br/>
          Copiez ce nouveau code et effectuez un <span className="text-white underline">Nouveau Déploiement</span> pour corriger les erreurs d'affichage.
        </p>
        
        <button 
          onClick={() => {navigator.clipboard.writeText(code); alert("Script v10.1 Copié !");}}
          className="w-full bg-red-600 py-4 rounded-2xl font-black uppercase text-xs hover:bg-red-500 transition-all shadow-lg shadow-red-600/20"
        >
          Copier le code v10.1
        </button>
      </div>
    </div>
  );
};

export default ScriptInstruction;
