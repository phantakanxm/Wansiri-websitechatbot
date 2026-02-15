'use client';

import { Bot, Sparkles, MessageSquare, FileText, Lightbulb, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Language = 'th' | 'en' | 'ko' | 'zh';

interface EmptyStateProps {
  suggestions?: string[];
  onSuggestionClick?: (suggestion: string) => void;
  className?: string;
  title?: string;
  description?: string;
  language?: Language;
}

const defaultSuggestions = {
  th: [
    'การผ่าตัดแปลงเพศ (SRS) คืออะไร?',
    'มีเทคนิคการผ่าตัดแบบไหนบ้าง?',
    'ระยะเวลาพักฟื้นหลังผ่าตัดนานแค่ไหน?',
    'มีข้อกำหนดอะไรบ้างก่อนเข้ารับการผ่าตัด SRS?',
  ],
  en: [
    'What is Sex Reassignment Surgery (SRS)?',
    'What surgical techniques are available?',
    'How long is the recovery period after surgery?',
    'What are the requirements before undergoing SRS?',
  ],
  ko: [
    '성전환 수술(SRS)이란 무엇인가요?',
    '어떤 수술 기법이 있나요?',
    '수술 후 회복 기간은 얼마나 걸리나요?',
    'SRS 수술 전에 필요한 조건은 무엇인가요?',
  ],
  zh: [
    '什么是性别重置手术（SRS）？',
    '有哪些手术技术可供选择？',
    '术后恢复期有多长？',
    '接受SRS手术前需要什么条件？',
  ],
};

const titles: Record<Language, string> = {
  th: 'ยินดีต้อนรับสู่โรงพยาบาลวรรณสิริ',
  en: 'Welcome to Wansiri Hospital',
  ko: '완시리 병원에 오신 것을 환영합니다',
  zh: '欢迎来到Wansiri医院',
};

const descriptions: Record<Language, string> = {
  th: 'ฉันสามารถตอบคำถามเกี่ยวกับข้อมูลโรงพยาบาลวรรณสิริได้ ถามได้เลยค่ะ!',
  en: 'I can answer questions about Wansiri Hospital information. Feel free to ask!',
  ko: '완시리 병원 정보에 대해 질문에 답변할 수 있습니다. 편하게 물어보세요!',
  zh: '我可以回答关于Wansiri医院信息的问题。请随意提问！',
};

const footerHints: Record<Language, string> = {
  th: 'คลิกที่คำแนะนำหรือพิมพ์คำถามของคุณด้านล่าง',
  en: 'Click any suggestion or type your own question below',
  ko: '제안을 클릭하거나 아래에 질문을 입력하세요',
  zh: '点击任何建议或在下方输入您的问题',
};

export function EmptyState({
  suggestions,
  onSuggestionClick,
  className,
  title,
  description,
  language = 'en',
}: EmptyStateProps) {
  const currentSuggestions = suggestions || defaultSuggestions[language];
  const currentTitle = title || titles[language];
  const currentDescription = description || descriptions[language];
  const footerHint = footerHints[language];
  const icons = [Sparkles, MessageSquare, FileText, Lightbulb];

  return (
    <div className={cn(
      'flex-1 flex flex-col items-center justify-center p-3 max-[390px]:p-3 sm:p-4 md:p-8',
      className
    )}>
      <div className="flex flex-col items-center gap-3 max-[390px]:gap-3 sm:gap-4 md:gap-6 max-w-md text-center animate-slide-up">
        {/* Logo / Icon */}
        <div className="relative">
          <div className="h-12 w-12 max-[390px]:h-12 max-[390px]:w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#16bec9] to-[#14a8b2] flex items-center justify-center shadow-lg animate-pulse-glow">
            <Stethoscope className="h-6 w-6 max-[390px]:h-6 max-[390px]:w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-white" />
          </div>
          <div className="absolute -bottom-1 -right-1 h-5 w-5 max-[390px]:h-5 max-[390px]:w-5 sm:h-5 sm:w-5 md:h-6 md:w-6 rounded-full bg-green-500 border-2 border-background flex items-center justify-center">
            <span className="text-[9px] max-[390px]:text-[9px] sm:text-[10px] text-white font-bold">AI</span>
          </div>
        </div>
        
        {/* Text Content */}
        <div className="space-y-1 max-[390px]:space-y-1 sm:space-y-1.5 md:space-y-2">
          <h2 className="text-lg sm:text-xl md:text-2xl font-semibold tracking-tight">
            {currentTitle}
          </h2>
          <p className="text-muted-foreground text-xs sm:text-sm md:text-base">
            {currentDescription}
          </p>
        </div>

        {/* Suggestion Buttons */}
        <div className="grid gap-2 max-[390px]:gap-2 sm:gap-2 md:gap-3 w-full">
          {currentSuggestions.map((suggestion, i) => {
            const Icon = icons[i % icons.length];
            return (
              <Button
                key={i}
                variant="outline"
                className="justify-start h-auto py-2 max-[390px]:py-2 sm:py-2.5 md:py-3 px-3 max-[390px]:px-3 sm:px-3 md:px-4 text-left font-normal hover:bg-muted/80 hover:border-[#16bec9]/50 transition-all duration-200 group"
                onClick={() => onSuggestionClick?.(suggestion)}
              >
                <Icon className="h-3.5 w-3.5 max-[390px]:h-3.5 max-[390px]:w-3.5 sm:h-4 sm:w-4 mr-2 max-[390px]:mr-2 sm:mr-3 shrink-0 text-[#16bec9] group-hover:scale-110 transition-transform" />
                <span className="line-clamp-1 text-xs sm:text-sm">{suggestion}</span>
              </Button>
            );
          })}
        </div>

        {/* Footer hint */}
        <p className="text-[10px] max-[390px]:text-[10px] sm:text-xs text-muted-foreground">
          {footerHint}
        </p>
      </div>
    </div>
  );
}
