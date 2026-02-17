import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";

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

export interface SearchableImage {
  id: string;
  pdfName: string;
  pageNumber: number;
  imageIndex: number;
  storageUrl: string;
  caption?: string;
  extractedText?: string;
  relevanceScore?: number;
}

export interface ImageSearchResult {
  images: SearchableImage[];
  totalFound: number;
  query: string;
}

/**
 * Generate embedding for text using Gemini
 * NOTE: Currently disabled due to API issues, using keyword matching instead
 */
async function generateTextEmbedding(text: string): Promise<number[] | null> {
  // Temporarily disabled - Gemini embedding API has issues
  // Using keyword matching as fallback in searchBySemantic
  return null;

  /* Original code (disabled):
  try {
    const response = await ai.models.embedContent({
      model: "text-embedding-004",
      contents: text,
    });
    const embedding = response.embeddings?.[0]?.values;
    return embedding || null;
  } catch (error) {
    console.error("[ImageSearch] Error generating embedding:", error);
    return null;
  }
  */
}

/**
 * Extract keywords from text using Gemini 2.5 Flash
 * Returns important keywords/entities for image search matching
 */
async function extractKeywords(text: string): Promise<string[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analyze this text and extract the most important keywords/entities that would be useful for searching related images.

Return ONLY a JSON array of keywords (no markdown, no explanation):
["keyword1", "keyword2", "keyword3"]

Focus on:
- Medical procedures/techniques (e.g., "Graft Vaginoplasty", "Sigmoid", "SRS")
- Body parts or anatomical terms
- Treatment types
- Specific medical terms mentioned

Text: "${text.substring(0, 1000)}"`,
    });

    const responseText = response.text?.trim() || "";

    // Parse JSON array from response
    try {
      // Remove markdown if present
      const cleanText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const keywords = JSON.parse(cleanText);

      if (Array.isArray(keywords) && keywords.length > 0) {
        console.log("[ImageSearch] AI extracted keywords:", keywords);
        return keywords.map((k: string) => k.toLowerCase().trim());
      }
    } catch (parseError) {
      console.log("[ImageSearch] Failed to parse AI keywords, using fallback:", responseText);
    }

    // Fallback: return empty array if parsing fails
    return [];
  } catch (error) {
    console.error("[ImageSearch] AI keyword extraction error:", error);
    return [];
  }
}

/**
 * Calculate relevance score between query and image metadata
 */
function calculateRelevance(
  query: string,
  image: SearchableImage,
  keywords: string[]
): number {
  let score = 0;
  const normalizedQuery = query.toLowerCase();

  // Score based on caption match
  if (image.caption) {
    const caption = image.caption.toLowerCase();
    if (caption.includes(normalizedQuery)) {
      score += 10;
    }

    for (const keyword of keywords) {
      if (caption.includes(keyword.toLowerCase())) {
        score += 3;
      }
    }
  }

  // Score based on extracted text
  if (image.extractedText) {
    const text = image.extractedText.toLowerCase();
    if (text.includes(normalizedQuery)) {
      score += 8;
    }

    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        score += 2;
      }
    }
  }

  // Score based on PDF name
  if (image.pdfName) {
    const pdfName = image.pdfName.toLowerCase();
    for (const keyword of keywords) {
      if (pdfName.includes(keyword.toLowerCase())) {
        score += 2;
      }
    }
  }

  // Boost score for likely before/after images when query asks for results
  if (
    (normalizedQuery.includes("before") ||
      normalizedQuery.includes("after") ||
      normalizedQuery.includes("ผล") ||
      normalizedQuery.includes("result")) &&
    (image.caption?.toLowerCase().includes("before") ||
      image.caption?.toLowerCase().includes("after") ||
      image.caption?.toLowerCase().includes("ก่อน") ||
      image.caption?.toLowerCase().includes("หลัง"))
  ) {
    score += 5;
  }

  return score;
}

/**
 * Search images by text query using keyword matching
 */
async function searchByKeywords(query: string): Promise<SearchableImage[]> {
  const keywords = await extractKeywords(query);
  console.log("[ImageSearch] Extracted keywords:", keywords);

  try {
    // Build query conditions
    const conditions: string[] = [];
    const params: any = {};

    // Search in caption
    for (let i = 0; i < keywords.length; i++) {
      conditions.push(`caption.ilike.%${keywords[i]}%`);
    }

    // Search in extracted text
    for (let i = 0; i < keywords.length; i++) {
      conditions.push(`extracted_text.ilike.%${keywords[i]}%`);
    }

    // Search in PDF name
    for (let i = 0; i < keywords.length; i++) {
      conditions.push(`pdf_name.ilike.%${keywords[i]}%`);
    }

    if (conditions.length === 0) {
      return [];
    }

    // Query database
    const { data, error } = await supabase
      .from("pdf_images")
      .select("*")
      .or(conditions.join(","));

    if (error) {
      console.error("[ImageSearch] Database error:", error);
      return [];
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      pdfName: item.pdf_name,
      pageNumber: item.page_number,
      imageIndex: item.image_index,
      storageUrl: item.storage_url,
      caption: item.caption,
      extractedText: item.extracted_text,
    }));
  } catch (error) {
    console.error("[ImageSearch] Error in searchByKeywords:", error);
    return [];
  }
}

/**
 * Search images by text query using semantic similarity (via Gemini)
 */
async function searchBySemantic(query: string): Promise<SearchableImage[]> {
  try {
    // Generate embedding for query
    const queryEmbedding = await generateTextEmbedding(query);

    if (!queryEmbedding) {
      console.log("[ImageSearch] Could not generate embedding, falling back to keywords");
      return [];
    }

    // Get all images with captions or extracted text
    const { data, error } = await supabase
      .from("pdf_images")
      .select("*")
      .not("caption", "is", null)
      .limit(100);

    if (error) {
      console.error("[ImageSearch] Database error:", error);
      return [];
    }

    // Calculate semantic similarity (simplified - in production, use vector DB)
    const scoredImages: { image: SearchableImage; score: number }[] = [];

    for (const item of data || []) {
      const image: SearchableImage = {
        id: item.id,
        pdfName: item.pdf_name,
        pageNumber: item.page_number,
        imageIndex: item.image_index,
        storageUrl: item.storage_url,
        caption: item.caption,
        extractedText: item.extracted_text,
      };

      // Use keyword matching as proxy for semantic search
      const keywords = await extractKeywords(query);
      const score = calculateRelevance(query, image, keywords);

      if (score > 0) {
        scoredImages.push({ image, score });
      }
    }

    // Sort by score
    scoredImages.sort((a, b) => b.score - a.score);

    return scoredImages.slice(0, 10).map((si) => ({
      ...si.image,
      relevanceScore: si.score,
    }));
  } catch (error) {
    console.error("[ImageSearch] Error in searchBySemantic:", error);
    return [];
  }
}

/**
 * Main search function - combines keyword and semantic search
 */
export async function searchImagesByText(
  query: string,
  options: {
    maxResults?: number;
    includePages?: number[];
    pdfFilter?: string;
  } = {}
): Promise<ImageSearchResult> {
  console.log(`[ImageSearch] Searching for: "${query}"`);

  try {
    // Try semantic search first
    let images = await searchBySemantic(query);

    // If no results, try keyword search
    if (images.length === 0) {
      images = await searchByKeywords(query);
    }

    // Apply filters
    if (options.pdfFilter) {
      images = images.filter((img) =>
        img.pdfName.toLowerCase().includes(options.pdfFilter!.toLowerCase())
      );
    }

    if (options.includePages && options.includePages.length > 0) {
      images = images.filter((img) => options.includePages!.includes(img.pageNumber));
    }

    // Calculate relevance scores
    const keywords = await extractKeywords(query);
    images = images.map((img) => ({
      ...img,
      relevanceScore: calculateRelevance(query, img, keywords),
    }));

    // Sort by relevance
    images.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

    // Limit results
    const maxResults = options.maxResults || 5;
    images = images.slice(0, maxResults);

    console.log(`[ImageSearch] Found ${images.length} images`);

    return {
      images,
      totalFound: images.length,
      query,
    };
  } catch (error) {
    console.error("[ImageSearch] Search error:", error);
    return {
      images: [],
      totalFound: 0,
      query,
    };
  }
}

/**
 * Get images by PDF name
 */
export async function getImagesByPDF(pdfName: string): Promise<SearchableImage[]> {
  try {
    const { data, error } = await supabase
      .from("pdf_images")
      .select("*")
      .eq("pdf_name", pdfName)
      .order("page_number", { ascending: true })
      .order("image_index", { ascending: true });

    if (error) {
      console.error("[ImageSearch] Error fetching images by PDF:", error);
      return [];
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      pdfName: item.pdf_name,
      pageNumber: item.page_number,
      imageIndex: item.image_index,
      storageUrl: item.storage_url,
      caption: item.caption,
      extractedText: item.extracted_text,
    }));
  } catch (error) {
    console.error("[ImageSearch] Error in getImagesByPDF:", error);
    return [];
  }
}

/**
 * Get images for specific pages
 */
export async function getImagesByPages(
  pdfName: string,
  pageNumbers: number[]
): Promise<SearchableImage[]> {
  try {
    const { data, error } = await supabase
      .from("pdf_images")
      .select("*")
      .eq("pdf_name", pdfName)
      .in("page_number", pageNumbers)
      .order("page_number", { ascending: true })
      .order("image_index", { ascending: true });

    if (error) {
      console.error("[ImageSearch] Error fetching images by pages:", error);
      return [];
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      pdfName: item.pdf_name,
      pageNumber: item.page_number,
      imageIndex: item.image_index,
      storageUrl: item.storage_url,
      caption: item.caption,
      extractedText: item.extracted_text,
    }));
  } catch (error) {
    console.error("[ImageSearch] Error in getImagesByPages:", error);
    return [];
  }
}

/**
 * Calculate relevance score between response text and image metadata
 * Caption has 60% weight, Extracted Text has 40% weight
 */
function calculateRelevanceWithResponse(
  responseText: string,
  image: SearchableImage,
  keywords: string[]
): number {
  let score = 0;
  const normalizedResponse = responseText.toLowerCase();

  // Caption matching (60% weight)
  if (image.caption) {
    const captionLower = image.caption.toLowerCase();

    // Exact phrase match in caption (high score)
    if (captionLower.includes(normalizedResponse)) {
      score += 60;
    }

    // Keyword match in caption
    for (const keyword of keywords) {
      if (captionLower.includes(keyword.toLowerCase())) {
        score += 12; // Each keyword match in caption adds 12 points
      }
    }
  }

  // Extracted text matching (40% weight)
  if (image.extractedText) {
    const textLower = image.extractedText.toLowerCase();

    // Exact phrase match in extracted text
    if (textLower.includes(normalizedResponse)) {
      score += 40;
    }

    // Keyword match in extracted text
    for (const keyword of keywords) {
      if (textLower.includes(keyword.toLowerCase())) {
        score += 8; // Each keyword match in extracted text adds 8 points
      }
    }
  }

  return score;
}

/**
 * Search images by AI response text - prioritizing caption (60%) over extracted text (40%)
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
    // Extract keywords from response
    const keywords = await extractKeywords(responseText);
    console.log("[ImageSearch] Response keywords:", keywords);

    // Get all images with captions or extracted text
    const { data, error } = await supabase
      .from("pdf_images")
      .select("*")
      .not("caption", "is", null)
      .limit(200);

    if (error) {
      console.error("[ImageSearch] Database error:", error);
      return { images: [], totalFound: 0, query: responseText };
    }

    // Calculate relevance scores
    const scoredImages: { image: SearchableImage; score: number }[] = [];

    console.log(`[ImageSearch] Checking ${(data || []).length} total images in database`);

    for (const item of data || []) {
      const image: SearchableImage = {
        id: item.id,
        pdfName: item.pdf_name,
        pageNumber: item.page_number,
        imageIndex: item.image_index,
        storageUrl: item.storage_url,
        caption: item.caption,
        extractedText: item.extracted_text,
      };

      const score = calculateRelevanceWithResponse(responseText, image, keywords);

      // DEBUG: Log all images with their scores
      if (score > 0) {
        console.log(`[ImageSearch] Image ${image.id.substring(0, 8)}... score=${score}, caption="${image.caption?.substring(0, 40)}..."`);
        scoredImages.push({ image, score });
      }
    }

    // Sort by score
    scoredImages.sort((a, b) => b.score - a.score);

    console.log(`[ImageSearch] Total images with score > 0: ${scoredImages.length}`);

    // Show all scored images sorted
    scoredImages.forEach((si, idx) => {
      console.log(`[ImageSearch] Rank #${idx + 1}: score=${si.score}, caption="${si.image.caption?.substring(0, 50)}..."`);
    });

    // Filter by minimum score if specified
    const minScore = options.minScore || 10;
    console.log(`[ImageSearch] Filtering with minScore=${minScore}`);

    const filteredImages = scoredImages.filter((si) => si.score >= minScore);
    console.log(`[ImageSearch] Images after filtering (score >= ${minScore}): ${filteredImages.length}`);

    // Show filtered out images
    const filteredOut = scoredImages.filter((si) => si.score < minScore);
    if (filteredOut.length > 0) {
      console.log(`[ImageSearch] Images filtered out (score < ${minScore}): ${filteredOut.length}`);
      filteredOut.forEach((si, idx) => {
        console.log(`[ImageSearch]   Filtered #${idx + 1}: score=${si.score}, caption="${si.image.caption?.substring(0, 40)}..."`);
      });
    }

    // Limit results
    const maxResults = options.maxResults || 5;
    const finalImages = filteredImages.slice(0, maxResults);

    console.log(`[ImageSearch] Final images returned: ${finalImages.length} (maxResults=${maxResults})`);

    // Log top matches for debugging
    finalImages.forEach((si, idx) => {
      console.log(`[ImageSearch] Final Match #${idx + 1}: score=${si.score}, caption="${si.image.caption?.substring(0, 50)}..."`);
    });

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

export function isImageQuery(query: string): boolean {
  const normalizedQuery = query.toLowerCase();

  const imageIndicators = [
    // Thai
    "รูป",
    "ภาพ",
    "รูปภาพ",
    "ตัวอย่าง",
    "before",
    "after",
    "ก่อน",
    "หลัง",
    "ผลลัพธ์",
    "เคส",
    "case",
    "รีวิว",
    "ดู",
    "เห็น",
    "แสดง",
    "ประกอบ",
    "อธิบายด้วยรูป",
    // English
    "image",
    "photo",
    "picture",
    "example",
    "before",
    "after",
    "result",
    "outcome",
    "case",
    "review",
    "show",
    "see",
    "visual",
    "diagram",
    "illustration",
    "with image",
    "with picture",
  ];

  return imageIndicators.some((indicator) =>
    normalizedQuery.includes(indicator.toLowerCase())
  );
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
  // Only search for images if query indicates image interest
  if (!isImageQuery(query)) {
    return { response, images: [] };
  }

  const searchResult = await searchImagesByText(query, { maxResults: maxImages });

  const images = searchResult.images.map((img) => ({
    url: img.storageUrl,
    caption: img.caption || `จากเอกสาร ${img.pdfName} หน้า ${img.pageNumber}`,
  }));

  return { response, images };
}
