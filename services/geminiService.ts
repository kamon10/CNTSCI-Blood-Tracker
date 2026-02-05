
import { GoogleGenAI } from "@google/genai";
import { DistributionData } from "../types.ts";

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

    return response.text;
  } catch (error) {
    return "Analyse indisponible.";
  }
};
