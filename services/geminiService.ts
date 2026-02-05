
import { GoogleGenAI } from "@google/genai";
import { DistributionData } from "../types.ts";

// Always initialize with a named parameter using process.env.API_KEY directly.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeDistribution = async (data: DistributionData) => {
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

    // Access the .text property directly (it is not a method).
    return response.text || "Analyse indisponible.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Analyse indisponible.";
  }
};
