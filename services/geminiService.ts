
import { GoogleGenAI } from "@google/genai";
import { DistributionData } from "../types.ts";

/**
 * Analyse une distribution de sang à l'aide de l'IA Gemini.
 * Utilise la clé API fournie via process.env.API_KEY conformément aux directives.
 */
export const analyzeDistribution = async (data: DistributionData) => {
  // Accès direct à process.env.API_KEY comme requis par les directives SDK
  if (!process.env.API_KEY) {
    return "Analyse indisponible (Clé API manquante).";
  }

  try {
    // Initialisation directe avec la clé API de l'environnement
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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

    // Extraction directe de la propriété .text comme requis
    return response.text || "Analyse indisponible.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Analyse indisponible.";
  }
};
