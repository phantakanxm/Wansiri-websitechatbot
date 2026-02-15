import { supabase, isSupabaseEnabled } from "./supabase";
import { SupportedLanguage } from "./language";

interface MessageRecord {
  id: string;
  timestamp: number;
  sessionId: string;
  language: SupportedLanguage;
  question: string;
  responseTime: number;
  cacheHit: boolean;
  fileSearchUsed: boolean;
  error: string | null;
}

interface AnalyticsData {
  messages: MessageRecord[];
  sessions: Set<string>;
  startTime: number;
}

// In-memory fallback storage
const analytics: AnalyticsData = {
  messages: [],
  sessions: new Set(),
  startTime: Date.now(),
};

// Max messages to keep in memory (prevent memory leak)
const MAX_MESSAGES = 10000;

/**
 * Record a message for analytics
 */
export async function recordMessage(data: {
  sessionId: string;
  language: SupportedLanguage | string;
  question: string;
  responseTime: number;
  cacheHit: boolean;
  fileSearchUsed: boolean;
  error: string | null;
}): Promise<void> {
  const record: MessageRecord = {
    id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    sessionId: data.sessionId,
    language: data.language as SupportedLanguage,
    question: data.question,
    responseTime: data.responseTime,
    cacheHit: data.cacheHit,
    fileSearchUsed: data.fileSearchUsed,
    error: data.error,
  };

  // Always keep in memory for quick access
  analytics.messages.push(record);
  analytics.sessions.add(data.sessionId);

  // Prevent memory leak
  if (analytics.messages.length > MAX_MESSAGES) {
    analytics.messages = analytics.messages.slice(-MAX_MESSAGES);
  }

  // Save to Supabase if enabled
  if (isSupabaseEnabled()) {
    try {
      // Insert to analytics table
      const { error } = await supabase!.from("analytics").insert({
        metric_type: "message",
        value: {
          session_id: data.sessionId,
          language: data.language,
          question: data.question,
          response_time_ms: data.responseTime,
          cache_hit: data.cacheHit,
          file_search_used: data.fileSearchUsed,
          error: data.error,
        },
        hour_bucket: new Date().toISOString().slice(0, 13) + ":00:00",
        day_bucket: new Date().toISOString().slice(0, 10),
      });

      if (error) {
        console.error("[Analytics] Error saving to Supabase:", error);
      } else {
        console.log(`[Analytics] Saved to Supabase`);
      }

      // Update top_questions if file search was used
      if (data.fileSearchUsed) {
        await updateTopQuestions(data.question, data.language as SupportedLanguage, !data.error);
      }

      // Log error if any
      if (data.error) {
        await logError({
          errorType: "api_error",
          errorMessage: data.error,
          sessionId: data.sessionId,
          requestData: { question: data.question },
        });
      }
    } catch (error) {
      console.error("[Analytics] Supabase error:", error);
    }
  }

  console.log(`[Analytics] Recorded message #${analytics.messages.length}`);
}

/**
 * Update top questions statistics
 */
async function updateTopQuestions(
  question: string,
  language: SupportedLanguage,
  hasAnswer: boolean
): Promise<void> {
  if (!isSupabaseEnabled()) return;

  try {
    const normalized = question.toLowerCase().trim().substring(0, 200);
    const hash = await generateHash(normalized);

    // Try to update existing
    const { data: existing } = await supabase!
      .from("top_questions")
      .select("id, count, answered_count, no_answer_count")
      .eq("question_hash", hash)
      .single();

    if (existing) {
      await supabase!
        .from("top_questions")
        .update({
          count: existing.count + 1,
          answered_count: hasAnswer ? existing.answered_count + 1 : existing.answered_count,
          no_answer_count: !hasAnswer ? existing.no_answer_count + 1 : existing.no_answer_count,
          last_asked_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      // Insert new
      await supabase!.from("top_questions").insert({
        question_hash: hash,
        question_text: question,
        normalized_text: normalized,
        language,
        count: 1,
        answered_count: hasAnswer ? 1 : 0,
        no_answer_count: !hasAnswer ? 1 : 0,
      });
    }
  } catch (error) {
    console.error("[Analytics] Error updating top questions:", error);
  }
}

/**
 * Generate simple hash for question
 */
async function generateHash(str: string): Promise<string> {
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

/**
 * Log error to database
 */
export async function logError(data: {
  errorType: string;
  errorMessage: string;
  errorStack?: string;
  sessionId?: string;
  messageId?: string;
  requestData?: any;
}): Promise<void> {
  if (!isSupabaseEnabled()) {
    console.error("[Error]", data.errorMessage);
    return;
  }

  try {
    await supabase!.from("error_logs").insert({
      error_type: data.errorType,
      error_message: data.errorMessage,
      error_stack: data.errorStack,
      session_id: data.sessionId,
      request_data: data.requestData,
    });
  } catch (error) {
    console.error("[Analytics] Error logging to Supabase:", error);
  }
}

/**
 * Get all analytics data
 */
export function getAnalytics(): AnalyticsData {
  return analytics;
}

/**
 * Get filtered analytics
 */
export function getFilteredAnalytics(filters: {
  startTime?: number;
  endTime?: number;
  language?: SupportedLanguage;
}): MessageRecord[] {
  return analytics.messages.filter((msg) => {
    if (filters.startTime && msg.timestamp < filters.startTime) return false;
    if (filters.endTime && msg.timestamp > filters.endTime) return false;
    if (filters.language && msg.language !== filters.language) return false;
    return true;
  });
}

/**
 * Get overview statistics
 */
export async function getOverviewStats() {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  if (isSupabaseEnabled()) {
    try {
      // Get total messages from messages table
      const { count: totalMessages, error: countError } = await supabase!
        .from("messages")
        .select("*", { count: "exact", head: true });

      // Get active sessions
      const { count: totalSessions, error: sessionError } = await supabase!
        .from("sessions")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      // Get messages in last hour
      const { count: messagesLastHour } = await supabase!
        .from("messages")
        .select("*", { count: "exact", head: true })
        .gte("created_at", new Date(oneHourAgo).toISOString());

      // Get messages today
      const { count: messagesToday } = await supabase!
        .from("messages")
        .select("*", { count: "exact", head: true })
        .gte("created_at", new Date(oneDayAgo).toISOString());

      // Get average response time
      const { data: avgData } = await supabase!
        .from("messages")
        .select("response_time_ms")
        .not("response_time_ms", "is", null);

      const avgResponseTime = avgData?.length
        ? Math.round(avgData.reduce((sum, m) => sum + (m.response_time_ms || 0), 0) / avgData.length)
        : 0;

      // Get cache hit rate from file_search_logs (where cache_used is tracked)
      const { data: fileSearchData } = await supabase!
        .from("file_search_logs")
        .select("cache_used, search_time_ms")
        .gte("created_at", new Date(oneDayAgo).toISOString());

      const totalFileSearches = fileSearchData?.length || 0;
      const cacheHits = fileSearchData?.filter(log => log.cache_used === true).length || 0;
      const cacheHitRate = totalFileSearches > 0 ? Math.round((cacheHits / totalFileSearches) * 100) : 0;

      // File search usage rate = % of messages that used file search
      const fileSearchUsageRate = totalMessages && totalMessages > 0 
        ? Math.round((totalFileSearches / totalMessages) * 100) 
        : 0;

      if (countError) throw countError;
      if (sessionError) throw sessionError;

      return {
        totalMessages: totalMessages || 0,
        totalSessions: totalSessions || 0,
        messagesLastHour: messagesLastHour || 0,
        messagesToday: messagesToday || 0,
        avgResponseTime,
        cacheHitRate,
        fileSearchUsageRate,
        totalFileSearches,
        cacheHits,
        uptime: Math.floor((now - analytics.startTime) / 1000),
      };
    } catch (error) {
      console.error("[Analytics] Error getting stats from Supabase:", error);
    }
  }

  // Fallback to in-memory
  const recentMessages = analytics.messages.filter((m) => m.timestamp > oneHourAgo);
  const todayMessages = analytics.messages.filter((m) => m.timestamp > oneDayAgo);

  const avgResponseTime =
    analytics.messages.length > 0
      ? analytics.messages.reduce((sum, m) => sum + m.responseTime, 0) / analytics.messages.length
      : 0;

  const cacheHits = analytics.messages.filter((m) => m.cacheHit).length;
  const fileSearchUses = analytics.messages.filter((m) => m.fileSearchUsed).length;

  return {
    totalMessages: analytics.messages.length,
    totalSessions: analytics.sessions.size,
    messagesLastHour: recentMessages.length,
    messagesToday: todayMessages.length,
    avgResponseTime: Math.round(avgResponseTime),
    cacheHitRate:
      analytics.messages.length > 0 ? Math.round((cacheHits / analytics.messages.length) * 100) : 0,
    fileSearchUsageRate:
      analytics.messages.length > 0 ? Math.round((fileSearchUses / analytics.messages.length) * 100) : 0,
    totalFileSearches: fileSearchUses,
    cacheHits: cacheHits,
    uptime: Math.floor((now - analytics.startTime) / 1000),
  };
}

/**
 * Get hourly stats for chart
 */
export async function getHourlyStats(hours: number = 24) {
  if (isSupabaseEnabled()) {
    try {
      const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase!
        .from("messages")
        .select("created_at")
        .gte("created_at", cutoff);

      if (error) throw error;

      const stats: Record<number, number> = {};
      
      // Initialize hours
      for (let i = 0; i < hours; i++) {
        const hour = new Date(Date.now() - i * 60 * 60 * 1000).getHours();
        stats[hour] = 0;
      }

      // Count messages
      data?.forEach((msg) => {
        const hour = new Date(msg.created_at).getHours();
        if (stats[hour] !== undefined) {
          stats[hour]++;
        }
      });

      return Object.entries(stats).map(([hour, messages]) => ({
        hour: parseInt(hour),
        messages,
      })).reverse();
    } catch (error) {
      console.error("[Analytics] Error getting hourly stats:", error);
    }
  }

  // Fallback to in-memory
  const now = Date.now();
  const stats: Record<number, { messages: number; avgTime: number }> = {};

  for (let i = 0; i < hours; i++) {
    const hour = new Date(now - i * 60 * 60 * 1000).getHours();
    stats[hour] = { messages: 0, avgTime: 0 };
  }

  const cutoff = now - hours * 60 * 60 * 1000;
  const hourMessages = analytics.messages.filter((m) => m.timestamp > cutoff);

  hourMessages.forEach((msg) => {
    const hour = new Date(msg.timestamp).getHours();
    if (!stats[hour]) stats[hour] = { messages: 0, avgTime: 0 };
    stats[hour].messages++;
  });

  return Object.entries(stats).map(([hour, data]) => ({
    hour: parseInt(hour),
    messages: data.messages,
  })).reverse();
}

/**
 * Get language distribution
 */
export async function getLanguageStats() {
  if (isSupabaseEnabled()) {
    try {
      const { data, error } = await supabase!
        .from("messages")
        .select("language");

      if (error) throw error;

      const stats: Record<SupportedLanguage, number> = { th: 0, en: 0, ko: 0, zh: 0 };
      data?.forEach((msg) => {
        const lang = msg.language as SupportedLanguage;
        if (stats[lang] !== undefined) {
          stats[lang]++;
        }
      });

      const total = data?.length || 0;
      return Object.entries(stats).map(([lang, count]) => ({
        language: lang as SupportedLanguage,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      }));
    } catch (error) {
      console.error("[Analytics] Error getting language stats:", error);
    }
  }

  // Fallback to in-memory
  const stats: Record<SupportedLanguage, number> = { th: 0, en: 0, ko: 0, zh: 0 };

  analytics.messages.forEach((msg) => {
    stats[msg.language]++;
  });

  return Object.entries(stats).map(([lang, count]) => ({
    language: lang as SupportedLanguage,
    count,
    percentage: analytics.messages.length > 0 ? Math.round((count / analytics.messages.length) * 100) : 0,
  }));
}

/**
 * Get top questions
 */
export async function getTopQuestions(limit: number = 10) {
  if (isSupabaseEnabled()) {
    try {
      const { data, error } = await supabase!
        .from("top_questions")
        .select("question_text, count, answered_count, no_answer_count")
        .order("count", { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data?.map((q) => ({
        question: q.question_text,
        count: q.count,
        hasAnswer: q.answered_count > q.no_answer_count,
      })) || [];
    } catch (error) {
      console.error("[Analytics] Error getting top questions:", error);
    }
  }

  // Fallback to in-memory
  const questionCounts: Record<string, { count: number; hasAnswer: boolean }> = {};

  analytics.messages.forEach((msg) => {
    const key = msg.question.toLowerCase().trim();
    if (!questionCounts[key]) {
      questionCounts[key] = { count: 0, hasAnswer: msg.fileSearchUsed };
    }
    questionCounts[key].count++;
    if (msg.fileSearchUsed) {
      questionCounts[key].hasAnswer = true;
    }
  });

  return Object.entries(questionCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit)
    .map(([question, data]) => ({
      question,
      count: data.count,
      hasAnswer: data.hasAnswer,
    }));
}

/**
 * Get recent errors
 */
export async function getRecentErrors(limit: number = 10) {
  if (isSupabaseEnabled()) {
    try {
      const { data, error } = await supabase!
        .from("error_logs")
        .select("created_at, error_message, error_type")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data?.map((e) => ({
        timestamp: new Date(e.created_at).getTime(),
        error: e.error_message,
        question: e.error_type,
      })) || [];
    } catch (error) {
      console.error("[Analytics] Error getting recent errors:", error);
    }
  }

  // Fallback to in-memory
  return analytics.messages
    .filter((m) => m.error)
    .slice(-limit)
    .reverse()
    .map((m) => ({
      timestamp: m.timestamp,
      error: m.error,
      question: m.question,
    }));
}

/**
 * Export data to CSV
 */
export async function exportToCSV(): Promise<string> {
  const headers = [
    "ID",
    "Timestamp",
    "Session ID",
    "Language",
    "Question",
    "Response Time (ms)",
    "Cache Hit",
    "File Search Used",
    "Error",
  ].join(",");

  let messages: MessageRecord[] = analytics.messages;

  // Try to get from Supabase if enabled
  if (isSupabaseEnabled()) {
    try {
      const { data, error } = await supabase!
        .from("messages")
        .select("id, session_id, language, content, response_time_ms, cache_hit, created_at")
        .order("created_at", { ascending: true });

      if (!error && data) {
        messages = data.map((m) => ({
          id: m.id,
          timestamp: new Date(m.created_at).getTime(),
          sessionId: m.session_id,
          language: m.language as SupportedLanguage,
          question: m.content,
          responseTime: m.response_time_ms || 0,
          cacheHit: m.cache_hit,
          fileSearchUsed: false,
          error: null,
        }));
      }
    } catch (error) {
      console.error("[Analytics] Error exporting from Supabase:", error);
    }
  }

  const rows = messages.map((msg) =>
    [
      msg.id,
      new Date(msg.timestamp).toISOString(),
      msg.sessionId,
      msg.language,
      `"${msg.question.replace(/"/g, '""')}"`,
      msg.responseTime,
      msg.cacheHit,
      msg.fileSearchUsed,
      msg.error ? `"${msg.error.replace(/"/g, '""')}"` : "",
    ].join(",")
  );

  return [headers, ...rows].join("\n");
}

/**
 * Export data to JSON
 */
export async function exportToJSON(): Promise<string> {
  const stats = await getOverviewStats();

  return JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      stats,
      messages: analytics.messages,
    },
    null,
    2
  );
}

/**
 * Clear all analytics data
 */
export async function clearAnalytics(): Promise<void> {
  analytics.messages = [];
  analytics.sessions.clear();
  analytics.startTime = Date.now();

  if (isSupabaseEnabled()) {
    try {
      // Note: Be careful with this in production!
      // await supabase!.from("messages").delete().neq("id", "");
      console.log("[Analytics] Supabase data preserved (clear not implemented for safety)");
    } catch (error) {
      console.error("[Analytics] Error clearing Supabase:", error);
    }
  }

  console.log("[Analytics] In-memory data cleared");
}