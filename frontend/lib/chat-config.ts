/**
 * Chat Configuration Types and Utilities
 * 
 * This file contains all the configuration types, interfaces, and constants
 * for the chatbot UI components.
 */

// ========================================
// Configuration Types
// ========================================

export interface ChatConfig {
  /** API endpoint for chat requests */
  apiEndpoint: string;
  /** Model name to use */
  model?: string;
  /** Temperature for response generation (0-2) */
  temperature?: number;
  /** Maximum tokens per response */
  maxTokens?: number;
  /** Enable streaming responses */
  streaming?: boolean;
  /** Additional headers for API requests */
  headers?: Record<string, string>;
}

// ========================================
// Message Types
// ========================================

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  /** Unique message ID */
  id: string;
  /** Role of the message sender */
  role: MessageRole;
  /** Message content */
  content: string;
  /** Timestamp when message was created */
  timestamp: Date;
  /** Whether message is currently streaming */
  isStreaming?: boolean;
  /** Error state */
  error?: boolean;
}

// ========================================
// Default Configuration
// ========================================

export const defaultConfig: ChatConfig = {
  apiEndpoint: '/api/chat',
  streaming: true,
  temperature: 0.7,
};

// ========================================
// Language Support
// ========================================

export type SupportedLanguage = 'th' | 'en' | 'ko' | 'zh';

export interface LanguageConfig {
  name: string;
  flag: string;
  suggestions: string[];
}

export const LANGUAGE_CONFIG: Record<SupportedLanguage, LanguageConfig> = {
  th: {
    name: 'Thai',
    flag: '🇹🇭',
    suggestions: [
      'การผ่าตัดแปลงเพศ (SRS) คืออะไร?',
      'มีเทคนิคการผ่าตัดแบบไหนบ้าง?',
      'ระยะเวลาพักฟื้นหลังผ่าตัดนานแค่ไหน?',
      'มีข้อกำหนดอะไรบ้างก่อนเข้ารับการผ่าตัด SRS?',
    ],
  },
  en: {
    name: 'English',
    flag: '🇬🇧',
    suggestions: [
      'What is Sex Reassignment Surgery (SRS)?',
      'What surgical techniques are available?',
      'How long is the recovery period after surgery?',
      'What are the requirements before undergoing SRS?',
    ],
  },
  ko: {
    name: '한국어',
    flag: '🇰🇷',
    suggestions: [
      '성전환 수술(SRS)이란 무엇인가요?',
      '어떤 수술 기법이 있나요?',
      '수술 후 회복 기간은 얼마나 걸리나요?',
      'SRS 수술 전에 필요한 조건은 무엇인가요?',
    ],
  },
  zh: {
    name: '中文',
    flag: '🇨🇳',
    suggestions: [
      '什么是性别重置手术（SRS）？',
      '有哪些手术技术可供选择？',
      '术后恢复期有多长？',
      '接受SRS手术前需要什么条件？',
    ],
  },
};

// Thai suggestions for empty state
export const thaiSuggestions = LANGUAGE_CONFIG.th.suggestions;

// English suggestions
export const englishSuggestions = LANGUAGE_CONFIG.en.suggestions;

// Korean suggestions
export const koreanSuggestions = LANGUAGE_CONFIG.ko.suggestions;

// Chinese suggestions
export const chineseSuggestions = LANGUAGE_CONFIG.zh.suggestions;

// Supported languages array
export const SUPPORTED_LANGUAGES = [
  { code: 'th', name: 'ไทย', flag: '🇹🇭' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
] as const;

// ========================================
// Utility Functions
// ========================================

/**
 * Create a new chat message
 */
export function createMessage(
  content: string,
  role: MessageRole = 'user',
  overrides?: Partial<ChatMessage>
): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    timestamp: new Date(),
    ...overrides,
  };
}

/**
 * Check if a message is from the user
 */
export function isUserMessage(message: ChatMessage): boolean {
  return message.role === 'user';
}

/**
 * Check if a message is from the assistant
 */
export function isAssistantMessage(message: ChatMessage): boolean {
  return message.role === 'assistant';
}

/**
 * Format message timestamp
 */
export function formatMessageTime(date: Date, locale = 'th-TH'): string {
  return date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Truncate message content for preview
 */
export function truncateMessage(content: string, maxLength = 100): string {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength).trim() + '...';
}

// ========================================
// Session Management
// ========================================

const STORAGE_KEYS = {
  sessionId: 'chatSessionId',
  messages: 'chatMessages',
  languageMode: 'chatLanguageMode',
  selectedLanguage: 'chatSelectedLanguage',
} as const;

export const chatStorage = {
  getSessionId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEYS.sessionId);
  },

  setSessionId(sessionId: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.sessionId, sessionId);
  },

  clearSession(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEYS.sessionId);
    localStorage.removeItem(STORAGE_KEYS.messages);
  },

  getMessages(): ChatMessage[] | null {
    if (typeof window === 'undefined') return null;
    const saved = localStorage.getItem(STORAGE_KEYS.messages);
    if (!saved) return null;
    try {
      const parsed = JSON.parse(saved);
      return parsed.map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      }));
    } catch {
      return null;
    }
  },

  setMessages(messages: ChatMessage[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.messages, JSON.stringify(messages));
  },

  getLanguageMode(): 'auto' | 'manual' {
    if (typeof window === 'undefined') return 'auto';
    const mode = localStorage.getItem(STORAGE_KEYS.languageMode);
    return mode === 'manual' ? 'manual' : 'auto';
  },

  setLanguageMode(mode: 'auto' | 'manual'): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.languageMode, mode);
  },

  getSelectedLanguage(): SupportedLanguage {
    if (typeof window === 'undefined') return 'en';
    const lang = localStorage.getItem(STORAGE_KEYS.selectedLanguage) as SupportedLanguage;
    return LANGUAGE_CONFIG[lang] ? lang : 'en';
  },

  setSelectedLanguage(language: SupportedLanguage): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.selectedLanguage, language);
  },
};
