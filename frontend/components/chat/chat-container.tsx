'use client';

import { useRef, useEffect } from 'react';
import { ChatMessage } from './chat-message';
import { TypingIndicator } from './typing-indicator';
import { EmptyState } from './empty-state';
import { cn } from '@/lib/utils';
import type { ChatMessage as MessageType } from '@/lib/chat-config';

interface ChatContainerProps {
  messages: MessageType[];
  isTyping?: boolean;
  onSuggestionClick?: (suggestion: string) => void;
  emptyStateSuggestions?: string[];
  className?: string;
  mode?: string;
  onSkip?: () => void;
  onQuickReply?: (value: string) => void;
  language?: 'en' | 'th' | 'ko' | 'zh';
}

export function ChatContainer({
  messages,
  isTyping,
  onSuggestionClick,
  emptyStateSuggestions,
  className,
  mode,
  onSkip,
  onQuickReply,
  language = 'en',
}: ChatContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Filter out empty streaming messages (placeholders)
  const visibleMessages = messages.filter(
    (msg) => !(msg.isStreaming && msg.content === '')
  );

  // Don't show typing indicator if the last message is still streaming
  const lastMessage = visibleMessages[visibleMessages.length - 1];
  const isLastMessageStreaming = lastMessage?.isStreaming ?? false;
  const showTypingIndicator = isTyping && !isLastMessageStreaming;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  // Show empty state when no messages
  if (visibleMessages.length === 0 && !isTyping) {
    return (
      <EmptyState
        suggestions={emptyStateSuggestions}
        onSuggestionClick={onSuggestionClick}
        className={className}
        language={language}
      />
    );
  }

  return (
    <div 
      className={cn(
        'flex-1 overflow-y-auto scrollbar-thin',
        className
      )}
      ref={scrollRef}
    >
      <div className="flex flex-col gap-1.5 max-[390px]:gap-1.5 sm:gap-3 md:gap-4 p-1.5 max-[390px]:p-1.5 sm:p-3 md:p-4 max-w-3xl mx-auto min-h-full">
        {visibleMessages.map((message, index) => {
          const isLastMessage = index === visibleMessages.length - 1;
          return (
            <div
              key={message.id}
              className="animate-fade-in"
              style={{ animationDelay: `${Math.min(index * 0.05, 0.3)}s` }}
            >
              <ChatMessage 
                message={message} 
                showSkip={mode === 'onboarding_name' && message.role === 'assistant' && isLastMessage}
                showCountries={mode === 'onboarding_country' && message.role === 'assistant' && isLastMessage}
                showServices={mode === 'onboarding_service' && message.role === 'assistant' && isLastMessage}
                onSkip={onSkip}
                onQuickReply={onQuickReply}
                language={language}
              />
            </div>
          );
        })}
        {showTypingIndicator && (
          <div className="animate-fade-in">
            <TypingIndicator />
          </div>
        )}
        <div ref={messagesEndRef} className="h-0" />
      </div>
    </div>
  );
}
