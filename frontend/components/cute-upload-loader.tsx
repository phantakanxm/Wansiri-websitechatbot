"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ImageIcon, Sparkles, Heart, Cloud, Star } from "lucide-react";

interface CuteUploadLoaderProps {
  isOpen: boolean;
  fileCount?: number;
  progress?: number;
}

const cuteMessages = [
  "กำลังอัปโหลดรูปน่ารักๆ... 💕",
  "รูปภาพกำลังบินไปยังคลาวด์ ☁️✨",
  "โหลดดิ้ง~ โหลดดิ้ง~ 🎵",
  "กรุณารอสักครู่นะคะ/ครับ 🥺",
  "แป๊บเดียวเท่านั้น! สัญญา 🤙",
  "AI กำลังตรวจสอบรูปภาพ 🔍✨",
  "เกือบเสร็จแล้ว~ 🎯",
  "วู้ว~ รูปสวยจัง! 📸💫",
];

export function CuteUploadLoader({ 
  isOpen, 
  fileCount = 1,
  progress
}: CuteUploadLoaderProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [dots, setDots] = useState("");

  // Rotate messages every 2 seconds
  useEffect(() => {
    if (!isOpen) return;
    
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % cuteMessages.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [isOpen]);

  // Animate dots
  useEffect(() => {
    if (!isOpen) return;
    
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      {/* Main Card */}
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 max-w-sm w-full mx-4 overflow-hidden">
        {/* Background Decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Floating Clouds */}
          <div className="absolute top-4 left-4 text-blue-200/50 dark:text-blue-400/30 animate-float-slow">
            <Cloud className="w-8 h-8" />
          </div>
          <div className="absolute top-8 right-6 text-pink-200/50 dark:text-pink-400/30 animate-float-medium">
            <Cloud className="w-6 h-6" />
          </div>
          
          {/* Floating Stars */}
          <div className="absolute bottom-12 left-6 text-yellow-300/60 dark:text-yellow-400/40 animate-twinkle">
            <Star className="w-4 h-4" />
          </div>
          <div className="absolute top-16 right-8 text-yellow-300/60 dark:text-yellow-400/40 animate-twinkle-delayed">
            <Star className="w-3 h-3" />
          </div>
        </div>

        {/* Content */}
        <div className="relative flex flex-col items-center text-center">
          {/* Cute Upload Animation */}
          <div className="relative mb-6">
            {/* Outer Ring - Pulsing */}
            <div className="absolute inset-0 -m-4 rounded-full bg-gradient-to-r from-[#16bec9]/20 to-pink-400/20 animate-ping-slow" />
            
            {/* Middle Ring - Rotating */}
            <div className="absolute inset-0 -m-2 rounded-full border-2 border-dashed border-[#16bec9]/30 dark:border-[#16bec9]/50 animate-spin-slow" />
            
            {/* Main Icon Container */}
            <div className="relative h-24 w-24 rounded-2xl bg-gradient-to-br from-[#16bec9] to-[#14a8b2] flex items-center justify-center shadow-lg shadow-[#16bec9]/30 animate-bounce-gentle">
              {/* Image Icon */}
              <ImageIcon className="h-12 w-12 text-white" />
              
              {/* Sparkles */}
              <div className="absolute -top-1 -right-1 text-yellow-300 animate-pulse">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="absolute -bottom-1 -left-1 text-pink-300 animate-pulse-delayed">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>

            {/* Floating Hearts */}
            <div className="absolute -top-2 left-0 text-pink-400 animate-float-heart-1">
              <Heart className="w-4 h-4 fill-current" />
            </div>
            <div className="absolute top-0 -right-2 text-red-400 animate-float-heart-2">
              <Heart className="w-3 h-3 fill-current" />
            </div>
            <div className="absolute bottom-2 -left-3 text-pink-300 animate-float-heart-3">
              <Heart className="w-5 h-5 fill-current" />
            </div>
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold bg-gradient-to-r from-[#16bec9] to-pink-500 bg-clip-text text-transparent mb-2">
            กำลังอัปโหลด
          </h3>

          {/* File Count Badge */}
          <div className="flex items-center gap-2 mb-4">
            <span className="px-3 py-1 rounded-full bg-[#16bec9]/10 dark:bg-[#16bec9]/20 text-[#16bec9] text-sm font-medium">
              {fileCount} รูป
            </span>
            <span className="text-gray-400">|</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              กรุณารอสักครู่{dots}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full mb-4">
            <div className="h-3 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full bg-gradient-to-r from-[#16bec9] via-[#14a8b2] to-pink-400",
                  "transition-all duration-500 ease-out animate-shimmer",
                  progress !== undefined ? "" : "animate-progress-indeterminate w-1/2"
                )}
                style={{ width: progress !== undefined ? `${progress}%` : undefined }}
              />
            </div>
            {progress !== undefined && (
              <p className="text-xs text-gray-400 mt-1 text-right">{progress}%</p>
            )}
          </div>

          {/* Rotating Message */}
          <p className="text-sm text-gray-600 dark:text-gray-300 animate-fade-in min-h-[1.5rem]">
            {cuteMessages[messageIndex]}
          </p>

          {/* File Icons Animation */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {[...Array(Math.min(fileCount, 5))].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  "bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-800 dark:to-slate-700",
                  "border border-gray-200 dark:border-slate-600",
                  "animate-file-bounce"
                )}
                style={{ 
                  animationDelay: `${i * 0.15}s`,
                  opacity: i >= 3 && fileCount > 5 ? 0.5 : 1 
                }}
              >
                <ImageIcon className="w-4 h-4 text-gray-400" />
              </div>
            ))}
            {fileCount > 5 && (
              <span className="text-xs text-gray-400 ml-1">+{fileCount - 5}</span>
            )}
          </div>
        </div>

        {/* Bottom Gradient Line */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#16bec9] via-pink-400 to-[#16bec9] animate-shimmer" />
      </div>
    </div>
  );
}
