import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || "";

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("[ImageSearch] Missing Supabase credentials");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Gemini AI client
const apiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

// Storage bucket name
const STORAGE_BUCKET = "pdf-images";

export interface SearchableImage {
  id: string;
  category: string;
  storageUrl: string;
  caption?: string;
  extractedText?: string;
  tags?: string[];
  relevanceScore?: number;
}

export interface ImageSearchResult {
  images: SearchableImage[];
  totalFound: number;
  query: string;
}

export interface UploadImageResult {
  success: boolean;
  image?: SearchableImage;
  error?: string;
}

/**
 * ============================================
 * Image Upload Functions
 * ============================================
 */

/**
 * Ensure storage bucket exists
 */
async function ensureBucketExists(): Promise<void> {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === STORAGE_BUCKET);

    if (!bucketExists) {
      const { error } = await supabase.storage.createBucket(STORAGE_BUCKET, {
        public: true,
        fileSizeLimit: 52428800,
      });
      if (error) {
        console.error("[ImageUpload] Error creating bucket:", error);
      } else {
        console.log("[ImageUpload] Created bucket:", STORAGE_BUCKET);
      }
    }
  } catch (error) {
    console.error("[ImageUpload] Error checking bucket:", error);
  }
}

/**
 * Analyze image with Gemini Vision
 */
async function analyzeImageWithAI(imagePath: string): Promise<{
  caption: string;
  extractedText: string;
  tags: string[];
} | null> {
  if (!ai) {
    console.warn("[ImageUpload] Gemini AI not available");
    return null;
  }

  try {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString("base64");
    const mimeType = "image/png";

    console.log(`[ImageUpload] Analyzing image with Gemini...`);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Analyze this image and provide:
1. Brief description/caption of what the image shows
2. Any text visible in the image
3. Relevant tags/keywords for searching (array of 5-10 tags)

Respond in JSON format ONLY:
{
  "caption": "brief description",
  "extractedText": "text in image",
  "tags": ["tag1", "tag2", "tag3"]
}`,
            },
            {
              inlineData: { mimeType, data: base64Image },
            },
          ],
        },
      ],
    });

    const text = response.text;
    if (!text) return null;

    try {
      const cleanText = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const result = JSON.parse(cleanText);
      return {
        caption: result.caption || "",
        extractedText: result.extractedText || "",
        tags: result.tags || [],
      };
    } catch (parseError) {
      console.error("[ImageUpload] Failed to parse AI response:", text);
      return null;
    }
  } catch (error) {
    console.error("[ImageUpload] Error analyzing image:", error);
    return null;
  }
}

/**
 * Upload image directly with AI analysis
 */
export async function uploadImageDirect(
  filePath: string,
  originalFileName: string,
  category: string = "general"
): Promise<UploadImageResult> {
  console.log(`[ImageUpload] Starting upload: ${originalFileName} [${category}]`);

  try {
    await ensureBucketExists();

    const tempDir = path.join(process.cwd(), "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const optimizedPath = path.join(tempDir, `${uuidv4()}_opt.png`);

    await sharp(filePath)
      .resize(1920, 1920, { fit: "inside", withoutEnlargement: true })
      .png({ quality: 90 })
      .toFile(optimizedPath);

    const fileExt = path.extname(originalFileName) || ".png";
    const storageFileName = `${uuidv4()}_${originalFileName.replace(/[^a-zA-Z0-9]/g, "_")}${fileExt}`;
    const fileContent = fs.readFileSync(optimizedPath);

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storageFileName, fileContent, {
        contentType: `image/${fileExt.replace(".", "") || "png"}`,
        upsert: true,
      });

    if (uploadError) {
      console.error("[ImageUpload] Upload error:", uploadError);
      fs.unlinkSync(optimizedPath);
      return { success: false, error: uploadError.message };
    }

    const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storageFileName);
    const storageUrl = urlData?.publicUrl;

    if (!storageUrl) {
      fs.unlinkSync(optimizedPath);
      return { success: false, error: "Failed to get public URL" };
    }

    console.log(`[ImageUpload] Uploaded: ${storageUrl}`);

    const analysis = await analyzeImageWithAI(optimizedPath);
    const caption = analysis?.caption || "";
    const extractedText = analysis?.extractedText || "";
    const tags = analysis?.tags || [];

    if (analysis) {
      console.log(`[ImageUpload] AI Analysis: ${caption?.substring(0, 50)}...`);
    }

    const { data: insertedData, error: dbError } = await supabase
      .from("images")
      .insert({
        storage_url: storageUrl,
        filename: storageFileName,
        category: category,
        caption: caption,
        extracted_text: extractedText,
        tags: tags,
        source_type: "upload",
        source_name: originalFileName,
        is_active: true,
      })
      .select()
      .single();

    fs.unlinkSync(optimizedPath);

    if (dbError) {
      console.error("[ImageUpload] DB error:", dbError);
      return { success: false, error: dbError.message };
    }

    console.log(`[ImageUpload] Complete: ${originalFileName}`);

    return {
      success: true,
      image: {
        id: insertedData.id,
        category: insertedData.category,
        storageUrl: insertedData.storage_url,
        caption: insertedData.caption,
        extractedText: insertedData.extracted_text,
        tags: insertedData.tags,
      },
    };
  } catch (error) {
    console.error("[ImageUpload] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * List all uploaded images
 */
export async function listUploadedImages(category?: string): Promise<SearchableImage[]> {
  try {
    let query = supabase
      .from("images")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (category) {
      query = query.eq("category", category);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[ImageUpload] List error:", error);
      return [];
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      category: item.category,
      storageUrl: item.storage_url,
      caption: item.caption,
      extractedText: item.extracted_text,
      tags: item.tags,
    }));
  } catch (error) {
    console.error("[ImageUpload] List error:", error);
    return [];
  }
}

/**
 * Delete a specific image by ID (soft delete)
 */
export async function deleteImageById(imageId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("images")
      .update({ is_active: false })
      .eq("id", imageId);

    if (error) {
      console.error("[ImageUpload] Delete error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[ImageUpload] Delete error:", error);
    return false;
  }
}

/**
 * List trashed (soft deleted) images
 */
export async function listTrashedImages(): Promise<SearchableImage[]> {
  try {
    const { data, error } = await supabase
      .from("images")
      .select("*")
      .eq("is_active", false)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[ImageUpload] List trashed error:", error);
      return [];
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      category: item.category,
      storageUrl: item.storage_url,
      caption: item.caption,
      extractedText: item.extracted_text,
      tags: item.tags,
    }));
  } catch (error) {
    console.error("[ImageUpload] List trashed error:", error);
    return [];
  }
}

/**
 * Restore image from trash
 */
export async function restoreImage(imageId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("images")
      .update({ is_active: true })
      .eq("id", imageId);

    if (error) {
      console.error("[ImageUpload] Restore error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[ImageUpload] Restore error:", error);
    return false;
  }
}

/**
 * Permanently delete image (hard delete)
 */
export async function permanentlyDeleteImage(imageId: string): Promise<boolean> {
  try {
    const { data: image, error: fetchError } = await supabase
      .from("images")
      .select("storage_url")
      .eq("id", imageId)
      .single();

    if (fetchError || !image) {
      console.error("[ImageUpload] Fetch error:", fetchError);
      return false;
    }

    const url = new URL(image.storage_url);
    const fileName = path.basename(url.pathname);
    await supabase.storage.from(STORAGE_BUCKET).remove([fileName]);

    const { error: deleteError } = await supabase
      .from("images")
      .delete()
      .eq("id", imageId);

    if (deleteError) {
      console.error("[ImageUpload] Permanent delete error:", deleteError);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[ImageUpload] Permanent delete error:", error);
    return false;
  }
}

/**
 * ============================================
 * AI Category Detection
 * ============================================
 */

/**
 * Detect image category from user query using Gemini AI
 * Returns category code or null if general/uncertain
 */
async function detectCategoryWithAI(query: string): Promise<string | null> {
  if (!ai) {
    console.log("[ImageSearch] AI not available, skipping category detection");
    return null;
  }

  try {
    console.log(`[ImageSearch] AI detecting category for: "${query.substring(0, 50)}..."`);
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analyze this user question and determine which image category it relates to.

Available categories:
- srs-tec: Surgical techniques, procedures, methods, how surgery is performed (e.g., "เทคนิคการผ่าตัด", "sigmoid", "colon", "graft")
- srs-review: Reviews, results, before/after photos, patient cases, outcomes (e.g., "รีวิว", "ผลลัพธ์", "before/after", "เคส")
- srs-doctor: Doctor information, surgeon profiles, medical staff (e.g., "หมอ", "แพทย์", "doctor", "surgeon")
- srs-package: Pricing, packages, costs, fees, promotions (e.g., "ราคา", "แพ็คเกจ", "price", "cost")
- srs-room: Patient rooms, hospital rooms, recovery rooms, accommodation (e.g., "ห้องพัก", "ห้องรับรอง", "room", "ward")
- srs-operatingroom: Operating rooms, surgery rooms, medical equipment, OR (e.g., "ห้องผ่าตัด", "ห้องซีสาร์", "operating room", "OR", "surgery room")
- general: General information, doesn't clearly fit above categories

Respond with ONLY the category code (e.g., "srs-tec") or "general".
If the query asks for images/photos/examples of a specific topic, determine the category based on the topic.

User question: "${query.substring(0, 500)}"`,
    });

    const category = response.text?.trim().toLowerCase();
    
    const validCategories = ["srs-tec", "srs-review", "srs-doctor", "srs-package", "srs-room", "srs-operatingroom"];
    
    if (category && validCategories.includes(category)) {
      console.log(`[ImageSearch] AI detected category: ${category}`);
      return category;
    }
    
    console.log(`[ImageSearch] AI returned: ${category} (using general search)`);
    return null;
  } catch (error) {
    console.error("[ImageSearch] Category detection error:", error);
    return null;
  }
}

/**
 * ============================================
 * Image Search Functions
 * ============================================
 */

/**
 * Extract keywords from text using Gemini
 */
async function extractKeywords(text: string): Promise<string[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analyze this text and extract important keywords for image search.

Return ONLY a JSON array:
["keyword1", "keyword2", "keyword3"]

Focus on: medical procedures, body parts, treatment types, specific terms.

Text: "${text.substring(0, 1000)}"`,
    });

    const responseText = response.text?.trim() || "";
    try {
      const cleanText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const keywords = JSON.parse(cleanText);
      if (Array.isArray(keywords)) {
        return keywords.map((k: string) => k.toLowerCase().trim());
      }
    } catch (parseError) {
      console.log("[ImageSearch] Failed to parse keywords");
    }
    return [];
  } catch (error) {
    console.error("[ImageSearch] Keyword extraction error:", error);
    return [];
  }
}

/**
 * Calculate relevance score
 */
function calculateRelevance(
  query: string,
  image: SearchableImage,
  keywords: string[]
): number {
  let score = 0;
  const normalizedQuery = query.toLowerCase();

  if (image.caption) {
    const caption = image.caption.toLowerCase();
    if (caption.includes(normalizedQuery)) score += 10;
    for (const keyword of keywords) {
      if (caption.includes(keyword.toLowerCase())) score += 3;
    }
  }

  if (image.tags) {
    for (const tag of image.tags) {
      if (tag.toLowerCase().includes(normalizedQuery)) score += 5;
      for (const keyword of keywords) {
        if (tag.toLowerCase().includes(keyword.toLowerCase())) score += 2;
      }
    }
  }

  if (image.extractedText) {
    const text = image.extractedText.toLowerCase();
    if (text.includes(normalizedQuery)) score += 8;
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) score += 2;
    }
  }

  return score;
}

/**
 * Search images by text query with AI category detection
 */
export async function searchImagesByText(
  query: string,
  options: {
    maxResults?: number;
    category?: string;
  } = {}
): Promise<ImageSearchResult> {
  console.log(`[ImageSearch] Searching for: "${query}"`);

  try {
    // Step 1: Detect category and extract keywords in PARALLEL
    let detectedCategory = options.category;
    
    const [aiCategory, keywords] = await Promise.all([
      // Detect category if not manually specified
      !detectedCategory ? detectCategoryWithAI(query) : Promise.resolve(null),
      // Extract keywords for relevance scoring
      extractKeywords(query)
    ]);
    
    if (!detectedCategory && aiCategory) {
      detectedCategory = aiCategory;
    }

    // Step 3: Build database query with category filter
    let dbQuery = supabase
      .from("images")
      .select("*")
      .eq("is_active", true)
      .not("caption", "is", null);

    if (detectedCategory) {
      dbQuery = dbQuery.eq("category", detectedCategory);
      console.log(`[ImageSearch] Filtering by category: ${detectedCategory}`);
    } else {
      console.log(`[ImageSearch] No category filter, searching all images`);
    }

    const { data, error } = await dbQuery.limit(200);

    if (error) {
      console.error("[ImageSearch] Database error:", error);
      return { images: [], totalFound: 0, query };
    }

    console.log(`[ImageSearch] Found ${data?.length || 0} images in database`);

    // Step 4: Calculate relevance scores (but include ALL images in category)
    const scoredImages: { image: SearchableImage; score: number }[] = [];

    for (const item of data || []) {
      const image: SearchableImage = {
        id: item.id,
        category: item.category,
        storageUrl: item.storage_url,
        caption: item.caption,
        extractedText: item.extracted_text,
        tags: item.tags,
      };

      const score = calculateRelevance(query, image, keywords);
      // Include ALL images in category, even with score 0
      scoredImages.push({ image, score });
    }

    scoredImages.sort((a, b) => b.score - a.score);

    // Show all images in category, sorted by relevance (but limit by maxResults)
    const maxResults = options.maxResults || 5;
    const finalImages = scoredImages.slice(0, maxResults);

    console.log(`[ImageSearch] Returning ${finalImages.length}/${scoredImages.length} images (category: ${detectedCategory || 'none'})`);
    
    // Log scores for debugging
    if (scoredImages.length > 0) {
      console.log('[ImageSearch] Image scores:');
      scoredImages.forEach((si, idx) => {
        console.log(`  #${idx + 1}: score=${si.score}, caption="${si.image.caption?.substring(0, 40)}..."`);
      });
    }

    return {
      images: finalImages.map((si) => ({
        ...si.image,
        relevanceScore: si.score,
      })),
      totalFound: finalImages.length,
      query,
    };
  } catch (error) {
    console.error("[ImageSearch] Search error:", error);
    return { images: [], totalFound: 0, query };
  }
}

/**
 * Search images by AI response text with AI category detection
 */
export async function searchImagesByResponse(
  responseText: string,
  options: {
    maxResults?: number;
    minScore?: number;
  } = {}
): Promise<ImageSearchResult> {
  console.log(`[ImageSearch] Searching by response: "${responseText.substring(0, 50)}..."`);

  try {
    // Step 1: Detect category and extract keywords in PARALLEL
    const [detectedCategory, keywords] = await Promise.all([
      detectCategoryWithAI(responseText),
      extractKeywords(responseText)
    ]);

    // Step 3: Build database query with category filter
    let dbQuery = supabase
      .from("images")
      .select("*")
      .eq("is_active", true)
      .not("caption", "is", null);

    if (detectedCategory) {
      dbQuery = dbQuery.eq("category", detectedCategory);
      console.log(`[ImageSearch] Filtering by category: ${detectedCategory}`);
    } else {
      console.log(`[ImageSearch] No category filter, searching all images`);
    }

    const { data, error } = await dbQuery.limit(200);

    if (error) {
      console.error("[ImageSearch] Database error:", error);
      return { images: [], totalFound: 0, query: responseText };
    }

    console.log(`[ImageSearch] Found ${data?.length || 0} images in database`);

    // Step 4: Calculate relevance scores (but include ALL images in category)
    const scoredImages: { image: SearchableImage; score: number }[] = [];

    for (const item of data || []) {
      const image: SearchableImage = {
        id: item.id,
        category: item.category,
        storageUrl: item.storage_url,
        caption: item.caption,
        extractedText: item.extracted_text,
        tags: item.tags,
      };

      const score = calculateRelevance(responseText, image, keywords);
      // Include ALL images in category, even with score 0
      scoredImages.push({ image, score });
    }

    scoredImages.sort((a, b) => b.score - a.score);

    // Show all images in category, sorted by relevance (but limit by maxResults)
    const maxResults = options.maxResults || 5;
    const finalImages = scoredImages.slice(0, maxResults);

    console.log(`[ImageSearch] Returning ${finalImages.length}/${scoredImages.length} images (category: ${detectedCategory || 'none'})`);
    
    // Log scores for debugging
    if (scoredImages.length > 0) {
      console.log('[ImageSearch] Image scores:');
      scoredImages.forEach((si, idx) => {
        console.log(`  #${idx + 1}: score=${si.score}, category=${si.image.category}, caption="${si.image.caption?.substring(0, 40)}..."`);
      });
    }

    return {
      images: finalImages.map((si) => ({
        ...si.image,
        relevanceScore: si.score,
      })),
      totalFound: finalImages.length,
      query: responseText,
    };
  } catch (error) {
    console.error("[ImageSearch] Search by response error:", error);
    return { images: [], totalFound: 0, query: responseText };
  }
}

/**
 * Detect if user is requesting images using AI
 * Works across all languages (Thai, English, Korean, Chinese, etc.)
 */
export async function isImageQuery(query: string): Promise<boolean> {
  if (!ai) {
    // Fallback to simple regex if AI not available
    const normalizedQuery = query.toLowerCase();
    const imageIndicators = [
      "รูป", "ภาพ", "รูปภาพ", "ตัวอย่าง", "before", "after", "ก่อน", "หลัง",
      "ผลลัพธ์", "เคส", "case", "รีวิว", "ดู", "เห็น", "แสดง", "ประกอบ",
      "image", "photo", "picture", "example", "result", "outcome", "review",
      "show", "see", "visual", "diagram", "illustration",
      "사진", "이미지", "보여주", "그림", "사진을",  // Korean
      "图片", "照片", "图像", "显示", "看", "图片",  // Chinese
    ];
    return imageIndicators.some((indicator) =>
      normalizedQuery.includes(indicator.toLowerCase())
    );
  }

  try {
    console.log(`[ImageQuery] AI analyzing if query requests images: "${query.substring(0, 50)}..."`);
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analyze this user message and determine if they are requesting to see/view images or photos.

User message: "${query}"

This could be in ANY language (Thai, English, Korean, Chinese, Japanese, etc.).

Respond with ONLY "true" or "false":
- "true" = User is asking to see images/photos/pictures/diagrams/examples
- "false" = User is NOT asking for images (asking for text information only)

Examples across languages:
- "ขอดูรูป" (Thai) → true
- "show me images" (English) → true
- "사진 보여주세요" (Korean) → true
- "给我看图片" (Chinese) → true
- "画像を見せて" (Japanese) → true
- "เทคนิคคืออะไร" (Thai - asking what is technique) → false
- "what is SRS" (English) → false
- "시술 방법" (Korean - asking procedure method) → false`,
    });

    const result = response.text?.trim().toLowerCase();
    const isRequestingImages = result === "true";
    
    console.log(`[ImageQuery] AI result: ${isRequestingImages ? 'IMAGE REQUEST' : 'TEXT QUERY'}`);
    return isRequestingImages;
  } catch (error) {
    console.error("[ImageQuery] Error analyzing query:", error);
    // Fallback on error
    const normalizedQuery = query.toLowerCase();
    const imageIndicators = [
      "รูป", "ภาพ", "image", "photo", "picture", "사진", "이미지", "图片", "照片"
    ];
    return imageIndicators.some((indicator) =>
      normalizedQuery.includes(indicator.toLowerCase())
    );
  }
}

/**
 * Enhance response with relevant images
 */
export async function enhanceResponseWithImages(
  response: string,
  query: string,
  maxImages: number = 3
): Promise<{
  response: string;
  images: { url: string; caption?: string }[];
}> {
  if (!isImageQuery(query)) {
    return { response, images: [] };
  }

  const searchResult = await searchImagesByText(query, { maxResults: maxImages });

  const images = searchResult.images.map((img) => ({
    url: img.storageUrl,
    caption: img.caption || `จากหมวดหมู่ ${img.category}`,
  }));

  return { response, images };
}
