'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Copy, Check, Bot, User, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import type { ChatMessage as MessageType } from '@/lib/chat-config';

interface ChatMessageProps {
  message: MessageType;
  onRetry?: () => void;
  onSkip?: () => void;
  onQuickReply?: (value: string) => void;
  showSkip?: boolean;
  showCountries?: boolean;
  showServices?: boolean;
  language?: 'en' | 'th' | 'ko' | 'zh';
}

export function ChatMessage({ 
  message, 
  onRetry, 
  onSkip, 
  onQuickReply,
  showSkip, 
  showCountries,
  showServices,
  language = 'en'
}: ChatMessageProps) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  // Button labels based on language
  const countryLabels = {
    en: { th: '🇹🇭 Thailand', kr: '🇰🇷 Korea', uk: '🇬🇧 UK/English', other: '🌏 Other' },
    th: { th: '🇹🇭 ไทย', kr: '🇰🇷 เกาหลี', uk: '🇬🇧 อังกฤษ', other: '🌏 อื่นๆ' },
    ko: { th: '🇹🇭 태국', kr: '🇰🇷 한국', uk: '🇬🇧 영국', other: '🌏 기타' },
    zh: { th: '🇹🇭 泰国', kr: '🇰🇷 韩国', uk: '🇬🇧 英国', other: '🌏 其他' },
  };

  const serviceLabels = {
    en: { srs: '💉 SRS (Sex Reassignment Surgery)', consult: '💬 Consultation Only' },
    th: { srs: '💉 SRS (การผ่าตัดแปลงเพศ)', consult: '💬 ปรึกษาก่อนตัดสินใจ' },
    ko: { srs: '💉 SRS (성전환 수술)', consult: '💬 상담' },
    zh: { srs: '💉 SRS (性别重置手术)', consult: '💬 仅咨询' },
  };

  const labels = countryLabels[language] || countryLabels.en;
  const svcLabels = serviceLabels[language] || serviceLabels.en;

  const copyToClipboard = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      className={cn(
        'flex gap-3 items-start group',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className={cn(
          isUser ? 'bg-[#16bec9]' : 'bg-[#16bec9]',
          'text-white text-xs'
        )}>
          {isUser ? <User size={14} /> : <Bot size={14} />}
        </AvatarFallback>
      </Avatar>

      {/* Message Content */}
      <div
        className={cn(
          'flex flex-col gap-1 max-w-[90%] md:max-w-[85%]',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        {/* Bubble */}
        <div
          className={cn(
            'rounded-2xl px-4 py-3 max-w-full',
            isUser
              ? 'bg-[#16bec9] text-white'
              : 'bg-muted border border-border/50'
          )}
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none break-words">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  code({ inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    const code = String(children).replace(/\n$/, '');
                    
                    if (!inline && match) {
                      return (
                        <div className="relative group/code">
                          {/* Copy button for code blocks */}
                          <div className="absolute right-2 top-2 opacity-0 group-hover/code:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-100"
                              onClick={() => copyToClipboard(code)}
                            >
                              {copied ? (
                                <Check size={12} />
                              ) : (
                                <Copy size={12} />
                              )}
                            </Button>
                          </div>
                          <pre className="bg-zinc-950 text-zinc-50 p-4 rounded-lg overflow-x-auto max-w-full">
                            <code className={className} {...props}>
                              {children}
                            </code>
                          </pre>
                        </div>
                      );
                    }
                    return (
                      <code
                        className="bg-zinc-200 dark:bg-zinc-800 px-1 py-0.5 rounded text-sm"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                  p({ children }) {
                    return <p className="mb-2 last:mb-0 break-words">{children}</p>;
                  },
                  ul({ children }) {
                    return <ul className="list-disc pl-4 mb-2 break-words">{children}</ul>;
                  },
                  ol({ children }) {
                    return <ol className="list-decimal pl-4 mb-2 break-words">{children}</ol>;
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
        
        {/* Quick Reply Buttons - Countries */}
        {!isUser && showCountries && onQuickReply && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => onQuickReply('1')}
              className="px-4 py-2 rounded-xl bg-white border-2 border-[#16bec9]/20 hover:border-[#16bec9] hover:bg-[#16bec9]/10 transition-all duration-200 text-sm font-medium shadow-sm"
            >
              {labels.th}
            </button>
            <button
              onClick={() => onQuickReply('2')}
              className="px-4 py-2 rounded-xl bg-white border-2 border-[#16bec9]/20 hover:border-[#16bec9] hover:bg-[#16bec9]/10 transition-all duration-200 text-sm font-medium shadow-sm"
            >
              {labels.kr}
            </button>
            <button
              onClick={() => onQuickReply('3')}
              className="px-4 py-2 rounded-xl bg-white border-2 border-[#16bec9]/20 hover:border-[#16bec9] hover:bg-[#16bec9]/10 transition-all duration-200 text-sm font-medium shadow-sm"
            >
              {labels.uk}
            </button>
            <button
              onClick={() => onQuickReply('4')}
              className="px-4 py-2 rounded-xl bg-white border-2 border-[#16bec9]/20 hover:border-[#16bec9] hover:bg-[#16bec9]/10 transition-all duration-200 text-sm font-medium shadow-sm"
            >
              {labels.other}
            </button>
          </div>
        )}

        {/* Quick Reply Buttons - Services */}
        {!isUser && showServices && onQuickReply && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => onQuickReply('1')}
              className="px-4 py-2 rounded-xl bg-white border-2 border-[#16bec9]/20 hover:border-[#16bec9] hover:bg-[#16bec9]/10 transition-all duration-200 text-sm font-medium shadow-sm"
            >
              {svcLabels.srs}
            </button>
            <button
              onClick={() => onQuickReply('2')}
              className="px-4 py-2 rounded-xl bg-white border-2 border-[#16bec9]/20 hover:border-[#16bec9] hover:bg-[#16bec9]/10 transition-all duration-200 text-sm font-medium shadow-sm"
            >
              {svcLabels.consult}
            </button>
          </div>
        )}

        {/* Skip Button - Show during onboarding name */}
        {!isUser && showSkip && onSkip && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSkip}
            className="mt-2 px-4 py-2 h-auto rounded-xl border-dashed border-muted-foreground/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 text-sm"
          >
            ⏭️ Skip → Anonymous
          </Button>
        )}
        
        {/* Timestamp */}
        <span className="text-xs text-muted-foreground px-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {formatTime(message.timestamp)}
        </span>
        
        {/* Error message with retry */}
        {message.error && (
          <div className="flex items-center gap-2 px-1">
            <span className="text-xs text-destructive">
              Failed to send message
            </span>
            {onRetry && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                onClick={onRetry}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
