/**
 * File Search cache for improved performance
 * Stores search results to avoid repeated Gemini API calls for same queries
 * Now with Supabase persistent cache support
 * 
 * CACHE MODE: EXACT MATCH ONLY (fuzzy matching disabled)
 * - Only returns cached results if query matches exactly (after normalization)
 * - More natural user experience, slightly slower than fuzzy matching
 */

import { ai, FILE_SEARCH_STORE_NAME, CHAT_MODEL } from "./gemini";
import { withRetry, RETRY_CONFIGS } from "./retry";
import { supabase, isSupabaseEnabled } from "./supabase";

interface FileSearchCacheEntry {
  response: string;
  chunks: any[];
  timestamp: number;
  hits: number;
  normalizedQuery: string;
}

class FileSearchCache {
  private cache: Map<string, FileSearchCacheEntry>;
  private maxSize: number;
  private ttl: number; // Time to live in milliseconds

  constructor(maxSize = 500, ttlMinutes = 60) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttlMinutes * 60 * 1000;
  }

  /**
   * Normalize query for consistent cache keys
   * - Lowercase
   * - Remove extra whitespace
   * - Remove punctuation
   * - Normalize Thai characters
   */
  private normalizeQuery(query: string): string {
    return query
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ') // Collapse multiple spaces to single space
      .replace(/[.,!?;:'"()\[\]{}]/g, '') // Remove punctuation
      .replace(/[\u0E48\u0E49\u0E4A\u0E4B]/g, '') // Remove Thai tone marks
      .substring(0, 200); // Limit length
  }

  /**
   * Generate cache key from search query (normalized)
   */
  private getKey(query: string): string {
    return this.normalizeQuery(query);
  }

  /**
   * Get cached search result (EXACT MATCH ONLY)
   */
  async get(query: string): Promise<FileSearchCacheEntry | null> {
    const normalizedQuery = this.normalizeQuery(query);
    const exactKey = this.getKey(query);
    
    console.log(`[FileSearchCache] Looking for: "${query.substring(0, 40)}..."`);
    console.log(`[FileSearchCache] Normalized: "${normalizedQuery.substring(0, 40)}..."`);

    // 1. Check exact match in memory cache first (fastest)
    const memoryEntry = this.cache.get(exactKey);
    if (memoryEntry) {
      if (Date.now() - memoryEntry.timestamp > this.ttl) {
        this.cache.delete(exactKey);
        console.log(`[FileSearchCache] ❌ Memory entry expired`);
      } else {
        memoryEntry.hits++;
        console.log(`[FileSearchCache] ✅ EXACT MEMORY HIT (${memoryEntry.hits} hits)`);
        return memoryEntry;
      }
    }

    // 2. Check Supabase cache (persistent) - EXACT MATCH ONLY
    if (isSupabaseEnabled()) {
      try {
        const { data, error } = await supabase!
          .from("cache")
          .select("cache_key, value, expires_at, access_count, normalized_query")
          .eq("cache_key", `file_search:${exactKey}`)
          .gt("expires_at", new Date().toISOString())
          .single();

        if (error && error.code !== "PGRST116") {
          console.error("[FileSearchCache] Supabase error:", error);
        }

        if (data) {
          return await this.processSupabaseHit(data, exactKey, query);
        }
      } catch (error) {
        console.error("[FileSearchCache] Error reading from Supabase:", error);
      }
    }

    console.log(`[FileSearchCache] ❌ CACHE MISS - will call API`);
    return null;
  }

  /**
   * Process a Supabase cache hit
   */
  private async processSupabaseHit(
    data: any, 
    key: string, 
    originalQuery: string
  ): Promise<FileSearchCacheEntry> {
    const entry: FileSearchCacheEntry = {
      response: data.value.response,
      chunks: data.value.chunks,
      timestamp: new Date(data.expires_at).getTime() - this.ttl,
      hits: (data.access_count || 0) + 1,
      normalizedQuery: this.normalizeQuery(originalQuery),
    };

    // Update access count in Supabase
    await supabase!
      .from("cache")
      .update({ 
        access_count: entry.hits,
        last_accessed_at: new Date().toISOString()
      })
      .eq("cache_key", data.cache_key);

    // Also store in memory for faster access next time
    this.cache.set(key, entry);

    console.log(`[FileSearchCache] ✅ EXACT SUPABASE HIT (${entry.hits} hits)`);
    
    return entry;
  }

  /**
   * Store search result in cache (both memory and Supabase)
   */
  async set(query: string, response: string, chunks: any[]): Promise<void> {
    // Don't cache empty or error responses
    if (!response || response.length < 10) {
      console.log(`[FileSearchCache] ❌ Not caching - response too short`);
      return;
    }

    const normalizedQuery = this.normalizeQuery(query);
    const key = this.getKey(query);

    // 1. Store in memory
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    const entry: FileSearchCacheEntry = {
      response,
      chunks,
      timestamp: Date.now(),
      hits: 1,
      normalizedQuery,
    };

    this.cache.set(key, entry);
    console.log(`[FileSearchCache] 💾 MEMORY STORED (${this.cache.size}/${this.maxSize} entries)`);

    // 2. Store in Supabase (persistent)
    if (isSupabaseEnabled()) {
      try {
        const expiresAt = new Date(Date.now() + this.ttl);
        
        const { error } = await supabase!
          .from("cache")
          .upsert({
            cache_key: `file_search:${key}`,
            cache_type: "file_search",
            value: { response, chunks },
            normalized_query: normalizedQuery,
            expires_at: expiresAt.toISOString(),
            access_count: 1,
            last_accessed_at: new Date().toISOString(),
          }, {
            onConflict: "cache_key"
          });

        if (error) {
          console.error("[FileSearchCache] Error saving to Supabase:", error);
        } else {
          console.log(`[FileSearchCache] 💾 SUPABASE STORED`);
        }
      } catch (error) {
        console.error("[FileSearchCache] Error saving to Supabase:", error);
      }
    }
  }

  /**
   * Evict least recently used entries from memory
   */
  private evictLRU(): void {
    let minHits = Infinity;
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.hits < minHits || (entry.hits === minHits && entry.timestamp < oldestTime)) {
        minHits = entry.hits;
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log(`[FileSearchCache] Evicted LRU entry`);
    }
  }

  /**
   * Clear all cache (memory only, keep Supabase)
   */
  clear(): void {
    this.cache.clear();
    console.log("[FileSearchCache] Cleared memory cache");
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number; hitRate: number; totalHits: number } {
    let totalHits = 0;
    for (const entry of this.cache.values()) {
      totalHits += entry.hits;
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.cache.size > 0 ? totalHits / this.cache.size : 0,
      totalHits,
    };
  }

  /**
   * Get Supabase cache stats (async)
   */
  async getSupabaseStats(): Promise<{ count: number; totalAccess: number }> {
    if (!isSupabaseEnabled()) {
      return { count: 0, totalAccess: 0 };
    }

    try {
      const { count, error } = await supabase!
        .from("cache")
        .select("*", { count: "exact", head: true })
        .eq("cache_type", "file_search");

      if (error) throw error;

      // Get total access count
      const { data } = await supabase!
        .from("cache")
        .select("access_count")
        .eq("cache_type", "file_search");

      const totalAccess = data?.reduce((sum, item) => sum + (item.access_count || 0), 0) || 0;

      return { count: count || 0, totalAccess };
    } catch (error) {
      console.error("[FileSearchCache] Error getting Supabase stats:", error);
      return { count: 0, totalAccess: 0 };
    }
  }
}

// Global cache instance with longer TTL (60 minutes)
export const fileSearchCache = new FileSearchCache(500, 60);

/**
 * System instruction for File Search
 */
function getSystemInstruction(): string {
  return `คุณคือแชตบอทผู้ช่วยของ "โรงพยาบาลวรรณสิริ"
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
9. **จำข้อมูลจากการสนทนาก่อนหน้าได้** - ถ้าผู้ใช้บอกชื่อ ประเทศ หรือข้อมูลส่วนตัวไปแล้ว ให้จำและอ้างอิงได้`;
}

/**
 * Perform file search with caching and logging
 */
export async function performFileSearchWithCache(
  searchQuery: string,
  contents: any[]
): Promise<{ response: string; chunks: any[]; fromCache: boolean }> {
  const searchStartTime = Date.now();
  
  // Check cache first (now with fuzzy matching)
  const cached = await fileSearchCache.get(searchQuery);
  if (cached) {
    console.log(`[FileSearch] ⚡ CACHE HIT - Response time: ${Date.now() - searchStartTime}ms`);
    
    // Log cache hit to file_search_logs
    if (isSupabaseEnabled()) {
      try {
        await supabase!.from("file_search_logs").insert({
          query: searchQuery,
          normalized_query: searchQuery.toLowerCase().trim().replace(/\s+/g, ' '),
          documents_found: cached.chunks.length,
          document_ids: cached.chunks.map((c: any) => c.retrievedContext?.documentName || "unknown"),
          search_time_ms: Date.now() - searchStartTime,
          cache_used: true,
        });
        console.log(`[FileSearch] 📝 Logged CACHE HIT to Supabase`);
      } catch (error) {
        console.error("[FileSearch] Error logging cache hit to Supabase:", error);
      }
    }
    
    return {
      response: cached.response,
      chunks: cached.chunks,
      fromCache: true,
    };
  }

  // Perform actual search
  console.log(`[FileSearch] 🌐 Calling Gemini API...`);
  const systemInstruction = getSystemInstruction();
  
  let response = await withRetry(async () => {
    return await ai.models.generateContent({
      model: CHAT_MODEL,
      contents: contents,
      config: {
        systemInstruction,
        maxOutputTokens: 8192,
        tools: [
          {
            fileSearch: {
              fileSearchStoreNames: [FILE_SEARCH_STORE_NAME],
            },
          },
        ],
      },
    });
  }, RETRY_CONFIGS.FILE_SEARCH);

  // Check if file search was used
  let responseAny = response as any;
  let candidates = responseAny.candidates;
  let metadata = candidates?.[0]?.groundingMetadata;
  let chunks = metadata?.groundingChunks || [];

  // Retry if no file search
  if (chunks.length === 0) {
    console.log("[FileSearch] ⚠️ Not used, retrying...");
    
    const retryResponse = await withRetry(async () => {
      return await ai.models.generateContent({
        model: CHAT_MODEL,
        contents: `ค้นหาข้อมูลจากเอกสาร: ${searchQuery}`,
        config: {
          systemInstruction: systemInstruction + "\n\nต้องใช้ file_search เท่านั้น",
          maxOutputTokens: 8192,
          tools: [
            {
              fileSearch: {
                fileSearchStoreNames: [FILE_SEARCH_STORE_NAME],
              },
            },
          ],
        },
      });
    }, RETRY_CONFIGS.FILE_SEARCH);

    responseAny = retryResponse as any;
    candidates = responseAny.candidates;
    metadata = candidates?.[0]?.groundingMetadata;
    chunks = metadata?.groundingChunks || [];

    if (chunks.length > 0) {
      response = retryResponse;
    }
  }

  const thaiResponse = response.text || "";
  const searchTimeMs = Date.now() - searchStartTime;
  
  console.log(`[FileSearch] DEBUG - Raw Gemini response:`);
  console.log(`[FileSearch] DEBUG - Length:`, thaiResponse?.length || 0);
  console.log(`[FileSearch] DEBUG - Text:`, thaiResponse);
  console.log(`[FileSearch] DEBUG - Last 50 chars:`, thaiResponse?.slice(-50));

  // Store in cache
  await fileSearchCache.set(searchQuery, thaiResponse, chunks);

  // Log to file_search_logs in Supabase
  if (isSupabaseEnabled()) {
    try {
      await supabase!.from("file_search_logs").insert({
        query: searchQuery,
        normalized_query: searchQuery.toLowerCase().trim().replace(/\s+/g, ' '),
        documents_found: chunks.length,
        document_ids: chunks.map((c: any) => c.retrievedContext?.documentName || "unknown"),
        search_time_ms: searchTimeMs,
        cache_used: false,
      });
      console.log(`[FileSearch] 📝 Logged to Supabase (${searchTimeMs}ms)`);
    } catch (error) {
      console.error("[FileSearch] Error logging to Supabase:", error);
    }
  }

  console.log(`[FileSearch] ✅ API Response time: ${searchTimeMs}ms`);

  return {
    response: thaiResponse,
    chunks,
    fromCache: false,
  };
}

/**
 * Get file search cache statistics (combined memory + Supabase)
 */
export async function getFileSearchCacheStats() {
  const memoryStats = fileSearchCache.getStats();
  const supabaseStats = await fileSearchCache.getSupabaseStats();

  return {
    memory: memoryStats,
    supabase: supabaseStats,
    total: {
      entries: memoryStats.size + supabaseStats.count,
      totalHits: memoryStats.totalHits + supabaseStats.totalAccess,
    }
  };
}

/**
 * Clear file search cache (memory only)
 */
export function clearFileSearchCache() {
  fileSearchCache.clear();
}
