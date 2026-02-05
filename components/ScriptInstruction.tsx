
import React from 'react';
import { ICONS } from '../constants';

const ScriptInstruction: React.FC = () => {
  const code = `/**
 * SCRIPT DE SYNCHRONISATION (BASE DIST)
 * Remplacez tout le contenu de l'éditeur Apps Script par ce code.
 */

const SHEET_NAME = "BASE DIST"; // Nom de l'onglet dans votre Sheet

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000); // Évite les conflits d'écriture simultanée
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    
    // Si l'onglet n'existe pas, on le crée avec les en-têtes
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow([
        "Horodateur", "Nom de l'agent", "Date de distribution", 
        "Centre CNTSCI", "Nombre de CGR ADULTE", "Nombre de CGR PEDIATRIQUE", 
        "Nombre de PLASMA", "Nombre PLAQUETTES", "Nombre Structures Sanitaire"
      ]);
    }

    // Récupération sécurisée des données
    const contents = e.postData.contents;
    const data = JSON.parse(contents);
    
    // Ajout de la ligne (9 colonnes respectées)
    sheet.appendRow([
      data.horodateur || new Date().toLocaleString(),
      data.nomAgent || "N/A",
      data.dateDistribution || "",
      data.centreCntsci || "",
      data.nbCgrAdulte || 0,
      data.nbCgrPediatrique || 0,
      data.nbPlasma || 0,
      data.nbPlaquettes || 0,
      data.nbStructuresSanitaire || 0
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({result: 'success'}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({result: 'error', error: err.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('⚡ CNTSCI')
      .addItem('Mettre en forme le tableau', 'formatSheet')
      .addToUi();
}

function formatSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) return;
  sheet.getRange(1, 1, 1, 9).setFontWeight("bold").setBackground("#f3f3f3");
  sheet.setFrozenRows(1);
}`;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 border border-blue-200 p-5 rounded-2xl">
          <h4 className="font-black text-blue-700 text-xs uppercase mb-4 flex items-center gap-2">
            <i className="fa-solid fa-list-check"></i> Checklist Déploiement
          </h4>
          <ul className="space-y-3 text-[11px] text-blue-900 font-medium">
            <li className="flex gap-2">
              <span className="bg-blue-200 text-blue-700 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0">1</span>
              <span>Cliquez sur <b>Déployer</b> {">"} <b>Nouveau déploiement</b>.</span>
            </li>
            <li className="flex gap-2">
              <span className="bg-blue-200 text-blue-700 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0">2</span>
              <span>Type : Sélectionnez <b>Application Web</b>.</span>
            </li>
            <li className="flex gap-2">
              <span className="bg-blue-200 text-blue-700 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0">3</span>
              <span>Qui a accès : Choisissez impérativement <b>"Tout le monde"</b> (Anyone).</span>
            </li>
            <li className="flex gap-2">
              <span className="bg-blue-200 text-blue-700 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0">4</span>
              <span>Copiez l'URL finale (finit par <code>/exec</code>) et collez-la ci-dessus.</span>
            </li>
          </ul>
        </div>
        
        <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl">
          <h4 className="font-black text-amber-700 text-xs uppercase mb-4 flex items-center gap-2">
             {ICONS.warning} Attention
          </h4>
          <p className="text-[11px] text-amber-900 leading-relaxed font-medium">
            Si vous modifiez le code du script plus tard, vous <b>devez</b> créer un <b>Nouveau Déploiement</b> (ou mettre à jour la version) pour que les changements soient pris en compte par l'application. L'URL de test finissant par <code>/dev</code> ne fonctionnera pas ici.
          </p>
        </div>
      </div>

      <div className="bg-slate-900 text-slate-300 p-5 rounded-2xl text-[10px] font-mono overflow-x-auto border border-slate-700 shadow-2xl">
        <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-3">
          <span className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-tighter">
            {ICONS.code} Code du Script (BASE DIST)
          </span>
          <button 
            onClick={() => navigator.clipboard.writeText(code)}
            className="hover:text-white transition-all bg-white/5 hover:bg-white/15 px-4 py-2 rounded-xl border border-white/10 flex items-center gap-2"
          >
            <i className="fa-solid fa-copy"></i> Copier
          </button>
        </div>
        <pre className="leading-relaxed">{code}</pre>
      </div>
    </div>
  );
};

export default ScriptInstruction;
