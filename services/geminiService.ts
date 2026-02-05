
import { GoogleGenAI } from "@google/genai";
import { DistributionData } from "../types";

// Sécurité pour éviter que l'app ne plante si process n'est pas défini
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
      Vérifie si les chiffres semblent cohérents (par exemple, si le nombre de structures sanitaires est proportionnel aux produits).
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
        systemInstruction: "Tu es un expert en logistique de transfusion sanguine en Côte d'Ivoire. Ton ton est formel, précis et encourageant.",
        temperature: 0.7,
      },
    });

    return response.text;
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return "Analyse indisponible pour le moment.";
  }
};
