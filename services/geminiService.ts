
import { GoogleGenAI } from "@google/genai";
import { DistributionData } from "../types";

const getApiKey = () => {
  try {
    return (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : "";
  } catch (e) {
    return "";
  }
};

const apiKey = getApiKey();
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const analyzeDistribution = async (data: DistributionData) => {
  if (!ai) return "Analyse IA non configurée.";
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyse cette saisie de distribution de sang pour le CNTSCI. 
      Vérifie si les chiffres semblent cohérents pour une distribution quotidienne.
      Donne un bref commentaire professionnel de 2 phrases maximum.
      
      Données:
      Agent: ${data.nomAgent}
      Centre: ${data.centreCntsci}
      CGR Adulte: ${data.nbCgrAdulte}
      CGR Péd: ${data.nbCgrPediatrique}
      Plasma: ${data.nbPlasma}
      Plaquettes: ${data.nbPlaquettes}
      Structures servies: ${data.nbStructuresSanitaire}`,
      config: {
        systemInstruction: "Tu es un expert en logistique de transfusion sanguine. Ton ton est formel, médical et précis.",
        temperature: 0.7,
      },
    });

    return response.text;
  } catch (error) {
    return "Analyse indisponible.";
  }
};

export const analyzeGlobalSession = async (records: DistributionData[]) => {
  if (!ai || records.length === 0) return null;

  const summary = records.map(r => 
    `- ${r.centreCntsci}: CGR A:${r.nbCgrAdulte}, CGR P:${r.nbCgrPediatrique}, Plasma:${r.nbPlasma}, Plaq:${r.nbPlaquettes}, Struct:${r.nbStructuresSanitaire}`
  ).join('\n');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `En tant qu'analyste stratégique du CNTSCI, examine ces données de distribution :\n${summary}\n\nProduis une synthèse courte (3-4 phrases) incluant :
      1. Une observation sur le mix produit (ex: forte demande pédiatrique).
      2. Une alerte sur un centre ou une zone si nécessaire.
      3. Une recommandation logistique concrète pour la prochaine session.`,
      config: {
        systemInstruction: "Tu es le Directeur National de la Distribution Sanguine. Ton analyse doit être stratégique, orientée vers l'action et la sécurité transfusionnelle.",
        temperature: 0.5,
      },
    });
    return response.text;
  } catch (e) {
    return "Impossible de générer la synthèse stratégique.";
  }
};
