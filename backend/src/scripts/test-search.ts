import { ai, FILE_SEARCH_STORE_NAME } from "../lib/gemini";

async function testSearch() {
  const query = "สรุปเนื้อหา";
  console.log("Query:", query);
  console.log("Store:", FILE_SEARCH_STORE_NAME);

  try {
    // Method 1: Direct retrieval
    console.log("\n=== Method 1: Direct generateContent with fileSearch ===");
    const response1 = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: query,
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
    console.log("Response:", response1.text);
    console.log("Candidates:", JSON.stringify((response1 as any).candidates?.[0], null, 2)?.substring(0, 1000));

  } catch (error) {
    console.error("Method 1 Error:", error);
  }

  try {
    // Method 2: Using retrieval config
    console.log("\n=== Method 2: With retrieval config ===");
    const response2 = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: query,
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
    console.log("Response:", response2.text);

  } catch (error) {
    console.error("Method 2 Error:", error);
  }
}

testSearch();
