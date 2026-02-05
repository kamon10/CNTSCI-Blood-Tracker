
import { GoogleGenAI } from "@google/genai";
import { DistributionData } from "../types.ts";

// Sécurisation de l'accès à l'API KEY pour éviter les erreurs ReferenceError: process is not defined
const getApiKey = () => {
  try {
    return process.env.API_KEY || "";
  } catch (e) {
    return "";
  }
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

export const analyzeDistribution = async (data: DistributionData) => {
  const apiKey = getApiKey();
  if (!apiKey) return "Analyse indisponible (Clé API manquante).";

  try {
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
