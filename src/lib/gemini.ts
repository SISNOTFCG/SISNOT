/// <reference types="vite/client" />
import { GoogleGenAI } from "@google/genai";

/**
 * Utility to initialize the Gemini AI client.
 * Outside of Google AI Studio, you must provide your own API key.
 */
const getGeminiClient = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") {
    return null;
  }

  return new GoogleGenAI({ apiKey });
};

export const ai = getGeminiClient();

/**
 * Example of how to use the new SDK:
 * 
 * const response = await ai.models.generateContent({
 *   model: "gemini-1.5-flash",
 *   contents: "Hello",
 * });
 */
