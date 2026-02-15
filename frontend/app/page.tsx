'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Moon, Sun, RefreshCw, Globe, ChevronDown, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { ChatContainer } from '@/components/chat/chat-container';
import { ChatInput } from '@/components/chat/chat-input';
import type { ChatMessage } from '@/lib/chat-config';
import { thaiSuggestions, englishSuggestions, koreanSuggestions, chineseSuggestions } from '@/lib/chat-config';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type SupportedLanguage = 'th' | 'en' | 'ko' | 'zh';
type LanguageMode = 'auto' | 'manual';

const LANGUAGE_CONFIG: Record<SupportedLanguage, { name: string; flag: string; suggestions: string[] }> = {
  th: { name: 'Thai', flag: '🇹🇭', suggestions: thaiSuggestions },
  en: { name: 'English', flag: '🇬🇧', suggestions: englishSuggestions },
  ko: { name: '한국어', flag: '🇰🇷', suggestions: koreanSuggestions },
  zh: { name: '中文', flag: '🇨🇳', suggestions: chineseSuggestions },
};

// Theme toggle component
function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="h-6 w-6 max-[390px]:h-6 max-[390px]:w-6 sm:h-8 sm:w-8 md:h-9 md:w-9"
    >
      <Sun className="h-3 w-3 max-[390px]:h-3 max-[390px]:w-3 sm:h-4 sm:w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-3 w-3 max-[390px]:h-3 max-[390px]:w-3 sm:h-4 sm:w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messageCount, setMessageCount] = useState(0);
  
  // Smart Hybrid Language State
  const [languageMode, setLanguageMode] = useState<LanguageMode>('auto');
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('en');
  const [detectedLanguage, setDetectedLanguage] = useState<SupportedLanguage | null>(null);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [showLangBanner, setShowLangBanner] = useState(true);
  const [chatMode, setChatMode] = useState<string>(''); // Current onboarding mode
  const welcomeTriggered = useRef(false); // Prevent duplicate welcome messages

  // Load session from localStorage and fetch history from Supabase
  useEffect(() => {
    const savedSession = localStorage.getItem('chatSessionId');
    const savedMode = localStorage.getItem('chatLanguageMode') as LanguageMode;
    const savedSelectedLang = localStorage.getItem('chatSelectedLanguage') as SupportedLanguage;

    // Load language preferences
    if (savedMode && (savedMode === 'auto' || savedMode === 'manual')) {
      setLanguageMode(savedMode);
    }

    if (savedSelectedLang && LANGUAGE_CONFIG[savedSelectedLang]) {
      setSelectedLanguage(savedSelectedLang);
    }

    // Load session and fetch history from Supabase
    if (savedSession) {
      setSessionId(savedSession);
      // Fetch chat history from Supabase
      fetchChatHistory(savedSession);
    } else {
      // New session - trigger onboarding by sending welcome message
      if (!welcomeTriggered.current) {
        welcomeTriggered.current = true;
        triggerWelcomeMessage();
      }
    }
  }, []);

  // Fetch chat history from Supabase
  const fetchChatHistory = useCallback(async (sid: string) => {
    try {
      const response = await fetch(`${API_URL}/api/sessions/${sid}/history`);
      if (!response.ok) {
        console.log('No history found for session:', sid);
        return;
      }
      const data = await response.json();
      if (data.messages && Array.isArray(data.messages)) {
        const formattedMessages = data.messages.map((m: any) => ({
          id: m.id || crypto.randomUUID(),
          role: m.role === 'assistant' || m.role === 'model' ? 'assistant' : 'user',
          content: m.content,
          timestamp: new Date(m.timestamp || m.created_at),
        }));
        setMessages(formattedMessages);
        setMessageCount(formattedMessages.length);
        console.log('📥 Loaded', formattedMessages.length, 'messages from Supabase');
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  }, []);

  // Helper function to handle streaming response
  const handleStreamingResponse = useCallback(async (
    response: Response,
    assistantMessageId: string,
    onComplete?: (data: { sessionId?: string; detectedLanguage?: SupportedLanguage; mode?: string }) => void
  ) => {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let accumulatedContent = '';
    let metadata: { sessionId?: string; detectedLanguage?: SupportedLanguage; mode?: string } = {};

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6); // Remove 'data: ' prefix
            
            if (data === '[DONE]') {
              // Stream complete
              break;
            }

            try {
              const parsed = JSON.parse(data);
              
              // Handle different message types from backend
              switch (parsed.type) {
                case 'session':
                  // Initial session info
                  if (parsed.sessionId) metadata.sessionId = parsed.sessionId;
                  break;
                  
                case 'chunk':
                  // Content chunk - backend sends accumulated content
                  if (parsed.content !== undefined) {
                    accumulatedContent = parsed.content;
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === assistantMessageId
                          ? { ...msg, content: accumulatedContent, isStreaming: true }
                          : msg
                      )
                    );
                  }
                  break;
                  
                case 'complete':
                  // Final metadata
                  if (parsed.detectedLanguage) metadata.detectedLanguage = parsed.detectedLanguage;
                  if (parsed.targetLanguage) metadata.mode = parsed.targetLanguage; // Using targetLanguage as mode indicator
                  break;
                  
                case 'error':
                  throw new Error(parsed.message || 'Streaming error');
                  
                default:
                  // Legacy format support (direct content without type)
                  if (parsed.content !== undefined && !parsed.type) {
                    accumulatedContent += parsed.content;
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === assistantMessageId
                          ? { ...msg, content: accumulatedContent, isStreaming: true }
                          : msg
                      )
                    );
                  }
                  // Legacy metadata
                  if (parsed.sessionId) metadata.sessionId = parsed.sessionId;
                  if (parsed.detectedLanguage) metadata.detectedLanguage = parsed.detectedLanguage;
                  if (parsed.mode) metadata.mode = parsed.mode;
              }
              
            } catch (e) {
              // Ignore parse errors for partial chunks
              console.log('Parse error (likely partial chunk):', e);
            }
          }
        }
      }

      // Mark streaming as complete
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, content: accumulatedContent, isStreaming: false }
            : msg
        )
      );

      if (onComplete) {
        onComplete(metadata);
      }

    } catch (error) {
      console.error('Stream reading error:', error);
      throw error;
    } finally {
      reader.releaseLock();
    }
  }, []);

  // Trigger welcome message for new users (onboarding)
  const triggerWelcomeMessage = useCallback(async () => {
    if (welcomeTriggered.current) return; // Prevent duplicate calls
    welcomeTriggered.current = true;
    
    setIsLoading(true);
    
    // Add placeholder for assistant response (welcome message)
    const welcomeMessageId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      {
        id: welcomeMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      },
    ]);

    try {
      const response = await fetch(`${API_URL}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: 'start', // Trigger onboarding
          sessionId: null,
          mode: languageMode,
          selectedLanguage: selectedLanguage,
        }),
      });

      if (!response.ok) throw new Error('Failed to get welcome message');

      // Handle streaming response
      await handleStreamingResponse(response, welcomeMessageId, (metadata) => {
        if (metadata.sessionId) {
          setSessionId(metadata.sessionId);
          localStorage.setItem('chatSessionId', metadata.sessionId);
        }

        if (metadata.detectedLanguage) {
          setDetectedLanguage(metadata.detectedLanguage);
        }

        if (metadata.mode) {
          setChatMode(metadata.mode);
        }
      });

    } catch (error) {
      console.error('Welcome message error:', error);
      // Fallback welcome message
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === welcomeMessageId
            ? {
                ...msg,
                content: "👋 Hello! I'm Wansiri Hospital assistant.\n\nMay I know your name?",
                isStreaming: false,
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [languageMode, selectedLanguage, welcomeTriggered, handleStreamingResponse]);

  // Save sessionId and language settings to localStorage only
  // Messages are stored in Supabase, not localStorage
  useEffect(() => {
    setMessageCount(messages.length);
  }, [messages]);

  useEffect(() => {
    if (sessionId) {
      localStorage.setItem('chatSessionId', sessionId);
    }
  }, [sessionId]);

  useEffect(() => {
    localStorage.setItem('chatLanguageMode', languageMode);
  }, [languageMode]);

  useEffect(() => {
    localStorage.setItem('chatSelectedLanguage', selectedLanguage);
  }, [selectedLanguage]);

  const resetSession = useCallback(() => {
    setSessionId(null);
    setMessages([]);
    setMessageCount(0);
    setDetectedLanguage(null);
    localStorage.removeItem('chatSessionId');
    console.log('🔄 Session reset');
  }, []);

  const selectLanguage = useCallback((lang: SupportedLanguage) => {
    setSelectedLanguage(lang);
    setLanguageMode('manual');
    setDetectedLanguage(null);
    setIsLangDropdownOpen(false);
    console.log('🌐 Manual language selected:', lang);
  }, []);

  const resetToAuto = useCallback(() => {
    setLanguageMode('auto');
    setDetectedLanguage(null);
    console.log('✨ Switched to auto-detect mode');
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    // Add user message
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Add placeholder for assistant response
    const assistantMessageId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      },
    ]);

    try {
      const response = await fetch(`${API_URL}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: content,
          sessionId: sessionId,
          mode: languageMode,              // 'auto' or 'manual'
          selectedLanguage: selectedLanguage, // used when mode is 'manual'
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      // Handle streaming response
      await handleStreamingResponse(response, assistantMessageId, (metadata) => {
        if (metadata.sessionId) {
          setSessionId(metadata.sessionId);
        }

        // Update detected language from server
        if (metadata.detectedLanguage) {
          setDetectedLanguage(metadata.detectedLanguage);
        }

        // Update chat mode for onboarding UI
        if (metadata.mode) {
          setChatMode(metadata.mode);
        }
      });

    } catch (error) {
      const currentLang = languageMode === 'manual' ? selectedLanguage : (detectedLanguage || 'en');
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content: currentLang === 'th' 
                  ? 'ขออภัย เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
                  : currentLang === 'ko'
                  ? '죄송합니다. 오류가 발생했습니다. 다시 시도해 주세요.'
                  : 'Sorry, an error occurred. Please try again.',
                error: true,
                isStreaming: false,
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, languageMode, selectedLanguage, detectedLanguage, handleStreamingResponse]);

  // Get current suggestions based on mode
  const currentSuggestions = languageMode === 'manual' 
    ? LANGUAGE_CONFIG[selectedLanguage].suggestions
    : LANGUAGE_CONFIG['en'].suggestions; // Default to English suggestions in auto mode

  // Determine display language for UI
  const displayLanguage = languageMode === 'manual' ? selectedLanguage : (detectedLanguage || selectedLanguage);

  return (
    <div className="flex h-screen bg-background">
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="border-b px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-3 flex items-center justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50 relative">
          <div className="flex items-center">
            <div className="h-5 max-[390px]:h-5 sm:h-8 md:h-10 lg:h-12 w-[90px] max-[390px]:w-[90px] sm:w-[120px] md:w-[150px] lg:w-[180px] overflow-hidden flex items-center justify-center">
              <img
                src="/logo.png"
                alt="Wansiri Hospital"
                className="h-full w-full object-contain"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2">
            {/* Smart Language Selector */}
            <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg px-0.5 sm:px-1 py-0.5 sm:py-1 relative z-50">
              {/* Mode Indicator */}
              <div 
                className={`flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] max-[390px]:text-[8px] sm:text-[10px] font-medium transition-colors ${
                  languageMode === 'auto' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title={languageMode === 'auto' ? 'Auto-detect language from your message' : 'Click to switch to auto-detect'}
                onClick={languageMode === 'manual' ? resetToAuto : undefined}
                style={{ cursor: languageMode === 'manual' ? 'pointer' : 'default' }}
              >
                <Sparkles className="h-2.5 w-2.5" />
                <span className="hidden sm:inline">{languageMode === 'auto' ? 'Auto' : 'Manual'}</span>
                <span className="inline sm:hidden">{languageMode === 'auto' ? 'Auto' : 'Man'}</span>
              </div>

              {/* Language Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                  className="flex items-center gap-0.5 px-1 py-0.5 rounded text-xs sm:text-sm hover:bg-accent transition-colors"
                >
                  <span className="text-sm">{LANGUAGE_CONFIG[displayLanguage].flag}</span>
                  <span className="hidden sm:inline">{LANGUAGE_CONFIG[displayLanguage].name}</span>
                  <span className="inline sm:hidden text-[9px] max-[390px]:text-[9px]">
                    {displayLanguage === 'en' ? 'EN' : displayLanguage === 'th' ? 'TH' : displayLanguage === 'ko' ? 'KO' : 'ZH'}
                  </span>
                  <ChevronDown className={`h-2.5 w-2.5 sm:h-3 sm:w-3 transition-transform ${isLangDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isLangDropdownOpen && (
                  <>
                    {/* Dropdown menu - highest z-index */}
                    <div className="absolute right-0 top-full mt-1 z-[9999] min-w-[160px] bg-white dark:bg-slate-900 border rounded-xl shadow-2xl py-2">
                      <div className="px-3 py-2 text-xs text-muted-foreground border-b border-gray-100 dark:border-gray-800">
                        {languageMode === 'auto' ? 'Currently auto-detecting' : 'Manual selection'}
                      </div>
                      {(Object.keys(LANGUAGE_CONFIG) as SupportedLanguage[]).map((lang) => (
                        <button
                          key={lang}
                          onClick={() => {
                            selectLanguage(lang);
                            setIsLangDropdownOpen(false);
                          }}
                          className={`w-full px-4 py-2.5 text-sm text-left hover:bg-[#16bec9]/10 dark:hover:bg-teal-950/50 flex items-center gap-3 transition-colors ${
                            selectedLanguage === lang && languageMode === 'manual' ? 'bg-[#16bec9]/10 dark:bg-[#16bec9]/20 text-[#16bec9]' : ''
                          }`}
                        >
                          <span className="text-lg">{LANGUAGE_CONFIG[lang].flag}</span>
                          <span>{LANGUAGE_CONFIG[lang].name}</span>
                          {selectedLanguage === lang && languageMode === 'manual' && (
                            <span className="ml-auto text-[#16bec9]">✓</span>
                          )}
                        </button>
                      ))}
                      <div className="border-t border-gray-100 dark:border-gray-800 mt-1 pt-2 px-4 py-2 text-xs text-muted-foreground">
                        Selecting a language switches to manual mode
                      </div>
                    </div>
                    {/* Backdrop to close dropdown when clicking outside */}
                    <div 
                      className="fixed inset-0 z-[9998]" 
                      onClick={() => setIsLangDropdownOpen(false)}
                    />
                  </>
                )}
              </div>
            </div>

            {sessionId && (
              <Button
                variant="ghost"
                size="icon"
                onClick={resetSession}
                className="h-6 w-6 max-[390px]:h-6 max-[390px]:w-6 sm:h-8 sm:w-8 md:h-9 md:w-9 text-muted-foreground"
                title="Start new conversation"
              >
                <RefreshCw className="h-3 w-3 max-[390px]:h-3 max-[390px]:w-3 sm:h-4 sm:w-4" />
              </Button>
            )}
            
            <ThemeToggle />
          </div>
        </header>

        {/* Language Mode Banner */}
        {showLangBanner && (
          <div className="px-2 max-[390px]:px-2 sm:px-3 md:px-4 py-1 max-[390px]:py-1 sm:py-2 bg-gradient-to-r from-[#16bec9]/10 to-[#16bec9]/5 dark:from-[#16bec9]/20 dark:to-[#16bec9]/10 border-b text-[10px] max-[390px]:text-[10px] sm:text-xs md:text-sm">
            <div className="flex items-center justify-between max-w-4xl mx-auto">
              <div className="flex items-center gap-1 max-[390px]:gap-1 sm:gap-1.5 md:gap-2 flex-1 min-w-0">
                {languageMode === 'auto' ? (
                  <>
                    <Sparkles className="h-3 w-3 max-[390px]:h-3 max-[390px]:w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 text-[#16bec9] shrink-0" />
                    <span className="truncate">
                      <strong className="hidden sm:inline">Auto-detect mode:</strong>
                      <span className="sm:hidden">✨ </span>
                      <span className="hidden max-[390px]:inline">🇹🇭🇬🇧🇰🇷</span>
                      <span className="max-[390px]:hidden">Type in any language (🇹🇭 🇬🇧 🇰🇷) and I'll reply in the same language</span>
                    </span>
                  </>
                ) : (
                  <>
                    <Globe className="h-3 w-3 max-[390px]:h-3 max-[390px]:w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 text-[#16bec9] shrink-0" />
                    <span className="truncate">
                      <strong className="hidden sm:inline">Manual mode:</strong>
                      <span className="sm:hidden">🌏 </span>
                      {LANGUAGE_CONFIG[selectedLanguage].flag} {LANGUAGE_CONFIG[selectedLanguage].name}. 
                      <button 
                        onClick={resetToAuto}
                        className="text-[#16bec9] hover:underline whitespace-nowrap"
                      >
                        Switch to auto
                      </button>
                    </span>
                  </>
                )}
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-5 max-[390px]:h-5 sm:h-6 px-1 max-[390px]:px-1 sm:px-1.5 text-[10px] max-[390px]:text-[10px] sm:text-xs shrink-0 ml-1 max-[390px]:ml-1 sm:ml-2"
                onClick={() => setShowLangBanner(false)}
              >
                ✕
              </Button>
            </div>
          </div>
        )}

        {/* Detected Language Indicator (only in auto mode) */}
        {languageMode === 'auto' && detectedLanguage && (
          <div className="px-2 max-[390px]:px-2 sm:px-4 py-0.5 max-[390px]:py-0.5 sm:py-1 bg-muted/30 text-[10px] max-[390px]:text-[10px] sm:text-xs text-center border-b text-muted-foreground">
            Detected: {LANGUAGE_CONFIG[detectedLanguage].flag} {LANGUAGE_CONFIG[detectedLanguage].name}
          </div>
        )}

        {/* Chat Container */}
        <ChatContainer
          messages={messages}
          isTyping={isLoading}
          onSuggestionClick={sendMessage}
          emptyStateSuggestions={currentSuggestions}
          mode={chatMode}
          onSkip={() => sendMessage('skip')}
          onQuickReply={(value) => sendMessage(value)}
          language={selectedLanguage}
        />

        {/* Chat Input */}
        <ChatInput
          onSend={sendMessage}
          isLoading={isLoading}
          placeholder={
            languageMode === 'manual'
              ? selectedLanguage === 'th' 
                ? `ถามเป็นภาษาไทย... (ตอบภาษาไทย)`
                : selectedLanguage === 'ko'
                ? `한국어로 질문하세요... (한국어로 답변)`
                : selectedLanguage === 'zh'
                ? `用中文提问... (中文回复)`
                : `Ask in English... (replies in English)`
              : 'Type in Thai, English, Korean, or Chinese...'
          }
        />
      </div>
    </div>
  );
}
