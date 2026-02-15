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
      'border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4',
      className
    )}>
      <div className="max-w-3xl mx-auto flex gap-2 items-start">
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
              'w-full resize-none rounded-xl border bg-background px-4 py-3',
              'text-sm ring-offset-background placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'min-h-[48px] max-h-[200px] pr-12 pl-4'
            )}
          />
          
          {/* Keyboard hint */}
          <span className="absolute right-3 bottom-3 text-xs text-muted-foreground hidden sm:block pointer-events-none">
            ↵
          </span>
          
          {/* Clear button (shown when has input) */}
          {input.length > 0 && !isLoading && (
            <button
              onClick={handleClear}
              className="absolute right-10 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
              type="button"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
        </div>
        
        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={!input.trim() || isLoading || disabled}
          size="icon"
          className={cn(
            'shrink-0 h-12 w-12 rounded-xl transition-all duration-200',
            input.trim() && !isLoading
              ? 'bg-[#16bec9] hover:bg-[#14a8b2] text-white'
              : ''
          )}
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>
      
      {/* Helper text */}
      <p className="text-xs text-center text-muted-foreground mt-2 max-w-3xl mx-auto">
        Press Enter to send, Shift + Enter for new line
      </p>
    </div>
  );
}
