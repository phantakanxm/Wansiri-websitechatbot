import { ai, FILE_SEARCH_STORE_NAME, CHAT_MODEL } from "./gemini";

/**
 * Enhanced File Search with detailed debugging
 */

interface FileSearchResult {
  text: string;
  usedFileSearch: boolean;
  chunks: any[];
  retrievalQueries: string[];
}

/**
 * Generate response with enhanced logging and fallback
 */
export async function generateChatResponseEnhanced(
  userQuestion: string
): Promise<FileSearchResult> {
  console.log("\n" + "=".repeat(60));
  console.log("[Chat Enhanced] Question:", userQuestion);
  console.log("[Chat Enhanced] Store:", FILE_SEARCH_STORE_NAME);
  console.log("[Chat Enhanced] Model:", CHAT_MODEL);
  console.log("=".repeat(60) + "\n");

  const systemInstruction = `คุณคือแชตบอทผู้ช่วยของ "โรงพยาบาลวรรณสิริ"
โรงพยาบาลด้านศัลยกรรมและหัตถการทางการแพทย์

กฎสำคัญ:
1. ตอบคำถามจากข้อมูลในเอกสารเท่านั้น
2. หากไม่มีข้อมูล ให้บอกว่าไม่พบและแนะนำติดต่อเจ้าหน้าที่
3. สุภาพ อบอุ่น เป็นมิตร
4. ไม่ให้คำวินิจฉัยทางการแพทย์
5. ไม่รับประกันผลลัพธ์`;

  // Tool configuration with explicit settings
  const tools = [
    {
      fileSearch: {
        fileSearchStoreNames: [FILE_SEARCH_STORE_NAME],
        // Note: Gemini doesn't support topK in this format,
        // but we can verify results
      },
    },
  ];

  console.log("[Debug] Tools config:", JSON.stringify(tools, null, 2));

  try {
    const response = await ai.models.generateContent({
      model: CHAT_MODEL,
      contents: userQuestion,
      config: {
        systemInstruction,
        tools,
      },
    });

    console.log("[Debug] Raw response keys:", Object.keys(response as any));

    // Extract grounding metadata
    const candidates = (response as any).candidates;
    const metadata = candidates?.[0]?.groundingMetadata;
    const chunks = metadata?.groundingChunks || [];
    const retrievalQueries = metadata?.retrievalQueries || [];

    const result: FileSearchResult = {
      text: response.text || "",
      usedFileSearch: chunks.length > 0,
      chunks,
      retrievalQueries,
    };

    // Detailed logging
    console.log("\n[Debug] Grounding Metadata:", metadata ? "✅ Present" : "❌ Missing");
    console.log("[Debug] Chunks count:", chunks.length);
    console.log("[Debug] Retrieval queries:", retrievalQueries);

    if (chunks.length > 0) {
      console.log("\n📄 Retrieved Chunks:");
      chunks.forEach((chunk: any, i: number) => {
        const ctx = chunk.retrievedContext || {};
        console.log(`  [${i + 1}] Source: ${ctx.title || "Unknown"}`);
        const preview = ctx.text?.substring(0, 150)?.replace(/\n/g, " ") || "N/A";
        console.log(`      Preview: "${preview}..."\n`);
      });
    }

    return result;
  } catch (error) {
    console.error("[Error] generateContent failed:", error);
    throw error;
  }
}

/**
 * Test if documents are ready for search
 */
export async function verifyDocumentsReady(): Promise<{
  ready: boolean;
  count: number;
  documents: any[];
}> {
  try {
    const response = await ai.fileSearchStores.documents.list({
      parent: FILE_SEARCH_STORE_NAME,
    });

    const documents = (response as any).pageInternal || response || [];
    const activeDocs = documents.filter(
      (d: any) => d.state === "STATE_ACTIVE" || !d.state
    );

    return {
      ready: activeDocs.length > 0,
      count: activeDocs.length,
      documents: activeDocs,
    };
  } catch (error) {
    console.error("[Error] verifyDocumentsReady:", error);
    return { ready: false, count: 0, documents: [] };
  }
}
