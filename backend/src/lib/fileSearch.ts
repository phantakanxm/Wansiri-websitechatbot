import { ai, FILE_SEARCH_STORE_NAME, CHAT_MODEL } from "./gemini";
import { detectLanguage, translateText, SupportedLanguage } from "./language";
import { withRetry, RETRY_CONFIGS } from "./retry";
import { performFileSearchWithCache, getFileSearchCacheStats } from "./fileSearchCache";

interface ChatMessage {
  role: "user" | "model";
  content: string;
  timestamp: number;
}

/**
 * Generate system instruction based on target language
 */
function getSystemInstruction(targetLang: SupportedLanguage): string {
  const baseInstruction = {
    th: `คุณคือแชตบอทผู้ช่วยของ "โรงพยาบาลวรรณสิริ"
โรงพยาบาลด้านศัลยกรรมและหัตถการทางการแพทย์

หลักการตอบคำถาม:
1. ตอบกระชับ ได้ใจความสำคัญ ไม่ยืดยาว
2. ใช้ bullet points หรือตัวเลข (1, 2, 3) เพื่อให้อ่านง่าย
3. เน้นข้อมูลที่ถามจริงๆ ไม่ต้องเล่าอะไรมาก
4. ตอบคำถามจากข้อมูลในเอกสารเท่านั้น
5. หากไม่มีข้อมูล ให้บอกว่าไม่พบและแนะนำติดต่อเจ้าหน้าที่
6. ห้ามให้คำวินิจฉัยทางการแพทย์
7. ห้ามรับประกันผลลัพธ์
8. ตอบเป็นภาษาไทยเท่านั้น
9. จำข้อมูลจากการสนทนาก่อนหน้าได้ - ถ้าผู้ใช้บอกชื่อ ประเทศ หรือข้อมูลส่วนตัวไปแล้ว ให้จำและอ้างอิงได้`,

    en: `You are a chatbot assistant for "Wansiri Hospital"
A hospital specializing in surgery and medical procedures.

Response guidelines:
1. Give concise answers - get to the point quickly
2. Use bullet points or numbered lists (1, 2, 3) for clarity
3. Focus only on what was asked - no unnecessary details
4. Answer ONLY from the information in the documents
5. If no information is found, politely say so and suggest contacting staff
6. Do NOT provide medical diagnosis
7. Do NOT guarantee surgical results
8. Respond in English only`,

    ko: `당신은 "완시리 병원"의 챗봇 도우미입니다.
수술 및 의료 시술을 전문으로 하는 병원입니다.

답변 지침:
1. 간결하게 답변 - 핵심을 빠르게 전달
2. 글머리 기호나 번호 목록(1, 2, 3)을 사용하여 명확하게
3. 질문한 내용에만 집중 - 불필요한 세부사항 제외
4. 문서의 정볼만 답변
5. 정보가 없으면 정중히 말씀드리고 병원 직원 연결 안내
6. 의학적 진단 제공 금지
7. 수술 결과 보장 금지
8. 한국어로만 답변`,

    zh: `您是"Wansiri医院"的聊天机器人助手。
一家专门从事手术和医疗程序的医院。

回答指南：
1. 简洁回答 - 快速切入重点
2. 使用项目符号或编号列表（1、2、3）以便清晰
3. 只关注被问到的内容 - 不包括不必要的细节
4. 仅根据文档中的信息回答
5. 如果找不到信息，礼貌地说明并建议联系工作人员
6. 不要提供医疗诊断
7. 不要保证手术结果
8. 只用中文回答`,
  };

  return baseInstruction[targetLang];
}

/**
 * Generate response with chat history and multilingual support
 * 
 * @param forceLanguage - If provided, response will be in this language (manual mode)
 *                        If not provided, auto-detect from user question
 */
export async function generateChatResponseWithHistory(
  userQuestion: string,
  history: ChatMessage[],
  forceLanguage?: SupportedLanguage
): Promise<{ response: string; detectedLang: SupportedLanguage; targetLang: SupportedLanguage; translatedQuery?: string; responseTime?: number; fromCache?: boolean }> {
  
  const startTime = Date.now();
  
  // DEBUG: Check what we received
  console.log("[Chat] DEBUG - Received history:", JSON.stringify(history.map(m => ({ role: m.role, content: m.content.substring(0, 30) }))));
  console.log("[Chat] DEBUG - History length:", history.length);
  console.log("[Chat] DEBUG - History type:", typeof history, Array.isArray(history));
  
  // 1. Always detect the actual input language from the user's message
  const inputLang = await detectLanguage(userQuestion);
  console.log("[Chat] Input language detected:", inputLang, `(${Date.now() - startTime}ms)`);
  
  // 2. Determine target language for response
  const targetLang = forceLanguage || inputLang;
  console.log("[Chat] Target language for response:", targetLang);

  // 3. Translate to Thai for search (parallel processing for better performance)
  let searchQuery = userQuestion;
  let translatedQuery: string | undefined;
  
  if (inputLang !== "th") {
    const transStart = Date.now();
    searchQuery = await translateText(userQuestion, inputLang, "th");
    translatedQuery = searchQuery;
    console.log("[Chat] Translated to Thai for search:", searchQuery, `(${Date.now() - transStart}ms)`);
  }

  console.log("\n========================================");
  console.log("[Chat] Original question:", userQuestion);
  console.log("[Chat] Input language:", inputLang);
  console.log("[Chat] Target language:", targetLang);
  console.log("[Chat] Search query (Thai):", searchQuery);
  console.log("[Chat] History messages:", history.length);
  console.log("[Chat] Total setup time:", Date.now() - startTime, "ms");
  console.log("========================================\n");
  console.log("========================================\n");

  // 4. Build contents with history
  const contents: any[] = [];
  
  // Add history messages
  for (const msg of history) {
    contents.push({
      role: msg.role,
      parts: [{ text: msg.content }],
    });
  }
  
  // Add current search query (in Thai for best search results)
  contents.push({
    role: "user",
    parts: [{ text: searchQuery }],
  });

  // DEBUG: Log contents being sent to Gemini
  console.log("[Chat] DEBUG - Contents sent to Gemini:");
  contents.forEach((c, i) => {
    console.log(`  [${i}] ${c.role}: ${c.parts[0].text.substring(0, 50)}...`);
  });

  // 5. Search with Thai query (with caching) - now async
  const searchStartTime = Date.now();
  
  const searchResult = await performFileSearchWithCache(searchQuery, contents);
  
  console.log(`[Chat] File search time: ${Date.now() - searchStartTime}ms ${searchResult.fromCache ? '(CACHED)' : '(API)'}`);
  
  let thaiResponse = searchResult.response;
  let chunks = searchResult.chunks;

  // Log results
  if (chunks.length > 0) {
    console.log("[Chat] ✅ File Search used, chunks:", chunks.length);
  } else {
    console.log("[Chat] ❌ File Search not used");
  }
  
  console.log("[Chat] DEBUG - Thai response (before translation):");
  console.log("[Chat] DEBUG - Length:", thaiResponse?.length || 0);
  console.log("[Chat] DEBUG - Text:", thaiResponse);
  
  // 7. Translate to target language (which may be different from input language in manual mode)
  let finalResponse = thaiResponse;
  if (targetLang !== "th") {
    const transStart = Date.now();
    finalResponse = await translateText(thaiResponse, "th", targetLang);
    console.log("[Chat] Response translation time:", Date.now() - transStart, "ms");
    console.log("[Chat] DEBUG - Translated response:");
    console.log("[Chat] DEBUG - Length:", finalResponse?.length || 0);
    console.log("[Chat] DEBUG - Text:", finalResponse);
  }

  const totalTime = Date.now() - startTime;
  console.log("[Chat] ✅ Total response time:", totalTime, "ms");
  console.log("[Chat] DEBUG - Final response length:", finalResponse?.length || 0);
  console.log("[Chat] DEBUG - Final response:", finalResponse);
  console.log("[Chat] DEBUG - Last 50 chars:", finalResponse?.slice(-50));
  console.log("========================================\n");

  return {
    response: finalResponse,
    detectedLang: inputLang,
    targetLang: targetLang,
    translatedQuery: inputLang !== "th" ? searchQuery : undefined,
    responseTime: totalTime,
    fromCache: searchResult.fromCache,
  };
}

/**
 * Simple chat without history (backward compatibility)
 */
export async function generateChatResponse(userQuestion: string): Promise<string> {
  const result = await generateChatResponseWithHistory(userQuestion, []);
  return result.response;
}

// Export other functions from original file
export async function createFileSearchStore(displayName: string) {
  const store = await ai.fileSearchStores.create({
    config: { displayName },
  });
  return store;
}

export async function uploadFileToStore(filePath: string, originalFileName: string) {
  console.log("[Upload] Uploading file:", originalFileName);
  console.log("[Upload] To store:", FILE_SEARCH_STORE_NAME);

  const result = await ai.fileSearchStores.uploadToFileSearchStore({
    file: filePath,
    fileSearchStoreName: FILE_SEARCH_STORE_NAME,
    config: {
      displayName: originalFileName,
      chunkingConfig: {
        whiteSpaceConfig: {
          maxTokensPerChunk: 300,
          maxOverlapTokens: 30,
        },
      },
    },
  });

  console.log("[Upload] Result:", JSON.stringify(result, null, 2));
  return result;
}

export async function listDocuments() {
  console.log("[ListDocuments] Fetching from store:", FILE_SEARCH_STORE_NAME);

  const response = await ai.fileSearchStores.documents.list({
    parent: FILE_SEARCH_STORE_NAME,
  });

  let documents: any[] = [];
  if (Array.isArray(response)) {
    documents = response;
  } else if ((response as any).pageInternal) {
    documents = (response as any).pageInternal;
  } else if ((response as any).documents) {
    documents = (response as any).documents;
  } else if ((response as any).items) {
    documents = (response as any).items;
  }

  console.log("[ListDocuments] Found:", documents.length, "documents");
  return documents;
}

export async function deleteDocument(documentName: string) {
  await ai.fileSearchStores.documents.delete({
    name: documentName,
  });
}
