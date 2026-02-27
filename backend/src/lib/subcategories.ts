import { supabase, isSupabaseEnabled } from "./supabase";
import { GoogleGenAI } from "@google/genai";

// Gemini AI client for subcategory detection
const apiKey = process.env.GEMINI_API_KEY || "";
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export interface Subcategory {
  id: string;
  category_id: string;
  value: string;
  label: string;
  keywords: string[];
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubcategoryWithCategory extends Subcategory {
  category_value?: string;
  category_label?: string;
}

// Get all subcategories (optionally filtered by category_id)
export async function getSubcategories(categoryId?: string): Promise<Subcategory[]> {
  if (!isSupabaseEnabled()) {
    return getDefaultSubcategories(categoryId);
  }

  let query = supabase!
    .from("subcategories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[Subcategories] Error fetching:", error);
    return getDefaultSubcategories(categoryId);
  }

  return data || [];
}

// Get subcategories by category VALUE (for lookup by category code like "srs-doctor")
export async function getSubcategoriesByCategoryValue(categoryValue: string): Promise<Subcategory[]> {
  if (!isSupabaseEnabled()) {
    return getDefaultSubcategoriesByValue(categoryValue);
  }

  // หา category_id จาก value
  const { data: category, error: catError } = await supabase!
    .from("categories")
    .select("id")
    .eq("value", categoryValue)
    .single();

  if (catError || !category) {
    console.error("[Subcategories] Category not found:", categoryValue);
    return [];
  }

  return getSubcategories(category.id);
}

// Get subcategory by value within a category
export async function getSubcategoryByValue(
  categoryId: string,
  value: string
): Promise<Subcategory | null> {
  if (!isSupabaseEnabled()) {
    const defaults = getDefaultSubcategories(categoryId);
    return defaults.find(s => s.value === value) || null;
  }

  const { data, error } = await supabase!
    .from("subcategories")
    .select("*")
    .eq("category_id", categoryId)
    .eq("value", value)
    .single();

  if (error) {
    console.error("[Subcategories] Error fetching by value:", error);
    return null;
  }

  return data;
}

// Create new subcategory
export async function createSubcategory(
  categoryId: string,
  value: string,
  label: string,
  keywords: string[] = [],
  sortOrder?: number
): Promise<{ success: boolean; subcategory?: Subcategory; error?: string }> {
  if (!isSupabaseEnabled()) {
    return { success: false, error: "Supabase not configured" };
  }

  // Normalize value: lowercase, no spaces, hyphens only
  const normalizedValue = value
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

  if (!normalizedValue) {
    return { success: false, error: "Invalid subcategory value" };
  }

  // Get next sort_order if not provided
  let nextOrder = sortOrder;
  if (nextOrder === undefined) {
    const { data: maxOrder } = await supabase!
      .from("subcategories")
      .select("sort_order")
      .eq("category_id", categoryId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .single();
    nextOrder = (maxOrder?.sort_order || 0) + 1;
  }

  const { data, error } = await supabase!
    .from("subcategories")
    .insert({
      category_id: categoryId,
      value: normalizedValue,
      label,
      keywords,
      sort_order: nextOrder,
    })
    .select()
    .single();

  if (error) {
    console.error("[Subcategories] Error creating:", error);
    if (error.code === "23505") {
      return { success: false, error: "Subcategory value already exists in this category" };
    }
    return { success: false, error: error.message };
  }

  return { success: true, subcategory: data };
}

// Update subcategory
export async function updateSubcategory(
  id: string,
  updates: Partial<Pick<Subcategory, "label" | "keywords" | "sort_order" | "is_active">>
): Promise<{ success: boolean; subcategory?: Subcategory; error?: string }> {
  if (!isSupabaseEnabled()) {
    return { success: false, error: "Supabase not configured" };
  }

  const { data, error } = await supabase!
    .from("subcategories")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[Subcategories] Error updating:", error);
    return { success: false, error: error.message };
  }

  return { success: true, subcategory: data };
}

// Delete subcategory (soft delete)
export async function deleteSubcategory(id: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseEnabled()) {
    return { success: false, error: "Supabase not configured" };
  }

  const { error } = await supabase!
    .from("subcategories")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    console.error("[Subcategories] Error deleting:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Permanently delete subcategory
export async function permanentlyDeleteSubcategory(id: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseEnabled()) {
    return { success: false, error: "Supabase not configured" };
  }

  const { error } = await supabase!
    .from("subcategories")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[Subcategories] Error permanently deleting:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Detect subcategory from query text using keywords (by category VALUE)
export async function detectSubcategoryFromQueryByValue(
  query: string,
  categoryValue: string
): Promise<Subcategory | null> {
  if (!isSupabaseEnabled()) {
    // Fallback to defaults
    const defaults = getDefaultSubcategoriesByValue(categoryValue);
    const normalizedQuery = query.toLowerCase();
    
    for (const sub of defaults) {
      const match = sub.keywords?.some(keyword => 
        normalizedQuery.includes(keyword.toLowerCase())
      );
      if (match) {
        console.log(`[Subcategory] Detected "${sub.value}" from query (fallback)`);
        return sub;
      }
      if (normalizedQuery.includes(sub.label.toLowerCase())) {
        console.log(`[Subcategory] Detected "${sub.value}" from label match (fallback)`);
        return sub;
      }
    }
    return null;
  }

  // หา category_id จาก value
  const { data: category, error: catError } = await supabase!
    .from("categories")
    .select("id")
    .eq("value", categoryValue)
    .single();

  if (catError || !category) {
    console.error("[Subcategories] Category not found:", categoryValue);
    return null;
  }

  // ใช้ function เดิมที่รับ category_id
  return detectSubcategoryFromQuery(query, category.id);
}

// Detect subcategory from query text using keywords (by category ID)
export async function detectSubcategoryFromQuery(
  query: string,
  categoryId: string
): Promise<Subcategory | null> {
  const subcategories = await getSubcategories(categoryId);
  
  const normalizedQuery = query.toLowerCase();
  
  for (const sub of subcategories) {
    // Check keywords
    const match = sub.keywords?.some(keyword => 
      normalizedQuery.includes(keyword.toLowerCase())
    );
    if (match) {
      console.log(`[Subcategory] Detected "${sub.value}" from query: "${query.substring(0, 50)}..."`);
      return sub;
    }
    
    // Also check label
    if (normalizedQuery.includes(sub.label.toLowerCase())) {
      console.log(`[Subcategory] Detected "${sub.value}" from label match`);
      return sub;
    }
  }
  
  return null;
}

// Get default subcategories (fallback when Supabase not available)
function getDefaultSubcategories(categoryId?: string): Subcategory[] {
  const allDefaults: Record<string, Subcategory[]> = {
    "srs-doctor": [
      {
        id: "sub-1",
        category_id: "cat-3",
        value: "dr-sarun",
        label: "ดร.ศรัณย์",
        keywords: ["ศรัณย์", "sarun", "หมอศรัณย์", "ดร.ศรัณย์"],
        sort_order: 1,
        is_active: true,
        created_at: "",
        updated_at: "",
      },
      {
        id: "sub-2",
        category_id: "cat-3",
        value: "dr-wansiri",
        label: "ดร.วรรณสิริ",
        keywords: ["วรรณสิริ", "wansiri", "หมอวรรณสิริ", "ดร.วรรณสิริ"],
        sort_order: 2,
        is_active: true,
        created_at: "",
        updated_at: "",
      },
    ],
    "srs-tec": [
      {
        id: "sub-3",
        category_id: "cat-1",
        value: "sigmoid",
        label: "เทคนิค Sigmoid",
        keywords: ["sigmoid", "ซิกมอยด์"],
        sort_order: 1,
        is_active: true,
        created_at: "",
        updated_at: "",
      },
      {
        id: "sub-4",
        category_id: "cat-1",
        value: "colon",
        label: "เทคนิค Colon",
        keywords: ["colon", "โคลอน"],
        sort_order: 2,
        is_active: true,
        created_at: "",
        updated_at: "",
      },
      {
        id: "sub-5",
        category_id: "cat-1",
        value: "penile",
        label: "Penile Inversion",
        keywords: ["penile", "พีไนล์"],
        sort_order: 3,
        is_active: true,
        created_at: "",
        updated_at: "",
      },
    ],
  };

  if (categoryId && allDefaults[categoryId]) {
    return allDefaults[categoryId];
  }

  return Object.values(allDefaults).flat();
}

function getDefaultSubcategoriesByValue(categoryValue: string): Subcategory[] {
  const valueToId: Record<string, string> = {
    "srs-doctor": "srs-doctor",
    "srs-tec": "srs-tec",
  };
  
  const id = valueToId[categoryValue];
  return id ? getDefaultSubcategories(id) : [];
}

// ============================================
// AI-POWERED SUBCATEGORY DETECTION
// ============================================

/**
 * Detect subcategory using Gemini AI (Multi-language support)
 * Includes role/specialty context for better understanding
 */
export async function detectSubcategoryWithAI(
  query: string,
  categoryValue: string
): Promise<Subcategory[]> {
  if (!ai) {
    console.log("[Subcategory AI] Gemini not available, falling back to keyword matching");
    const result = await detectSubcategoryFromQueryByValue(query, categoryValue);
    return result ? [result] : [];
  }

  try {
    // Get available subcategories for this category
    const subcategories = await getSubcategoriesByCategoryValue(categoryValue);
    
    if (subcategories.length === 0) {
      return [];
    }

    // Special handling for srs-doctor category
    const isDoctorCategory = categoryValue === 'srs-doctor';
    
    // Build prompt with available subcategories
    const subcategoryList = subcategories.map(s => {
      // Add role/specialty context for doctors
      if (isDoctorCategory) {
        const roleInfo = getDoctorRoleInfo(s.value);
        return `- ${s.value}: "${s.label}" (${roleInfo})`;
      }
      return `- ${s.value}: "${s.label}"`;
    }).join("\n");

    console.log(`[Subcategory AI] Analyzing query: "${query.substring(0, 50)}..."`);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analyze this user query and determine which subcategory they are looking for.

Available subcategories for category "${categoryValue}":
${subcategoryList}

User query: "${query}"

Instructions:
1. The query may be in ANY language (Thai, English, Korean, Chinese, Japanese, etc.)
2. Analyze the context to understand what specific subcategory the user wants
3. IMPORTANT: If user asks for "วิสัญญีแพทย์", "หมอดมยา", "anesthesiologist", or "麻醉医生":
   - Return "MULTI:dr-gun,dr-krairerk" (both anesthesiologists)
4. If user asks for a specific doctor by name, return that doctor's value
5. Return ONLY the subcategory value (e.g., "dr-sarun"), "MULTI:val1,val2" for multiple, or "none" if unclear

Examples:
- "ขอดูรูปหมอศรัณย์" (Thai) → dr-sarun
- "Show me Dr. Gun photos" (English) → dr-gun  
- "หมอดมยา" (Thai) → MULTI:dr-gun,dr-krairerk
- "วิสัญญีแพทย์" (Thai) → MULTI:dr-gun,dr-krairerk
- "anesthesiologist" (English) → MULTI:dr-gun,dr-krairerk
- "사진 보여주세요 Dr.Wansiri" (Korean) → dr-wansiri
- "sigmoid technique images" (English) → sigmoid
- "ขอดูรูปหมอ" (general, no specific doctor) → none

Respond with ONLY the subcategory value, "MULTI:val1,val2", or "none":`,
    });

    const result = response.text?.trim().toLowerCase() || "none";
    
    // Handle multiple results
    if (result.startsWith("multi:")) {
      console.log(`[Subcategory AI] Multiple doctors detected: ${result}`);
      const values = result.replace("multi:", "").split(",");
      const matchedSubcategories = subcategories.filter(s => values.includes(s.value));
      console.log(`[Subcategory AI] Returning ${matchedSubcategories.length} matches: ${matchedSubcategories.map(s => s.value).join(", ")}`);
      return matchedSubcategories;
    }
    
    if (result === "none" || result === "null") {
      console.log(`[Subcategory AI] No specific subcategory detected`);
      return [];
    }

    // Find matching subcategory
    const matched = subcategories.find(s => s.value === result);
    
    if (matched) {
      console.log(`[Subcategory AI] Detected: ${matched.value} (${matched.label})`);
      return [matched];
    }

    console.log(`[Subcategory AI] AI returned unknown value: ${result}`);
    return [];

  } catch (error) {
    console.error("[Subcategory AI] Error:", error);
    // Fallback to keyword matching
    const result = await detectSubcategoryFromQueryByValue(query, categoryValue);
    return result ? [result] : [];
  }
}

/**
 * Get role/specialty information for doctors
 * This helps AI understand medical specialties
 */
function getDoctorRoleInfo(subcategoryValue: string): string {
  const roles: Record<string, string> = {
    'dr-gun': 'วิสัญญีแพทย์, หมอดมยา, anesthesiologist',
    'dr-krairerk': 'วิสัญญีแพทย์, หมอดมยา, anesthesiologist',
  };
  return roles[subcategoryValue] || 'แพทย์';
}

