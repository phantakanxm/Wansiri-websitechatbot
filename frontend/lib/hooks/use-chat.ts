'use client';

import { useState, useCallback, useEffect } from 'react';
import { 
  ChatMessage, 
  createMessage, 
  chatStorage, 
  SupportedLanguage,
  LANGUAGE_CONFIG,
} from '@/lib/chat-config';

interface UseChatOptions {
  apiUrl?: string;
  onError?: (error: Error) => void;
  onMessageReceived?: (message: ChatMessage) => void;
}

interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  sessionId: string | null;
  sendMessage: (content: string) => Promise<void>;
  resetSession: () => void;
  messageCount: number;
}

/**
 * Custom hook for managing chat state and interactions
 * 
 * @example
 * ```tsx
 * const { messages, isLoading, sendMessage, resetSession } = useChat({
 *   apiUrl: 'http://localhost:3001/api/chat',
 * });
 * ```
 */
export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const { apiUrl = '/api/chat', onError, onMessageReceived } = options;
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Load saved session on mount
  useEffect(() => {
    const savedSession = chatStorage.getSessionId();
    const savedMessages = chatStorage.getMessages();
    
    if (savedSession) {
      setSessionId(savedSession);
    }
    
    if (savedMessages) {
      setMessages(savedMessages);
    }
  }, []);

  // Save messages when they change
  useEffect(() => {
    if (messages.length > 0) {
      chatStorage.setMessages(messages);
    }
  }, [messages]);

  // Save session ID when it changes
  useEffect(() => {
    if (sessionId) {
      chatStorage.setSessionId(sessionId);
    }
  }, [sessionId]);

  /**
   * Send a message to the chat API
   */
  const sendMessage = useCallback(async (content: string) => {
    // Create and add user message
    const userMessage = createMessage(content, 'user');
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Create placeholder for assistant response
    const assistantMessageId = crypto.randomUUID();
    const assistantPlaceholder = createMessage('', 'assistant', {
      id: assistantMessageId,
      isStreaming: true,
    });
    
    setMessages((prev) => [...prev, assistantPlaceholder]);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          sessionId: sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Update session ID if provided
      if (data.sessionId) {
        setSessionId(data.sessionId);
      }

      // Update assistant message with response
      const updatedMessage: ChatMessage = {
        ...assistantPlaceholder,
        content: data.response || data.message || '',
        isStreaming: false,
        images: data.images || [],
      };

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId ? updatedMessage : msg
        )
      );

      onMessageReceived?.(updatedMessage);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Update message with error state
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, error: true, isStreaming: false, content: errorMessage }
            : msg
        )
      );

      onError?.(error instanceof Error ? error : new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl, sessionId, onError, onMessageReceived]);

  /**
   * Reset the current chat session
   */
  const resetSession = useCallback(() => {
    setSessionId(null);
    setMessages([]);
    chatStorage.clearSession();
  }, []);

  return {
    messages,
    isLoading,
    sessionId,
    sendMessage,
    resetSession,
    messageCount: messages.length,
  };
}

/**
 * Custom hook for language selection
 */
export function useChatLanguage() {
  const [languageMode, setLanguageMode] = useState<'auto' | 'manual'>('auto');
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('en');
  const [detectedLanguage, setDetectedLanguage] = useState<SupportedLanguage | null>(null);

  // Load saved preferences on mount
  useEffect(() => {
    const savedMode = chatStorage.getLanguageMode();
    const savedLang = chatStorage.getSelectedLanguage();
    
    setLanguageMode(savedMode);
    setSelectedLanguage(savedLang);
  }, []);

  // Save mode when it changes
  useEffect(() => {
    chatStorage.setLanguageMode(languageMode);
  }, [languageMode]);

  // Save language when it changes
  useEffect(() => {
    chatStorage.setSelectedLanguage(selectedLanguage);
  }, [selectedLanguage]);

  const selectLanguage = useCallback((lang: SupportedLanguage) => {
    setSelectedLanguage(lang);
    setLanguageMode('manual');
    setDetectedLanguage(null);
  }, []);

  const resetToAuto = useCallback(() => {
    setLanguageMode('auto');
    setDetectedLanguage(null);
  }, []);

  const updateDetectedLanguage = useCallback((lang: SupportedLanguage | null) => {
    setDetectedLanguage(lang);
  }, []);

  const currentLanguage = languageMode === 'manual' 
    ? selectedLanguage 
    : (detectedLanguage || selectedLanguage);

  return {
    languageMode,
    selectedLanguage,
    detectedLanguage,
    currentLanguage,
    selectLanguage,
    resetToAuto,
    updateDetectedLanguage,
    suggestions: LANGUAGE_CONFIG[currentLanguage].suggestions,
  };
}
