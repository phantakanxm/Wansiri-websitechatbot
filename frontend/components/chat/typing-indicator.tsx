'use client';

import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  className?: string;
}

export function TypingIndicator({ className }: TypingIndicatorProps) {
  return (
    <div className={cn('flex gap-3 items-center', className)}>
      <div className="h-8 w-8 rounded-full bg-[#16bec9] flex items-center justify-center shrink-0">
        <Bot className="h-4 w-4 text-white" />
      </div>
      
      <div className="bg-muted border border-border/50 rounded-2xl px-4 py-3">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={cn(
                'w-2 h-2 rounded-full bg-muted-foreground/50',
                'animate-bounce-fast'
              )}
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
