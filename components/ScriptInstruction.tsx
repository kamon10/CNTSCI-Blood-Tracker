
import React from 'react';
import { ICONS } from '../constants';

const ScriptInstruction: React.FC = () => {
  const code = `/**
 * SCRIPT COMPLET POUR GOOGLE SHEETS (BASE DIST)
 * Copiez-collez ce code pour remplacer l'intégralité de votre script actuel.
 */

const SUPERVISORS = ["votre-email@gmail.com", "kadioamon@gmail.com"];
const SHEET_NAME = "BASE DIST";

/**
 * RÉCEPTION DES DONNÉES DE L'APPLICATION
 * Cette fonction est appelée par l'application pour enregistrer une ligne.
 */
function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
    const data = JSON.parse(e.postData.contents);
    
    // Ordre des 9 colonnes demandé
    sheet.appendRow([
      data.horodateur,            // 1. Horodateur
      data.nomAgent,             // 2. Nom de l'agent
      data.dateDistribution,     // 3. Date de distribution
      data.centreCntsci,         // 4. Centre CNTSCI
      data.nbCgrAdulte,          // 5. Nombre de CGR ADULTE
      data.nbCgrPediatrique,     // 6. Nombre de CGR PEDIATRIQUE
      data.nbPlasma,             // 7. Nombre de PLASMA
      data.nbPlaquettes,         // 8. Nombre PLAQUETTES
      data.nbStructuresSanitaire // 9. Nombre Structures Sanitaire
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({result: 'success'}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({result: 'error', error: err.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * MENU DE SUPERVISION
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('⚡ Gestion Superviseur')
      .addItem('✅ Valider la ligne (Vert)', 'approveRow')
      .addItem('❌ Rejeter/Effacer la ligne', 'clearRow')
      .addToUi();
}

function approveRow() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const range = sheet.getActiveRange();
  const row = range.getRow();
  if (row < 2) return;
  sheet.getRange(row, 1, 1, sheet.getLastColumn()).setBackground("#d9ead3");
  SpreadsheetApp.getActiveSpreadsheet().toast("Ligne validée.");
}

function clearRow() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const row = sheet.getActiveRange().getRow();
  if (row < 2) return;
  const ui = SpreadsheetApp.getUi();
  if (ui.alert('Confirmation', 'Supprimer cette ligne ?', ui.ButtonSet.YES_NO) == ui.Button.YES) {
    sheet.deleteRow(row);
  }
}`;

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3">
        <span className="text-amber-600 text-lg">{ICONS.warning}</span>
        <div className="text-xs text-amber-900 leading-relaxed">
          <p className="font-bold mb-1">Action Requise :</p>
          Vous devez copier ce code dans votre éditeur Apps Script et effectuer un <b>"Nouveau déploiement"</b> de type <b>"Application Web"</b> accessible à <b>"Tout le monde"</b>.
        </div>
      </div>
      <div className="bg-slate-900 text-slate-300 p-5 rounded-2xl text-[10px] font-mono overflow-x-auto border border-slate-700 shadow-inner">
        <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-3">
          <span className="flex items-center gap-2 text-slate-400">
            {ICONS.code} Script complet (doPost + Menus)
          </span>
          <button 
            onClick={() => navigator.clipboard.writeText(code)}
            className="hover:text-white transition-colors bg-white/10 px-3 py-1.5 rounded-lg border border-white/10"
          >
            Copier le code
          </button>
        </div>
        <pre>{code}</pre>
      </div>
    </div>
  );
};

export default ScriptInstruction;
