import { Request, Response, NextFunction } from "express";

/**
 * Custom API Error class
 */
export class APIError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error response in multiple languages
 */
const ERROR_MESSAGES: Record<string, Record<string, string>> = {
  SERVICE_UNAVAILABLE: {
    th: "ขออภัย ระบบขัดข้องชั่วคราว กรุณาลองใหม่ใน 1-2 นาที",
    en: "Sorry, the service is temporarily unavailable. Please try again in 1-2 minutes.",
    ko: "죄송합니다. 서비스가 일시적으로 사용할 수 없습니다. 1-2분 후에 다시 시도해 주세요.",
  },
  TRANSLATION_FAILED: {
    th: "ขออภัย ไม่สามารถแปลภาษาได้ กรุณาลองใหม่",
    en: "Sorry, translation failed. Please try again.",
    ko: "죄송합니다. 번역에 실패했습니다. 다시 시도해 주세요.",
  },
  FILE_SEARCH_FAILED: {
    th: "ขออภัย ไม่สามารถค้นหาข้อมูลได้ กรุณาลองใหม่",
    en: "Sorry, couldn't search for information. Please try again.",
    ko: "죄송합니다. 정보를 검색할 수 없습니다. 다시 시도해 주세요.",
  },
  RATE_LIMIT: {
    th: "ขออภัย คุณส่งข้อความเร็วเกินไป กรุณารอสักครู่",
    en: "Sorry, you're sending messages too quickly. Please wait a moment.",
    ko: "죄송합니다. 메시지를 너무 빨리 보내고 있습니다. 잠시 기다려 주세요.",
  },
  INTERNAL_ERROR: {
    th: "ขออภัย เกิดข้อผิดพลาดภายใน กรุณาลองใหม่",
    en: "Sorry, an internal error occurred. Please try again.",
    ko: "죄송합니다. 낶부 오류가 발생했습니다. 다시 시도해 주세요.",
  },
};

/**
 * Get error message in appropriate language
 */
export function getErrorMessage(errorCode: string, lang: string = 'en'): string {
  const messages = ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.INTERNAL_ERROR;
  return messages[lang] || messages.en;
}

/**
 * Global error handler middleware
 */
export function globalErrorHandler(
  err: Error | APIError,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error("[Error]", err);

  // Default error
  let statusCode = 500;
  let message = "Internal server error";
  let errorCode = "INTERNAL_ERROR";

  // Handle known errors
  if (err instanceof APIError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err.message?.includes("Gemini") || err.message?.includes("google")) {
    statusCode = 503;
    errorCode = "SERVICE_UNAVAILABLE";
    message = "AI service temporarily unavailable";
  } else if (err.message?.includes("translate")) {
    statusCode = 503;
    errorCode = "TRANSLATION_FAILED";
    message = "Translation service failed";
  }

  // Get client language from header or default to English
  const clientLang = (req.headers["accept-language"] || "en").split(",")[0].substring(0, 2);
  const supportedLangs = ["th", "en", "ko"];
  const lang = supportedLangs.includes(clientLang) ? clientLang : "en";

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: getErrorMessage(errorCode, lang),
      technicalMessage: process.env.NODE_ENV === "development" ? err.message : undefined,
      retryAfter: statusCode === 503 ? 60 : undefined,
    },
  });
}

/**
 * Async handler wrapper - catches errors from async functions
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Request validator middleware
 */
export function validateRequest(requiredFields: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const missing = requiredFields.filter((field) => !req.body[field]);
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: `Missing required fields: ${missing.join(", ")}`,
        },
      });
    }
    next();
  };
}
