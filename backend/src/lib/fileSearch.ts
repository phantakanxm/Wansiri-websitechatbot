import { ai, FILE_SEARCH_STORE_NAME, CHAT_MODEL } from "./gemini";
import { detectLanguage, translateText, SupportedLanguage } from "./language";
import { withRetry, RETRY_CONFIGS } from "./retry";
import { performFileSearchWithCache, getFileSearchCacheStats } from "./fileSearchCache";
import { searchImagesByText, isImageQuery } from "./imageSearch";

interface ChatMessage {
  role: "user" | "model";
  content: string;
  timestamp: number;
}

interface ChatResponseWithImages {
  response: string;
  detectedLang: SupportedLanguage;
  targetLang: SupportedLanguage;
  translatedQuery?: string;
  responseTime?: number;
  fromCache?: boolean;
  availableImages?: { url: string; caption?: string }[];
  imageCount?: number;
}

/**
 * Regenerate AI response when images are found
 * Creates a new response that properly acknowledges the found images
 */
async function regenerateResponseWithImages(
  originalResponse: string,
  userQuestion: string,
  targetLang: SupportedLanguage,
  imageCount: number,
  imageCaptions: string[]
): Promise<string> {
  if (!ai) {
    // Fallback: just append intro
    const intro = await generateImageIntroduction(userQuestion, targetLang, imageCaptions);
    return originalResponse + "\n\n" + intro;
  }

  try {
    console.log("[Regenerate] AI regenerating response with image context...");

    const captionsText = imageCaptions.slice(0, 3).join("\n");
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Rewrite this response to properly acknowledge that we have found ${imageCount} image(s) to show the user.

Original user question: "${userQuestion}"
Original AI response: "${originalResponse}"
Language: ${targetLang === 'th' ? 'Thai' : targetLang === 'en' ? 'English' : targetLang === 'ko' ? 'Korean' : 'Chinese'}
Image captions found: ${captionsText || 'Hospital related images'}

IMPORTANT: The original response says "no images found" or similar, but we actually FOUND images in our image database. Rewrite the response to:
1. Keep the factual information from the original response
2. Remove any mention of "no images" or "cannot show images"
3. Add a natural transition to introduce the images we found
4. Make it sound like we have the images ready to show

Examples in Thai:
Original: "ในเอกสารไม่พบรูปภาพของคุณหมอศรัณย์ แต่ข้อมูลคือ..."
Rewritten: "คุณหมอศรัณย์ วรรณจำรัส เป็นศัลยแพทย์ผู้เชี่ยวชาญ... นี่คือรูปถ่ายของท่านค่ะ"

Generate ONLY the rewritten response (no explanation):`,
    });

    const newResponse = response.text?.trim() || originalResponse;
    console.log(`[Regenerate] New response: "${newResponse.substring(0, 100)}..."`);
    return newResponse;
  } catch (error) {
    console.error("[Regenerate] Error regenerating response:", error);
    // Fallback
    const intro = await generateImageIntroduction(userQuestion, targetLang, imageCaptions);
    return originalResponse + "\n\n" + intro;
  }
}

/**
 * Generate natural image introduction message using AI
 * Creates context-appropriate message based on image content and language
 */
async function generateImageIntroduction(
  userQuestion: string,
  targetLang: SupportedLanguage,
  imageCaptions: string[]
): Promise<string> {
  if (!ai) {
    // Fallback messages if AI not available
    const fallbackMessages: Record<SupportedLanguage, string> = {
      th: "นี่คือรูปภาพที่เกี่ยวข้องค่ะ",
      en: "Here are the related images:",
      ko: "관련 이미지입니다:",
      zh: "以下是相关图片：",
    };
    return fallbackMessages[targetLang] || fallbackMessages.th;
  }

  try {
    console.log("[ImageIntro] AI generating natural introduction...");

    const captionsText = imageCaptions.slice(0, 3).join("\n");

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate a natural, professional introduction message for showing images in a hospital chatbot.

Context:
- User asked: "${userQuestion}"
- Language: ${targetLang === 'th' ? 'Thai' : targetLang === 'en' ? 'English' : targetLang === 'ko' ? 'Korean' : 'Chinese'}
- This is Wansiri Hospital (โรงพยาบาลวรรณสิริ), a cosmetic and gender reassignment surgery hospital
- Image captions found: ${captionsText || 'Various hospital images'}

Requirements:
1. Natural and warm tone (not robotic like "Here are the images")
2. Professional but friendly
 appropriate for medical/cosmetic hospital
3. Brief (1 short sentence)
4. Match the language specified
5. Can mention the topic if clear from context (technique, review, doctor, etc.)

Examples in Thai:
- นี่คือภาพประกอบเทคนิคการผ่าตัดของเราค่ะ
- นี่คือรูปรีวิวจากลูกค้าจริงของโรงพยาบาลวรรณสิริค่ะ
- นี่คือรูปถ่ายทีมแพทย์ผู้เชี่ยวชาญของเราค่ะ
- นี่คือตารางแพ็คเกจและราคาบริการค่ะ

Examples in English:
- Here are images of our surgical techniques:
- These are real patient reviews from Wansiri Hospital:
- Here are our expert medical team:
- Here's our service package and pricing:

Generate ONLY the introduction sentence (no quotes, no extra explanation):`,
    });

    const message = response.text?.trim() || "";

    if (message) {
      console.log(`[ImageIntro] Generated: "${message}"`);
      return message;
    }

    // Fallback if empty response
    const fallbackMessages: Record<SupportedLanguage, string> = {
      th: "นี่คือรูปภาพที่เกี่ยวข้องค่ะ",
      en: "Here are the related images:",
      ko: "관련 이미지입니다:",
      zh: "以下是相关图片：",
    };
    return fallbackMessages[targetLang] || fallbackMessages.th;
  } catch (error) {
    console.error("[ImageIntro] Error generating introduction:", error);
    // Fallback on error
    const fallbackMessages: Record<SupportedLanguage, string> = {
      th: "นี่คือรูปภาพที่เกี่ยวข้องค่ะ",
      en: "Here are the related images:",
      ko: "관련 이미지입니다:",
      zh: "以下是相关图片：",
    };
    return fallbackMessages[targetLang] || fallbackMessages.th;
  }
}

/**
 * Analyze if user is primarily asking for images using AI
 * Works across multiple languages (Thai, English, Korean, Chinese, etc.)
 */
async function isImageOnlyIntent(userQuestion: string): Promise<boolean> {
  if (!ai) {
    // Fallback to simple check if AI not available
    return userQuestion.length < 50 &&
      /(รูป|ภาพ|image|photo|picture|사진|图片|イメージ)/i.test(userQuestion);
  }

  try {
    console.log("[Intent] AI analyzing user intent...");

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analyze this user message and determine if they are PRIMARILY asking to see/view images/photos.

User message: "${userQuestion}"

Consider:
- Is the main purpose of this message to request images/photos?
- Is it a standalone image request (e.g., "show me images", "ขอดูรูป", "사진 보여줘", "给我看图片")?
- Or is it asking other questions AND mentioning images secondarily?

Respond with ONLY "true" or "false":
- "true" = User is primarily asking for images (override with simple image response)
- "false" = User is asking other things, images are secondary or not the main point

Examples:
- "ขอดูรูป" → true
- "show me photos" → true
- "사진 보여주세요" → true
- "给我看图片" → true
- "รูปเทคนิค sigmoid หน่อย" → false (asking about technique, images are secondary)
- "what is SRS and show images" → false (asking what is SRS first)
- "มีรูปประกอบมั้ย" (at the end of explanation) → false (asking if there are images to supplement)`,
    });

    const result = response.text?.trim().toLowerCase();
    const isImageOnly = result === "true";

    console.log(`[Intent] AI analysis: ${isImageOnly ? 'IMAGE ONLY' : 'MIXED QUERY'}`);
    return isImageOnly;
  } catch (error) {
    console.error("[Intent] Error analyzing intent:", error);
    // Fallback on error
    return userQuestion.length < 50 &&
      /(รูป|ภาพ|image|photo|picture|사진|图片)/i.test(userQuestion);
  }
}

/**
 * Analyze if user question needs context from chat history
 * Returns enhanced query with context if needed
 */
async function getSearchQueryWithContext(
  userQuestion: string,
  history: ChatMessage[]
): Promise<string> {
  // If no history or question is already specific, return as-is
  if (history.length === 0) {
    return userQuestion;
  }

  try {
    console.log("[Context] Analyzing if question needs history context...");

    // Get recent conversation (last 3-4 messages)
    const recentHistory = history.slice(-6);
    const conversation = recentHistory.map(m => `${m.role}: ${m.content}`).join("\n");

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analyze this user question and determine if it's ambiguous/vague and needs context from previous conversation.

Previous conversation:
${conversation}

Current user question: "${userQuestion}"

Is the current question vague/ambiguous on its own? (e.g., "ขอดูรูป", "อธิบายเพิ่ม", "ทำไง", "ราคาเท่าไหร่", "บอกหน่อย")

If YES - combine with relevant context from previous messages.
If NO - return the question as-is.

Return ONLY the search query to use (no explanation):
- If vague: "[context from history] [current question]"
- If clear: "[current question]"

Examples:
- Previous: "เทคนิค srs มีอะไรบ้าง" + Current: "ขอดูรูป" → "เทคนิค srs ขอดูรูป"
- Previous: "ราคาเท่าไหร่" + Current: "มีรูปมั้ย" → "ราคา แพ็คเกจ รูป"
- Current: "ขอดูรูปเทคนิค sigmoid" → "ขอดูรูปเทคนิค sigmoid" (already clear)`,
    });

    const enhancedQuery = response.text?.trim() || userQuestion;

    if (enhancedQuery !== userQuestion) {
      console.log(`[Context] Enhanced query: "${userQuestion}" → "${enhancedQuery}"`);
    } else {
      console.log(`[Context] Question is clear, using as-is: "${userQuestion}"`);
    }

    return enhancedQuery;
  } catch (error) {
    console.error("[Context] Error analyzing context:", error);
    return userQuestion;
  }
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
): Promise<ChatResponseWithImages> {

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

  // 8. Search for relevant images using USER QUESTION with CONTEXT
  // If user asks something vague like "ขอดูรูป", AI will look at history to understand context
  let availableImages: { url: string; caption?: string }[] = [];
  let isImageOnlyQuery = false;

  // Only search if user is asking for images (using AI to detect)
  const isRequestingImages = await isImageQuery(userQuestion);
  if (isRequestingImages) {
    const imageStart = Date.now();

    // Step 1: Get context and analyze intent in PARALLEL
    const [enhancedQuery, imageIntent] = await Promise.all([
      getSearchQueryWithContext(userQuestion, history),
      isImageOnlyIntent(userQuestion)
    ]);
    
    isImageOnlyQuery = imageIntent;

    // Step 2: Search images
    const imageResult = await searchImagesByText(enhancedQuery, { maxResults: 5 });
    availableImages = imageResult.images.map(img => ({
      url: img.storageUrl,
      caption: img.caption,
    }));
    console.log(`[Chat] Image search time: ${Date.now() - imageStart}ms, found ${availableImages.length} images`);
    console.log(`[Chat] Searching with query: "${enhancedQuery}" (original: "${userQuestion}")`);
  } else {
    console.log('[Chat] AI detected: Not an image request, skipping image search');
  }

  // 9. Override response if images found
  // Cases:
  // - User asks for images only → generate natural intro (replace response)
  // - AI says "no images" but we found images → regenerate entire response with image context
  // - Mixed query with images found → append image intro to existing response
  if (availableImages.length > 0) {
    const aiSaysNoImages = /ไม่มีรูป|ไม่พบรูป|no image|no photo|not found|없습니다|没有|cannot.*image|ไม่สามารถ/i.test(finalResponse);
    
    // Get captions from found images for context
    const imageCaptions = availableImages
      .map(img => img.caption)
      .filter((caption): caption is string => !!caption);
    
    if (isImageOnlyQuery) {
      // Case 1: User asks for images only → replace entire response
      console.log('[Chat] Overriding response - AI generating natural image introduction...');

      // Let AI generate a natural, context-appropriate message
      finalResponse = await generateImageIntroduction(userQuestion, targetLang, imageCaptions);
    } else if (aiSaysNoImages) {
      // Case 2: AI says no images but we found them → regenerate entire response
      console.log('[Chat] Regenerating AI response - images found but AI said none');
      
      finalResponse = await regenerateResponseWithImages(
        finalResponse,
        userQuestion,
        targetLang,
        availableImages.length,
        imageCaptions
      );
    } else {
      // Case 3: Mixed query with images found → append image intro
      console.log('[Chat] Appending image introduction to existing response...');
      
      const imageIntro = await generateImageIntroduction(userQuestion, targetLang, imageCaptions);
      finalResponse = finalResponse + "\n\n" + imageIntro;
    }
  }

  const totalTime = Date.now() - startTime;
  console.log("[Chat] ✅ Total response time:", totalTime, "ms");
  console.log("[Chat] DEBUG - Final response length:", finalResponse?.length || 0);
  console.log("[Chat] DEBUG - Final response:", finalResponse);
  console.log("[Chat] DEBUG - Last 50 chars:", finalResponse?.slice(-50));
  console.log("[Chat] DEBUG - Available images:", availableImages.length);
  console.log("========================================\n");

  return {
    response: finalResponse,
    detectedLang: inputLang,
    targetLang: targetLang,
    translatedQuery: inputLang !== "th" ? searchQuery : undefined,
    responseTime: totalTime,
    fromCache: searchResult.fromCache,
    availableImages: availableImages.length > 0 ? availableImages : undefined,
    imageCount: availableImages.length,
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
