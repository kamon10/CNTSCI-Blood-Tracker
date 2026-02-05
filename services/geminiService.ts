
import { GoogleGenAI } from "@google/genai";
import { DistributionData } from "../types.ts";

// Accès sécurisé à la clé API pour éviter "process is not defined"
const getApiKey = () => {
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      // @ts-ignore
      return process.env.API_KEY;
    }
    return "";
  } catch (e) {
    return "";
  }
};

export const analyzeDistribution = async (data: DistributionData) => {
  const apiKey = getApiKey();
  if (!apiKey) return "Analyse indisponible (Clé API manquante).";

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyse cette saisie de distribution de sang unitaire pour le CNTSCI. 
      Donne un bref commentaire pro (2 phrases max).
      
      Données:
      Agent: ${data.nomAgent}
      Structure servie: ${data.nomStructuresSanitaire}
      Type de Produit: ${data.typeProduit}
      Groupe Sanguin: ${data.saGroupe}
      Quantité: ${data.nbPoches} poches`,
      config: {
        systemInstruction: "Tu es un expert en logistique de transfusion sanguine pour la Côte d'Ivoire. Ton ton est formel. Souligne l'importance de la distribution si le groupe est O- ou si le produit est pédiatrique.",
        temperature: 0.7,
      },
    });

    return response.text || "Analyse indisponible.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Analyse indisponible.";
  }
};
