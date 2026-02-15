'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function ChatInput({
  onSend,
  isLoading,
  disabled,
  placeholder = 'Type a message...',
  className,
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    onSend(input.trim());
    setInput('');
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const target = e.target;
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
    setInput(target.value);
  };

  // Clear input
  const handleClear = () => {
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus();
    }
  };

  return (
    <div className={cn(
      'border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-1 max-[390px]:p-1 sm:p-2 md:p-4',
      className
    )}>
      <div className="max-w-3xl mx-auto flex gap-1 max-[390px]:gap-1 sm:gap-1.5 md:gap-2 items-start">
        {/* Input Container */}
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              'w-full resize-none rounded-md max-[390px]:rounded-md sm:rounded-lg md:rounded-xl border bg-background px-2 max-[390px]:px-2 sm:px-3 md:px-4 py-1.5 max-[390px]:py-1.5 sm:py-2 md:py-3',
              'text-sm ring-offset-background placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'min-h-[36px] max-[390px]:min-h-[36px] sm:min-h-[44px] md:min-h-[48px] max-h-[80px] max-[390px]:max-h-[80px] sm:max-h-[120px] md:max-h-[200px] pr-6 max-[390px]:pr-6 sm:pr-10 md:pr-12'
            )}
          />
          
          {/* Keyboard hint */}
          <span className="absolute right-3 bottom-2.5 sm:bottom-3 text-xs text-muted-foreground hidden sm:block pointer-events-none">
            ↵
          </span>
          
          {/* Clear button (shown when has input) */}
          {input.length > 0 && !isLoading && (
            <button
              onClick={handleClear}
              className="absolute right-5 max-[390px]:right-5 sm:right-8 md:right-10 top-1/2 -translate-y-1/2 p-0.5 max-[390px]:p-0.5 sm:p-1 rounded-full hover:bg-muted transition-colors"
              type="button"
            >
              <X className="h-2.5 w-2.5 max-[390px]:h-2.5 max-[390px]:w-2.5 sm:h-3 sm:w-3 text-muted-foreground" />
            </button>
          )}
        </div>
        
        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={!input.trim() || isLoading || disabled}
          size="icon"
          className={cn(
            'shrink-0 h-8 w-8 max-[390px]:h-8 max-[390px]:w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 rounded-md max-[390px]:rounded-md sm:rounded-xl transition-all duration-200',
            input.trim() && !isLoading
              ? 'bg-[#16bec9] hover:bg-[#14a8b2] text-white'
              : ''
          )}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 max-[390px]:h-4 max-[390px]:w-4 sm:h-4 sm:w-4 md:h-5 md:w-5 animate-spin" />
          ) : (
            <Send className="h-4 w-4 max-[390px]:h-4 max-[390px]:w-4 sm:h-4 sm:w-4 md:h-5 md:w-5" />
          )}
        </Button>
      </div>
      
      {/* Helper text */}
      <p className="text-[10px] sm:text-xs text-center text-muted-foreground mt-1.5 sm:mt-2 max-w-3xl mx-auto hidden sm:block">
        Press Enter to send, Shift + Enter for new line
      </p>
    </div>
  );
}
