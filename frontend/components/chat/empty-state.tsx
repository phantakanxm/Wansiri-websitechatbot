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
      'flex-1 flex flex-col items-center justify-center p-4 sm:p-8',
      className
    )}>
      <div className="flex flex-col items-center gap-6 max-w-md text-center animate-slide-up">
        {/* Logo / Icon */}
        <div className="relative">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[#16bec9] to-[#14a8b2] flex items-center justify-center shadow-lg animate-pulse-glow">
            <Stethoscope className="h-8 w-8 text-white" />
          </div>
          <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-green-500 border-2 border-background flex items-center justify-center">
            <span className="text-[10px] text-white font-bold">AI</span>
          </div>
        </div>
        
        {/* Text Content */}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            {currentTitle}
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            {currentDescription}
          </p>
        </div>

        {/* Suggestion Buttons */}
        <div className="grid gap-3 w-full">
          {currentSuggestions.map((suggestion, i) => {
            const Icon = icons[i % icons.length];
            return (
              <Button
                key={i}
                variant="outline"
                className="justify-start h-auto py-3 px-4 text-left font-normal hover:bg-muted/80 hover:border-[#16bec9]/50 transition-all duration-200 group"
                onClick={() => onSuggestionClick?.(suggestion)}
              >
                <Icon className="h-4 w-4 mr-3 shrink-0 text-[#16bec9] group-hover:scale-110 transition-transform" />
                <span className="line-clamp-1 text-sm">{suggestion}</span>
              </Button>
            );
          })}
        </div>

        {/* Footer hint */}
        <p className="text-xs text-muted-foreground">
          {footerHint}
        </p>
      </div>
    </div>
  );
}
