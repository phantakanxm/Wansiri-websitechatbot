/**
 * Video Recommendation System with AI Detection
 * 
 * ใช้ AI (Gemini) วิเคราะห์คำถามเพื่อตัดสินใจว่าควรส่งวิดีโอประเภทไหน
 * รองรับหลายภาษา: ไทย, อังกฤษ, เกาหลี, จีน, ญี่ปุ่น ฯลฯ
 */

import { GoogleGenAI } from "@google/genai";

// Gemini AI client
const apiKey = process.env.GEMINI_API_KEY || "";
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export interface VideoRecommendation {
  url: string;
  title: string;
  category: string;        // หมวดหมู่ (hospital, review, procedure, etc.)
  thumbnail?: string;
  description?: string;    // คำอธิบายสำหรับ AI เข้าใจ context
}

// ฐานข้อมูลวิดีโอ (สามารถย้ายไป Supabase ได้ในอนาคต)
const VIDEO_DATABASE: VideoRecommendation[] = [
  {
    url: "https://youtu.be/a6mrb-A0W9U",
    title: "แนะนำโรงพยาบาลวรรณสิริ - ศูนย์ผ่าตัดแปลงเพศ",
    category: "hospital",
    description: "วิดีโอแนะนำโรงพยาบาลวรรณสิริ สถานที่ บรรยากาศ และทีมแพทย์"
  },
  // {
  //   url: "https://www.youtube.com/watch?v=YYYYYYYYYYY",
  //   title: "รีวิวการผ่าตัด SRS ที่โรงพยาบาลวรรณสิริ",
  //   category: "review",
  //   thumbnail: "https://img.youtube.com/vi/YYYYYYYYYYY/mqdefault.jpg",
  //   description: "รีวิวประสบการณ์ผู้ป่วยที่ผ่าตัดที่โรงพยาบาลวรรณสิริ"
  // },
  // {
  //   url: "https://www.youtube.com/watch?v=ZZZZZZZZZZZ",
  //   title: "ขั้นตอนการเตรียมตัวก่อนผ่าตัด SRS",
  //   category: "procedure",
  //   thumbnail: "https://img.youtube.com/vi/ZZZZZZZZZZZ/mqdefault.jpg",
  //   description: "คำแนะนำการเตรียมตัวก่อนเข้ารับการผ่าตัด"
  // }
];

// Available video categories for AI
const VIDEO_CATEGORIES = [
  {
    value: "hospital",
    label: "แนะนำโรงพยาบาล/วรรณสิริ",
    triggers: [
      "ถามเกี่ยวกับโรงพยาบาลวรรณสิริ",
      "ขอแนะนำโรงพยาบาล",
      "อยากรู้จักโรงพยาบาล",
      "โรงพยาบาลที่ไหนดี",
      "hospital recommendation",
      "introduce hospital",
      "about wanssiri hospital",
      "where is the hospital",
      "병원 추천",
      "医院推荐",
      "病院の紹介"
    ]
  },
  // {
  //   value: "review",
  //   label: "รีวิว/ประสบการณ์",
  //   triggers: [
  //     "รีวิว",
  //     "ประสบการณ์",
  //     "ผลลัพธ์",
  //     "review",
  //     "testimonial",
  //     "experience",
  //     "result",
  //     "후기",
  //     "レビュー"
  //   ]
  // },
  // {
  //   value: "procedure",
  //   label: "ขั้นตอน/วิธีการ",
  //   triggers: [
  //     "ขั้นตอน",
  //     "วิธีการ",
  //     "เตรียมตัว",
  //     "procedure",
  //     "preparation",
  //     "steps",
  //     "how to",
  //     "준비",
  //     "步骤"
  //   ]
  // }
];

/**
 * ใช้ AI วิเคราะห์คำถามเพื่อตัดสินใจว่าควรส่งวิดีโอ category ไหน
 * รองรับหลายภาษาโดยอัตโนมัติ
 */
export async function detectVideoCategoryWithAI(
  query: string
): Promise<string[]> {
  if (!ai) {
    console.log("[Video AI] Gemini not available, using fallback");
    return detectVideoCategoryFallback(query);
  }

  try {
    console.log(`[Video AI] Analyzing query: "${query.substring(0, 50)}..."`);

    const categoriesList = VIDEO_CATEGORIES.map(c => 
      `- "${c.value}": ${c.label} (${c.triggers.join(", ")})`
    ).join("\n");

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analyze this user query and determine which video category(ies) would be most helpful to send.

Available video categories:
${categoriesList}

User query: "${query}"

Instructions:
1. The query may be in ANY language (Thai, English, Korean, Chinese, Japanese, etc.)
2. Determine if the user is asking for/about:
   - Hospital introduction/recommendation (โรงพยาบาลวรรณสิริ, hospital recommendation, 병원 추천)
   - Reviews/testimonials (รีวิว, review, 후기)
   - Procedures/preparation (ขั้นตอน, procedure, 준비)
3. Return ONLY the category value(s), comma-separated if multiple, or "none" if no video is appropriate

Examples:
- "แนะนำโรงพยาบาลหน่อย" (Thai) → hospital
- "hospital recommendation" (English) → hospital
- "병원 추천해주세요" (Korean) → hospital
- "医院在哪里" (Chinese) → hospital
- "ราคาเท่าไหร่" (Thai - asking price) → none
- "what is SRS" (English) → none

Respond with ONLY the category value, comma-separated values, or "none":`,
    });

    const result = response.text?.trim().toLowerCase() || "none";
    
    if (result === "none" || result === "null" || result === "") {
      console.log(`[Video AI] No video category detected`);
      return [];
    }

    // Parse multiple categories
    const categories = result.split(",").map(c => c.trim()).filter(c => c);
    
    // Validate categories
    const validCategories = VIDEO_CATEGORIES.map(c => c.value);
    const matchedCategories = categories.filter(c => validCategories.includes(c));
    
    if (matchedCategories.length > 0) {
      console.log(`[Video AI] Detected categories: ${matchedCategories.join(", ")}`);
      return matchedCategories;
    }

    console.log(`[Video AI] AI returned unknown value: ${result}`);
    return [];

  } catch (error) {
    console.error("[Video AI] Error:", error);
    return detectVideoCategoryFallback(query);
  }
}

/**
 * Fallback: ใช้ keyword matching ถ้า AI ไม่พร้อมใช้งาน
 */
function detectVideoCategoryFallback(query: string): string[] {
  const normalizedQuery = query.toLowerCase();
  const matchedCategories: string[] = [];
  
  for (const category of VIDEO_CATEGORIES) {
    for (const trigger of category.triggers) {
      if (normalizedQuery.includes(trigger.toLowerCase())) {
        matchedCategories.push(category.value);
        break;
      }
    }
  }
  
  return [...new Set(matchedCategories)]; // Remove duplicates
}

/**
 * ดึงวิดีโอตาม categories ที่ AI วิเคราะห์ได้
 */
export function getVideosByCategories(
  categories: string[],
  maxPerCategory: number = 1
): VideoRecommendation[] {
  const videos: VideoRecommendation[] = [];
  
  for (const category of categories) {
    const categoryVideos = VIDEO_DATABASE
      .filter(v => v.category === category)
      .slice(0, maxPerCategory);
    
    videos.push(...categoryVideos);
  }
  
  return videos;
}

/**
 * Enhance response ด้วยวิดีโอที่ AI เลือกให้
 * ใช้คู่กับ enhanceResponseWithImages
 */
export async function enhanceResponseWithVideos(
  response: string,
  query: string,
  maxVideos: number = 2
): Promise<{
  response: string;
  videos: { url: string; title?: string }[];
}> {
  // ใช้ AI วิเคราะห์ category
  const categories = await detectVideoCategoryWithAI(query);
  
  if (categories.length === 0) {
    console.log(`[Video] No relevant video categories detected`);
    return { response, videos: [] };
  }
  
  // ดึงวิดีโอตาม categories
  const videos = getVideosByCategories(categories, maxVideos);
  
  if (videos.length > 0) {
    console.log(`[Video] Selected ${videos.length} video(s) for categories: ${categories.join(", ")}`);
  }
  
  return {
    response,
    videos: videos.map(v => ({
      url: v.url,
      title: v.title
    }))
  };
}
