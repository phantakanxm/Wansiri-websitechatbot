import { ai } from "./gemini";
import { withRetry, RETRY_CONFIGS } from "./retry";
import { translateWithCache, translationCache } from "./translationCache";

/**
 * Language detection and translation utilities
 * Supports: Thai (th), English (en), Korean (ko), Chinese (zh)
 * Features: Retry logic, Translation caching, Parallel processing
 */

export type SupportedLanguage = "th" | "en" | "ko" | "zh";

// Language names for display
export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  th: "Thai",
  en: "English",
  ko: "한국어",
  zh: "中文",
};

// Language flags
export const LANGUAGE_FLAGS: Record<SupportedLanguage, string> = {
  th: "🇹🇭",
  en: "🇬🇧",
  ko: "🇰🇷",
  zh: "🇨🇳",
};

/**
 * Detect language from text using Gemini (with retry)
 */
export async function detectLanguage(text: string): Promise<SupportedLanguage> {
  return withRetry(async () => {
    try {
      // Quick character-based detection for short texts
      if (text.length < 10) {
        if (/[ก-๙]/.test(text)) return "th";
        if (/[가-힣]/.test(text)) return "ko";
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash-lite",
        contents: `Detect the language of this text and return only the ISO 639-1 code (th, en, ko, or zh):\n\n"${text.substring(0, 200)}"\n\nReturn only: th, en, ko, or zh`,
      });

      const lang = response.text?.trim().toLowerCase() || "en";
      
      // Validate
      if (["th", "en", "ko", "zh"].includes(lang)) {
        return lang as SupportedLanguage;
      }
      
      throw new Error(`Invalid language code: ${lang}`);
    } catch (error) {
      console.error("[Language] Detection failed:", error);
      // Fallback to character-based detection
      if (/[\u4e00-\u9fff]/.test(text)) return "zh";
      if (/[ก-๙]/.test(text)) return "th";
      if (/[가-힣]/.test(text)) return "ko";
      return "en";
    }
  }, RETRY_CONFIGS.GEMINI_API);
}

/**
 * Internal translation function (actual API call)
 */
async function _translateText(
  text: string,
  from: SupportedLanguage,
  to: SupportedLanguage
): Promise<string> {
  if (from === to) return text;

  const langNames: Record<SupportedLanguage, string> = {
    th: "Thai",
    en: "English",
    ko: "Korean",
    zh: "Chinese",
  };

  return withRetry(async () => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash-lite",
        contents: `Translate the following text from ${langNames[from]} to ${langNames[to]}. 
Keep the meaning accurate and natural. Return only the translated text without quotes or explanations.

Text: "${text}"`,
      });

      return response.text?.trim() || text;
    } catch (error) {
      console.error("[Language] Translation failed:", error);
      return text; // Fallback to original
    }
  }, RETRY_CONFIGS.TRANSLATION);
}

/**
 * Translate text with caching and retry
 */
export async function translateText(
  text: string,
  from: SupportedLanguage,
  to: SupportedLanguage
): Promise<string> {
  return translateWithCache(text, from, to, _translateText);
}

/**
 * Translate multiple texts in parallel
 */
export async function translateTexts(
  texts: string[],
  from: SupportedLanguage,
  to: SupportedLanguage
): Promise<string[]> {
  if (from === to) return texts;

  // Process in parallel with Promise.all
  const translations = await Promise.all(
    texts.map((text) => translateText(text, from, to))
  );

  return translations;
}

/**
 * Get cache statistics
 */
export function getTranslationCacheStats() {
  return translationCache.getStats();
}

/**
 * Clear translation cache
 */
export function clearTranslationCache() {
  translationCache.clear();
}

/**
 * Get greeting message for language
 */
export function getGreeting(lang: SupportedLanguage): string {
  const greetings: Record<SupportedLanguage, string> = {
    th: "สวัสดีค่ะ ยินดีต้อนรับสู่โรงพยาบาลวรรณสิริค่ะ",
    en: "Hello! Welcome to Wansiri Hospital. How can I help you today?",
    ko: "안녕하세요! 완시리 병원에 오신 것을 환영합니다. 무엇을 도와드릴까요?",
    zh: "您好！欢迎来到Wansiri医院。我能为您做些什么？",
  };
  return greetings[lang];
}

/**
 * Get language not supported message
 */
export function getLanguageNotSupportedMessage(requestedLang: string): string {
  return `I apologize, but I currently support only 4 languages: Thai (🇹🇭), English (🇬🇧), Korean (🇰🇷), and Chinese (🇨🇳). 

ขออภัยค่ะ ตอนนี้รองรับเฉพาะ 4 ภาษา: ไทย 🇹🇭, อังกฤษ 🇬🇧, เกาหลี 🇰🇷 และจีน 🇨🇳 ค่ะ

죄송합니다. 현재 4개 언어만 지원합니다: 태국어 🇹🇭, 영어 🇬🇧, 한국어 🇰🇷, 중국어 🇨🇳

抱歉，我目前只支持4种语言：泰语🇹🇭、英语🇬🇧、韩语🇰🇷和中文🇨🇳。`;
}
