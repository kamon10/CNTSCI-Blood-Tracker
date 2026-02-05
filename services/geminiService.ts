
import { GoogleGenAI } from "@google/genai";
import { DistributionData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

export const analyzeDistribution = async (data: DistributionData) => {
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
