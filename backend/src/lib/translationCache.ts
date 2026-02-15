/**
 * Translation cache for improved performance
 * Stores frequently translated texts to avoid repeated API calls
 * Now with better normalization and fuzzy matching
 */

import { SupportedLanguage } from "./language";

interface CacheEntry {
  translated: string;
  timestamp: number;
  hits: number;
  normalizedText: string;
}

class TranslationCache {
  private cache: Map<string, CacheEntry>;
  private maxSize: number;
  private ttl: number; // Time to live in milliseconds

  constructor(maxSize = 1000, ttlMinutes = 120) { // Increased to 120 minutes
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttlMinutes * 60 * 1000;
  }

  /**
   * Normalize text for better cache matching
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .substring(0, 300);
  }

  /**
   * Generate cache key from text and languages
   */
  private getKey(text: string, from: SupportedLanguage, to: SupportedLanguage): string {
    return `${from}:${to}:${this.normalizeText(text)}`;
  }

  /**
   * Get cached translation
   */
  get(text: string, from: SupportedLanguage, to: SupportedLanguage): string | null {
    const key = this.getKey(text, from, to);
    const normalizedText = this.normalizeText(text);
    
    // Try exact match first
    let entry = this.cache.get(key);
    
    // If no exact match, try to find similar entries
    if (!entry) {
      for (const [cacheKey, cacheEntry] of this.cache.entries()) {
        if (cacheKey.startsWith(`${from}:${to}:`) && 
            cacheEntry.normalizedText === normalizedText) {
          entry = cacheEntry;
          break;
        }
      }
    }

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      console.log(`[TranslationCache] Entry expired`);
      return null;
    }

    // Update hit count
    entry.hits++;
    console.log(`[TranslationCache] ✅ HIT for "${text.substring(0, 30)}..." (${entry.hits} hits)`);
    return entry.translated;
  }

  /**
   * Store translation in cache
   */
  set(text: string, from: SupportedLanguage, to: SupportedLanguage, translated: string): void {
    // Don't cache very long texts (over 500 chars)
    if (text.length > 500) {
      return;
    }

    // Don't cache if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    const key = this.getKey(text, from, to);
    this.cache.set(key, {
      translated,
      timestamp: Date.now(),
      hits: 1,
      normalizedText: this.normalizeText(text),
    });

    console.log(`[TranslationCache] 💾 STORED "${text.substring(0, 30)}..." (${this.cache.size}/${this.maxSize})`);
  }

  /**
   * Evict least recently used entries
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
      console.log(`[TranslationCache] Evicted LRU entry`);
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    console.log("[TranslationCache] Cleared all entries");
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number; hitRate: number } {
    let totalHits = 0;
    for (const entry of this.cache.values()) {
      totalHits += entry.hits;
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.cache.size > 0 ? totalHits / this.cache.size : 0,
    };
  }
}

// Global cache instance with longer TTL (120 minutes)
export const translationCache = new TranslationCache(1000, 120);

/**
 * Wrap translation function with caching
 */
export async function translateWithCache(
  text: string,
  from: SupportedLanguage,
  to: SupportedLanguage,
  translateFn: (text: string, from: SupportedLanguage, to: SupportedLanguage) => Promise<string>
): Promise<string> {
  // Check cache first
  const cached = translationCache.get(text, from, to);
  if (cached) {
    return cached;
  }

  // If same language, return as is
  if (from === to) {
    return text;
  }

  // Perform translation
  const translated = await translateFn(text, from, to);

  // Store in cache
  translationCache.set(text, from, to, translated);

  return translated;
}
