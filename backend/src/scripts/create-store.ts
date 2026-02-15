import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("❌ Error: GEMINI_API_KEY is required");
  console.error("Please set GEMINI_API_KEY environment variable");
  process.exit(1);
}

const ai = new GoogleGenAI({
  apiKey,
});

async function createStore() {
  try {
    const store = await ai.fileSearchStores.create({
      config: { displayName: "chatbot-knowledge-base" },
    });

    console.log("✅ File Search Store created successfully!");
    console.log("\n📋 Store Details:");
    console.log("   Name:", store.name);
    console.log("   Display Name:", store.displayName);
    console.log("\n📝 Add this to your .env file:");
    console.log(`   FILE_SEARCH_STORE_NAME=${store.name}`);
  } catch (error) {
    console.error("❌ Failed to create store:", error);
    process.exit(1);
  }
}

createStore();
