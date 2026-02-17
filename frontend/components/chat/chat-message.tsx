'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Copy, Check, Bot, User, RefreshCw, ZoomIn, X, ImageIcon, ChevronDown, ChevronUp, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import type { ChatMessage as MessageType } from '@/lib/chat-config';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [showImages, setShowImages] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  // Button labels based on language
  const viewImagesLabels = {
    en: { view: 'View images', hide: 'Hide images', count: (n: number) => `${n} photos` },
    th: { view: 'ดูรูปประกอบ', hide: 'ซ่อนรูป', count: (n: number) => `${n} รูป` },
    ko: { view: '사진 보기', hide: '사진 숨기기', count: (n: number) => `${n}장` },
    zh: { view: '查看图片', hide: '隐藏图片', count: (n: number) => `${n}张` },
  };
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
  const imgLabels = viewImagesLabels[language] || viewImagesLabels.en;

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

  // Get images array
  const images = showImages ? message.availableImages : message.images;
  const imageCount = images?.length || 0;

  return (
    <div
      className={cn(
        'flex gap-1.5 max-[390px]:gap-1.5 sm:gap-3 items-start group',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <Avatar className="h-5 w-5 max-[390px]:h-5 max-[390px]:w-5 sm:h-7 sm:w-7 md:h-8 md:w-8 shrink-0">
        <AvatarFallback className={cn(
          isUser ? 'bg-[#16bec9]' : 'bg-[#16bec9]',
          'text-white text-[9px] max-[390px]:text-[9px] sm:text-[10px]'
        )}>
          {isUser ? <User size={10} className="sm:w-[14px] sm:h-[14px]" /> : <Bot size={10} className="sm:w-[14px] sm:h-[14px]" />}
        </AvatarFallback>
      </Avatar>

      {/* Message Content */}
      <div
        className={cn(
          'flex flex-col gap-0.5 max-[390px]:gap-0.5 sm:gap-1 max-w-[92%] max-[390px]:max-w-[92%] sm:max-w-[90%] md:max-w-[85%]',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        {/* Bubble */}
        <div
          className={cn(
            'rounded-lg max-[390px]:rounded-lg sm:rounded-xl px-2 max-[390px]:px-2 sm:px-3 md:px-4 py-1.5 max-[390px]:py-1.5 sm:py-2.5 md:py-3 max-w-full',
            isUser
              ? 'bg-[#16bec9] text-white'
              : 'bg-muted border border-border/50'
          )}
        >
          {isUser ? (
            <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            <div className="prose prose-sm max-[390px]:prose-xs dark:prose-invert max-w-none break-words">
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
                              className="h-5 w-5 sm:h-6 sm:w-6 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-100"
                              onClick={() => copyToClipboard(code)}
                            >
                              {copied ? (
                                <Check size={10} className="sm:w-3 sm:h-3" />
                              ) : (
                                <Copy size={10} className="sm:w-3 sm:h-3" />
                              )}
                            </Button>
                          </div>
                          <pre className="bg-zinc-950 text-zinc-50 p-2 sm:p-4 rounded-lg overflow-x-auto max-w-full text-xs sm:text-sm">
                            <code className={className} {...props}>
                              {children}
                            </code>
                          </pre>
                        </div>
                      );
                    }
                    return (
                      <code
                        className="bg-zinc-200 dark:bg-zinc-800 px-1 py-0.5 rounded text-xs sm:text-sm"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                  p({ children }) {
                    return <p className="mb-1.5 sm:mb-2 last:mb-0 break-words text-xs sm:text-sm leading-relaxed">{children}</p>;
                  },
                  ul({ children }) {
                    return <ul className="list-disc pl-3 sm:pl-4 mb-1.5 sm:mb-2 break-words text-xs sm:text-sm">{children}</ul>;
                  },
                  ol({ children }) {
                    return <ol className="list-decimal pl-3 sm:pl-4 mb-1.5 sm:mb-2 break-words text-xs sm:text-sm">{children}</ol>;
                  },
                  h1({ children }) {
                    return <h1 className="text-base sm:text-lg font-bold mb-2">{children}</h1>;
                  },
                  h2({ children }) {
                    return <h2 className="text-sm sm:text-base font-bold mb-1.5 sm:mb-2">{children}</h2>;
                  },
                  h3({ children }) {
                    return <h3 className="text-xs sm:text-sm font-bold mb-1">{children}</h3>;
                  },
                  li({ children }) {
                    return <li className="mb-0.5 sm:mb-1">{children}</li>;
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
          <div className="mt-1 max-[390px]:mt-1 sm:mt-2 md:mt-3 grid grid-cols-2 gap-1 max-[390px]:gap-1 sm:gap-2">
            <button
              onClick={() => onQuickReply('1')}
              className="px-1.5 max-[390px]:px-1.5 sm:px-3 md:px-4 py-1 max-[390px]:py-1 sm:py-2 rounded-md max-[390px]:rounded-md sm:rounded-xl bg-white border-2 border-[#16bec9]/20 hover:border-[#16bec9] hover:bg-[#16bec9]/10 transition-all duration-200 text-[9px] max-[390px]:text-[9px] sm:text-xs md:text-sm font-medium shadow-sm text-left"
            >
              {labels.th}
            </button>
            <button
              onClick={() => onQuickReply('2')}
              className="px-1.5 max-[390px]:px-1.5 sm:px-3 md:px-4 py-1 max-[390px]:py-1 sm:py-2 rounded-md max-[390px]:rounded-md sm:rounded-xl bg-white border-2 border-[#16bec9]/20 hover:border-[#16bec9] hover:bg-[#16bec9]/10 transition-all duration-200 text-[9px] max-[390px]:text-[9px] sm:text-xs md:text-sm font-medium shadow-sm text-left"
            >
              {labels.kr}
            </button>
            <button
              onClick={() => onQuickReply('3')}
              className="px-1.5 max-[390px]:px-1.5 sm:px-3 md:px-4 py-1 max-[390px]:py-1 sm:py-2 rounded-md max-[390px]:rounded-md sm:rounded-xl bg-white border-2 border-[#16bec9]/20 hover:border-[#16bec9] hover:bg-[#16bec9]/10 transition-all duration-200 text-[9px] max-[390px]:text-[9px] sm:text-xs md:text-sm font-medium shadow-sm text-left"
            >
              {labels.uk}
            </button>
            <button
              onClick={() => onQuickReply('4')}
              className="px-1.5 max-[390px]:px-1.5 sm:px-3 md:px-4 py-1 max-[390px]:py-1 sm:py-2 rounded-md max-[390px]:rounded-md sm:rounded-xl bg-white border-2 border-[#16bec9]/20 hover:border-[#16bec9] hover:bg-[#16bec9]/10 transition-all duration-200 text-[9px] max-[390px]:text-[9px] sm:text-xs md:text-sm font-medium shadow-sm text-left"
            >
              {labels.other}
            </button>
          </div>
        )}

        {/* Quick Reply Buttons - Services */}
        {!isUser && showServices && onQuickReply && (
          <div className="mt-1 max-[390px]:mt-1 sm:mt-2 md:mt-3 flex flex-col gap-1 max-[390px]:gap-1 sm:gap-2">
            <button
              onClick={() => onQuickReply('1')}
              className="px-1.5 max-[390px]:px-1.5 sm:px-3 md:px-4 py-1 max-[390px]:py-1 sm:py-2 rounded-md max-[390px]:rounded-md sm:rounded-xl bg-white border-2 border-[#16bec9]/20 hover:border-[#16bec9] hover:bg-[#16bec9]/10 transition-all duration-200 text-[9px] max-[390px]:text-[9px] sm:text-xs md:text-sm font-medium shadow-sm text-left"
            >
              {svcLabels.srs}
            </button>
            <button
              onClick={() => onQuickReply('2')}
              className="px-1.5 max-[390px]:px-1.5 sm:px-3 md:px-4 py-1 max-[390px]:py-1 sm:py-2 rounded-md max-[390px]:rounded-md sm:rounded-xl bg-white border-2 border-[#16bec9]/20 hover:border-[#16bec9] hover:bg-[#16bec9]/10 transition-all duration-200 text-[9px] max-[390px]:text-[9px] sm:text-xs md:text-sm font-medium shadow-sm text-left"
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

        {/* ============================================
            ENHANCED IMAGE BUTTONS & GALLERY
            ============================================ */}
        
        {/* View Images Button - Beautiful Gradient Button */}
        {!isUser && message.availableImages && message.availableImages.length > 0 && !showImages && (
          <button
            onClick={() => setShowImages(true)}
            className={cn(
              "mt-2 sm:mt-3 group/btn relative overflow-hidden",
              "flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3",
              "rounded-xl sm:rounded-2xl",
              "bg-gradient-to-r from-[#16bec9] via-[#14a8b2] to-[#16bec9]",
              "text-white font-medium text-sm sm:text-base",
              "shadow-lg shadow-[#16bec9]/25 hover:shadow-xl hover:shadow-[#16bec9]/30",
              "transform hover:-translate-y-0.5 active:translate-y-0",
              "transition-all duration-300 ease-out",
              "border-0 outline-none focus:ring-2 focus:ring-[#16bec9]/50 focus:ring-offset-2"
            )}
          >
            {/* Shine effect */}
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700" />
            
            {/* Icon */}
            <span className="relative flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/20 backdrop-blur-sm">
              <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </span>
            
            {/* Text */}
            <span className="relative">{imgLabels.view}</span>
            
            {/* Count badge */}
            <span className="relative flex items-center justify-center min-w-[24px] sm:min-w-[28px] h-5 sm:h-6 px-1.5 sm:px-2 rounded-full bg-white/20 backdrop-blur-sm text-xs sm:text-sm font-semibold">
              {message.availableImages.length}
            </span>
            
            {/* Arrow */}
            <ChevronDown className="relative w-4 h-4 sm:w-5 sm:h-5 opacity-70 group-hover/btn:translate-y-0.5 transition-transform" />
          </button>
        )}

        {/* Hide Images Button */}
        {!isUser && message.availableImages && message.availableImages.length > 0 && showImages && (
          <button
            onClick={() => setShowImages(false)}
            className={cn(
              "mt-2 sm:mt-3 group/btn",
              "flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5",
              "rounded-xl sm:rounded-2xl",
              "bg-muted/80 hover:bg-muted",
              "text-muted-foreground hover:text-foreground font-medium text-sm",
              "border border-border/50 hover:border-border",
              "transition-all duration-200"
            )}
          >
            <ChevronUp className="w-4 h-4" />
            <span>{imgLabels.hide}</span>
          </button>
        )}

        {/* Images Gallery - Beautiful Grid */}
        {!isUser && images && imageCount > 0 && (
          <>
            <div className={cn(
              "mt-3 sm:mt-4 w-full",
              "p-2 sm:p-3 rounded-2xl bg-muted/30 border border-border/30"
            )}>
              <div className={cn(
                "grid gap-2 sm:gap-3",
                imageCount === 1 ? "grid-cols-1" :
                imageCount === 2 ? "grid-cols-2" :
                "grid-cols-2 sm:grid-cols-3"
              )}>
                {images.map((image, idx) => (
                  <div 
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={cn(
                      "group/image relative cursor-pointer",
                      "overflow-hidden rounded-xl sm:rounded-2xl",
                      "bg-muted border border-border/30",
                      "shadow-sm hover:shadow-md",
                      "transition-all duration-300",
                      imageCount === 1 ? "aspect-video" : "aspect-square"
                    )}
                  >
                    {/* Image */}
                    <img
                      src={image.url}
                      alt={image.caption || `Image ${idx + 1}`}
                      className={cn(
                        "w-full h-full object-cover",
                        "transition-all duration-500 ease-out",
                        "group-hover/image:scale-110"
                      )}
                      loading="lazy"
                      onError={(e) => {
                        console.error(`[ChatMessage] Failed to load image: ${image.url}`);
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    
                    {/* Hover Overlay */}
                    <div className={cn(
                      "absolute inset-0",
                      "bg-gradient-to-t from-black/60 via-black/20 to-transparent",
                      "opacity-0 group-hover/image:opacity-100",
                      "transition-all duration-300"
                    )}>
                      {/* Zoom icon */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center transform scale-50 group-hover/image:scale-100 transition-transform duration-300">
                          <ZoomIn className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>
                      </div>
                      
                      {/* Caption preview */}
                      {image.caption && (
                        <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3">
                          <p className="text-white text-xs sm:text-sm font-medium line-clamp-2 drop-shadow-lg">
                            {image.caption}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {/* Index badge */}
                    <div className="absolute top-2 left-2 sm:top-3 sm:left-3">
                      <span className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-black/40 backdrop-blur-sm text-white text-xs font-medium">
                        {idx + 1}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Gallery footer hint */}
              <div className="mt-2 sm:mt-3 flex items-center justify-center gap-2 text-muted-foreground/60 text-xs">
                <Eye className="w-3 h-3" />
                <span>คลิกที่รูปเพื่อดูขนาดใหญ่</span>
              </div>
            </div>

            {/* Lightbox Dialog - Single Dialog for all images */}
            <Dialog 
              open={selectedImageIndex !== null} 
              onOpenChange={(open) => {
                if (!open) setSelectedImageIndex(null);
              }}
            >
              <DialogContent 
                className={cn(
                  "max-w-[95vw] sm:max-w-4xl lg:max-w-5xl xl:max-w-6xl",
                  "p-0 overflow-hidden",
                  "bg-transparent",
                  "border-0 shadow-none"
                )}
                onPointerDownOutside={() => setSelectedImageIndex(null)}
              >
                <DialogTitle className="sr-only">
                  ดูรูปภาพ {selectedImageIndex !== null ? selectedImageIndex + 1 : ''} / {imageCount}
                </DialogTitle>
                {selectedImageIndex !== null && (
                  <div className="relative flex flex-col items-center justify-center min-h-[50vh] max-h-[90vh]">
                    {/* Close button - Fixed position */}
                    <button 
                      className="absolute -top-4 -right-4 sm:top-0 sm:right-0 z-[60] w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-sm flex items-center justify-center text-white transition-colors shadow-lg"
                      onClick={() => setSelectedImageIndex(null)}
                      type="button"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    
                    {/* Image number indicator */}
                    <div className="absolute -top-4 left-0 sm:top-0 sm:left-0 z-50 px-4 py-2 rounded-full bg-black/60 backdrop-blur-sm">
                      <span className="text-white text-sm font-medium">
                        {selectedImageIndex + 1} / {imageCount}
                      </span>
                    </div>
                    
                    {/* Previous button */}
                    {selectedImageIndex > 0 && (
                      <button
                        className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-50 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-sm flex items-center justify-center text-white transition-colors shadow-lg"
                        onClick={() => setSelectedImageIndex(prev => (prev !== null ? prev - 1 : 0))}
                        type="button"
                      >
                        <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7" />
                      </button>
                    )}
                    
                    {/* Next button */}
                    {selectedImageIndex < imageCount - 1 && (
                      <button
                        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-50 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-sm flex items-center justify-center text-white transition-colors shadow-lg"
                        onClick={() => setSelectedImageIndex(prev => (prev !== null ? prev + 1 : 0))}
                        type="button"
                      >
                        <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7" />
                      </button>
                    )}
                    
                    {/* Main Image */}
                    <div className="w-full h-full flex items-center justify-center px-12 sm:px-16">
                      <img
                        src={images[selectedImageIndex]?.url}
                        alt={images[selectedImageIndex]?.caption || `Image ${selectedImageIndex + 1}`}
                        className="max-w-full max-h-[80vh] sm:max-h-[85vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
                        onError={(e) => {
                          console.error(`[ChatMessage] Failed to load image in dialog: ${images[selectedImageIndex]?.url}`);
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </>
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
