
import React from 'react';

const ScriptInstruction: React.FC = () => {
  const code = `/**
 * SCRIPT CNTSCI v15.0 - PROFIL AGENT ET AUTHENTIFICATION
 * Nécessite : Feuille "BASE DIST" et "USERS"
 * Structure USERS : Nom de l'agent | Login | Mot de passe | Centre d'Affectation
 */

const SHEET_DIST = "BASE DIST"; 
const SHEET_USERS = "USERS";

function doGet(e) { return handleRequest(e); }
function doPost(e) { return handleRequest(e); }

function handleRequest(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(15000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const action = e.parameter.action;
    if (!action) return createResponse({status:"error", message:"Action manquante"});

    // Initialisation feuilles
    let dSheet = getOrCreate(ss, SHEET_DIST, ["Horodateur", "Nom de l'agent", "Date de distribution", "Centre CNTSCI", "Structure Sanitaire Servie", "Type Produit", "SA_GROUPE", "Quantité servie"]);
    let uSheet = getOrCreate(ss, SHEET_USERS, ["Nom de l'agent", "Login", "Mot de passe", "Centre d'Affectation"]);

    if (action === 'get_users') {
      const last = uSheet.getLastRow();
      if (last < 2) {
        // Utilisateur par défaut si vide
        return createResponse([{
          nomAgent: "ADMINISTRATEUR",
          login: "admin", 
          motDePasse: "1234", 
          centreAffectation: "DIRECTION GENERALE"
        }]);
      }
      const data = uSheet.getRange(2, 1, last-1, 4).getValues();
      return createResponse(data.map(r => ({
        nomAgent: String(r[0]),
        login: String(r[1]),
        motDePasse: String(r[2]),
        centreAffectation: String(r[3])
      })));
    }

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
    
    return createResponse({status:"error", message:"Action inconnue"});
  } catch(e) { 
    return createResponse({status:"error", message: e.toString()}); 
  } finally { 
    lock.releaseLock(); 
  }
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
      <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white border border-indigo-500/30 shadow-2xl">
        <h4 className="text-indigo-400 font-black uppercase text-xs mb-4 flex items-center gap-2">
          <i className="fa-solid fa-user-shield"></i> Mise à jour Script v15.0
        </h4>
        <div className="space-y-3 mb-8">
          <p className="text-[10px] font-bold text-slate-300 leading-relaxed">
            <span className="text-amber-400">Configuration USERS :</span> Votre feuille doit avoir exactement cet ordre :<br/>
            <span className="text-white bg-white/10 px-2 py-0.5 rounded">Nom de l'agent</span> | 
            <span className="text-white bg-white/10 px-2 py-0.5 rounded">Login</span> | 
            <span className="text-white bg-white/10 px-2 py-0.5 rounded">Mot de passe</span> | 
            <span className="text-white bg-white/10 px-2 py-0.5 rounded">Centre d'Affectation</span>
          </p>
        </div>
        
        <button 
          onClick={() => {navigator.clipboard.writeText(code); alert("Script v15.0 Copié !");}}
          className="w-full bg-indigo-600 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20"
        >
          Copier le code v15.0
        </button>
      </div>
    </div>
  );
};

export default ScriptInstruction;
