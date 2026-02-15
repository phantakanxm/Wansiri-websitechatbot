import { ai, FILE_SEARCH_STORE_NAME } from "./gemini";

async function testFileSearch() {
  console.log("Testing File Search...");
  console.log("Store:", FILE_SEARCH_STORE_NAME);

  try {
    // Method 1: Using fileSearch directly in tools
    const response1 = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: "เอกสารมีอะไรบ้าง",
      config: {
        tools: [
          {
            fileSearch: {
              fileSearchStoreNames: [FILE_SEARCH_STORE_NAME],
            },
          },
        ],
      },
    });
    console.log("\nMethod 1 Response:", response1.text);

  } catch (error) {
    console.error("Method 1 Error:", error);
  }
}

testFileSearch();
