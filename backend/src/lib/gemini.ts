import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is required");
}

export const ai = new GoogleGenAI({
  apiKey,
});

// Model configuration
export const CHAT_MODEL = "gemini-2.5-flash";

// File Search Store name from env
export const FILE_SEARCH_STORE_NAME = process.env.FILE_SEARCH_STORE_NAME!;

if (!FILE_SEARCH_STORE_NAME) {
  throw new Error("FILE_SEARCH_STORE_NAME is required");
}
