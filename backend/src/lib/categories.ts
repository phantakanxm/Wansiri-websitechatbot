import { supabase, isSupabaseEnabled } from "./supabase";

export interface Category {
  id: string;
  value: string;
  label: string;
  icon: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// Get all categories sorted by sort_order
export async function getCategories(): Promise<Category[]> {
  if (!isSupabaseEnabled()) {
    // Fallback to hardcoded if Supabase not available
    return getDefaultCategories();
  }

  const { data, error } = await supabase!
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[Categories] Error fetching:", error);
    return getDefaultCategories();
  }

  return data || [];
}

// Get category by value
export async function getCategoryByValue(value: string): Promise<Category | null> {
  if (!isSupabaseEnabled()) {
    return getDefaultCategories().find(c => c.value === value) || null;
  }

  const { data, error } = await supabase!
    .from("categories")
    .select("*")
    .eq("value", value)
    .single();

  if (error) {
    console.error("[Categories] Error fetching by value:", error);
    return null;
  }

  return data;
}

// Create new category
export async function createCategory(
  value: string,
  label: string,
  icon: string = "📁"
): Promise<{ success: boolean; category?: Category; error?: string }> {
  if (!isSupabaseEnabled()) {
    return { success: false, error: "Supabase not configured" };
  }

  // Normalize value: lowercase, no spaces, hyphens only
  const normalizedValue = value
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

  if (!normalizedValue) {
    return { success: false, error: "Invalid category value" };
  }

  // Get next sort_order
  const { data: maxOrder } = await supabase!
    .from("categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const nextOrder = (maxOrder?.sort_order || 0) + 1;

  const { data, error } = await supabase!
    .from("categories")
    .insert({
      value: normalizedValue,
      label,
      icon,
      sort_order: nextOrder,
    })
    .select()
    .single();

  if (error) {
    console.error("[Categories] Error creating:", error);
    if (error.code === "23505") {
      return { success: false, error: "Category value already exists" };
    }
    return { success: false, error: error.message };
  }

  return { success: true, category: data };
}

// Update category
export async function updateCategory(
  id: string,
  updates: Partial<Pick<Category, "label" | "icon" | "sort_order">>
): Promise<{ success: boolean; category?: Category; error?: string }> {
  if (!isSupabaseEnabled()) {
    return { success: false, error: "Supabase not configured" };
  }

  const { data, error } = await supabase!
    .from("categories")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[Categories] Error updating:", error);
    return { success: false, error: error.message };
  }

  return { success: true, category: data };
}

// Delete category
export async function deleteCategory(id: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseEnabled()) {
    return { success: false, error: "Supabase not configured" };
  }

  const { error } = await supabase!
    .from("categories")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[Categories] Error deleting:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Default categories (fallback)
function getDefaultCategories(): Category[] {
  return [
    { id: "1", value: "srs-tec", label: "เทคนิคการผ่าตัด (Technique)", icon: "🩺", sort_order: 1, created_at: "", updated_at: "" },
    { id: "2", value: "srs-review", label: "รีวิว/ผลลัพธ์ (Review)", icon: "⭐", sort_order: 2, created_at: "", updated_at: "" },
    { id: "3", value: "srs-doctor", label: "ข้อมูลแพทย์ (Doctor)", icon: "👨‍⚕️", sort_order: 3, created_at: "", updated_at: "" },
    { id: "4", value: "srs-package", label: "แพ็คเกจ/ราคา (Package)", icon: "💰", sort_order: 4, created_at: "", updated_at: "" },
    { id: "5", value: "srs-facility", label: "สถานที่/ห้องผ่าตัด (Facility)", icon: "🏥", sort_order: 5, created_at: "", updated_at: "" },
    { id: "6", value: "general", label: "ทั่วไป (General)", icon: "📁", sort_order: 6, created_at: "", updated_at: "" },
  ];
}
