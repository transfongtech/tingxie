import { GoogleGenAI } from "@google/genai";

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Gemini API key is not configured. Set GEMINI_API_KEY or GOOGLE_API_KEY.",
    );
  }
  return new GoogleGenAI({ apiKey });
}
