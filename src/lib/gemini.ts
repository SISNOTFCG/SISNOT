import { GoogleGenAI } from "@google/genai";

/**
 * Utility to initialize the Gemini AI client.
 * Outside of Google AI Studio, you must provide your own API key.
 * In Vite, this is typically done via environment variables prefixed with VITE_.
 */
const getGeminiClient = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") {
    console.warn("Gemini API Key not configured. Please set VITE_GEMINI_API_KEY in your environment.");
    return null;
  }

  return new GoogleGenAI({ apiKey });
};

export const genAI = getGeminiClient();

export const getModel = (modelName: string = "gemini-1.5-flash") => {
  if (!genAI) return null;
  return genAI.getGenerativeModel({ model: modelName });
};
