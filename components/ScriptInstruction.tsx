
import React from 'react';

const ScriptInstruction: React.FC = () => {
  const code = `/**
 * SCRIPT CNTSCI v15.3 - ALIGNEMENT STRUCTURE UTILISATEUR
 * IMPORTANT: Ce script place "Nombre de poches servie" en 5ème colonne.
 */

const SHEET_DIST = "BASE DIST"; 
const SHEET_USERS = "USERS";

// En-têtes alignés sur votre demande
const HEADERS_DIST = [
  "Horodateur", 
  "Nom de l'agent", 
  "Date de distribution", 
  "Centre CNTSCI", 
  "Nombre de poches servie", // 5ème colonne comme demandé
  "Structure Sanitaire Servie", 
  "Type Produit", 
  "SA_GROUPE"
];

const HEADERS_USERS = ["Nom de l'agent", "Login", "Mot de passe", "Centre d'Affectation"];

function doGet(e) { return handleRequest(e); }
function doPost(e) { return handleRequest(e); }

function handleRequest(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(15000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const action = e.parameter.action;
    if (!action) return createResponse({status:"error", message:"Action manquante"});

    let dSheet = getOrCreate(ss, SHEET_DIST, HEADERS_DIST);
    let uSheet = getOrCreate(ss, SHEET_USERS, HEADERS_USERS);

    if (action === 'get_users') {
      const last = uSheet.getLastRow();
      if (last < 2) return createResponse([{nomAgent: "ADMINISTRATEUR", login: "admin", motDePasse: "1234", centreAffectation: "DIRECTION GENERALE"}]);
      const data = uSheet.getRange(2, 1, last-1, 4).getValues();
      return createResponse(data.map(r => ({nomAgent: String(r[0]), login: String(r[1]), motDePasse: String(r[2]), centreAffectation: String(r[3])})));
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
        nbPoches: Number(r[4]) || 0, // Tiré de la 5ème colonne
        nomStructuresSanitaire: r[5] || "NON SPECIFIE", 
        typeProduit: r[6] || "CGR ADULTE", 
        saGroupe: r[7] || "O+"
      })));
    }

    if (action === 'post_dist') {
      dSheet.appendRow([
        e.parameter.horodateur || new Date().toLocaleString(), 
        e.parameter.nomAgent, 
        e.parameter.dateDistribution, 
        e.parameter.centreCntsci, 
        e.parameter.nbPoches || 0, // Valeur insérée en 5ème colonne
        e.parameter.nomStructuresSanitaire, 
        e.parameter.typeProduit, 
        e.parameter.saGroupe
      ]);
      return createResponse({status:"success"});
    }

    if (action === 'post_user') {
      uSheet.appendRow([e.parameter.nomAgent, e.parameter.login, e.parameter.motDePasse, e.parameter.centreAffectation]);
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
  if(!s) { 
    s = ss.insertSheet(n); 
    s.appendRow(h); 
  } else {
    const currentHeaders = s.getRange(1, 1, 1, h.length).getValues()[0];
    if (JSON.stringify(currentHeaders) !== JSON.stringify(h)) {
       s.getRange(1, 1, 1, h.length).setValues([h]);
    }
  }
  return s;
}

function createResponse(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}`;

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white border border-indigo-500/30 shadow-2xl">
        <h4 className="text-indigo-400 font-black uppercase text-xs mb-4 flex items-center gap-2">
          <i className="fa-solid fa-triangle-exclamation text-amber-500"></i> Mise à jour requise : Script v15.3
        </h4>
        <div className="space-y-4 mb-8">
          <p className="text-[10px] font-bold text-slate-300 leading-relaxed">
            Pour que la colonne <span className="text-white">"Nombre de poches servie"</span> soit correctement lue par l'application :
            <br/><br/>
            1. Copiez ce nouveau code.<br/>
            2. Remplacez votre script actuel dans Google Apps Script.<br/>
            3. Cliquez sur <span className="text-white">Déployer > Nouvel envoi</span>.<br/>
            4. L'application lira désormais la 5ème colonne de votre feuille pour les calculs.
          </p>
        </div>
        
        <button 
          onClick={() => {navigator.clipboard.writeText(code); alert("Script v15.3 Copié !");}}
          className="w-full bg-indigo-600 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-500 transition-all flex items-center justify-center gap-3"
        >
          <i className="fa-solid fa-copy"></i>
          Copier le Script v15.3
        </button>
      </div>
    </div>
  );
};

export default ScriptInstruction;
