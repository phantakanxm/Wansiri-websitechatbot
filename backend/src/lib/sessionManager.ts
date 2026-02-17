/**
 * Session-based chat memory manager
 * Supports both Supabase (persistent) and in-memory (fallback) storage
 */

import { supabase, isSupabaseEnabled } from "./supabase";

interface Message {
  role: "user" | "model";
  content: string;
  timestamp: number;
  availableImages?: { url: string; caption?: string }[];
  imageCount?: number;
}

interface Session {
  id: string;
  messages: Message[];
  createdAt: number;
  lastActivity: number;
}

// In-memory fallback storage
const sessions = new Map<string, Session>();

/**
 * Get or create a session
 */
export async function getSession(sessionId: string): Promise<Session> {
  // Try Supabase first
  if (isSupabaseEnabled()) {
    try {
      const { data: sessionData, error } = await supabase!
        .from("sessions")
        .select("*")
        .eq("session_key", sessionId)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("[Session] Supabase error:", error);
        throw error;
      }

      if (sessionData) {
        // Fetch messages for this session
        const { data: messagesData, error: msgError } = await supabase!
          .from("messages")
          .select("role, content, created_at, available_images, image_count")
          .eq("session_id", sessionData.id)
          .order("created_at", { ascending: true });

        if (msgError) {
          console.error("[Session] Error fetching messages:", msgError);
        }

        const messages: Message[] = messagesData?.map((m: any) => ({
          role: (m.role === "assistant" ? "model" : m.role) as "user" | "model",
          content: m.content,
          timestamp: new Date(m.created_at).getTime(),
          availableImages: m.available_images,
          imageCount: m.image_count,
        })) || [];

        // Update last_active_at
        await supabase!
          .from("sessions")
          .update({ last_active_at: new Date().toISOString() })
          .eq("id", sessionData.id);

        return {
          id: sessionId,
          messages,
          createdAt: new Date(sessionData.created_at).getTime(),
          lastActivity: Date.now(),
        };
      }

      // Create new session in Supabase
      const { data: newSession, error: createError } = await supabase!
        .from("sessions")
        .insert({
          session_key: sessionId,
          preferred_language: "th",
          metadata: {},
        })
        .select()
        .single();

      if (createError) {
        console.error("[Session] Error creating session:", createError);
        throw createError;
      }

      console.log(`[Session] Created new session in Supabase: ${sessionId}`);
      return {
        id: sessionId,
        messages: [],
        createdAt: Date.now(),
        lastActivity: Date.now(),
      };
    } catch (error) {
      console.error("[Session] Supabase failed, falling back to memory:", error);
    }
  }

  // Fallback to in-memory
  let session = sessions.get(sessionId);

  if (!session) {
    session = {
      id: sessionId,
      messages: [],
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };
    sessions.set(sessionId, session);
    console.log(`[Session] Created new in-memory session: ${sessionId}`);
  } else {
    session.lastActivity = Date.now();
  }

  return session;
}

/**
 * Add message to session
 */
export async function addMessage(
  sessionId: string,
  role: "user" | "model",
  content: string,
  metadata?: {
    language?: string;
    responseTimeMs?: number;
    cacheHit?: boolean;
    source?: string;
    availableImages?: { url: string; caption?: string }[];
    imageCount?: number;
  }
): Promise<void> {
  const session = await getSession(sessionId);
  session.messages.push({
    role,
    content,
    timestamp: Date.now(),
    availableImages: metadata?.availableImages,
    imageCount: metadata?.imageCount,
  });
  session.lastActivity = Date.now();

  // Save to Supabase if enabled
  if (isSupabaseEnabled()) {
    try {
      // Get session UUID from Supabase
      const { data: sessionData } = await supabase!
        .from("sessions")
        .select("id")
        .eq("session_key", sessionId)
        .single();

      if (sessionData) {
        const { error } = await supabase!.from("messages").insert({
          session_id: sessionData.id,
          role: role === "model" ? "assistant" : role,
          content,
          language: metadata?.language,
          response_time_ms: metadata?.responseTimeMs,
          cache_hit: metadata?.cacheHit || false,
          source: metadata?.source || "api",
          available_images: metadata?.availableImages,
          image_count: metadata?.imageCount || 0,
        });

        if (error) {
          console.error("[Session] Error saving message to Supabase:", error);
        } else {
          console.log(`[Session] Saved ${role} message to Supabase`);
        }
      }
    } catch (error) {
      console.error("[Session] Failed to save to Supabase:", error);
    }
  }

  console.log(`[Session] ${sessionId}: Added ${role} message (${session.messages.length} total)`);
}

/**
 * Get chat history for a session
 */
export async function getHistory(sessionId: string): Promise<Message[]> {
  const session = await getSession(sessionId);
  return [...session.messages];
}

/**
 * Get formatted history for Gemini API
 * Converts to Gemini's content format
 */
export async function getFormattedHistory(sessionId: string): Promise<any[]> {
  const session = await getSession(sessionId);

  return session.messages.map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.content }],
  }));
}

/**
 * Clear a specific session
 */
export async function clearSession(sessionId: string): Promise<void> {
  sessions.delete(sessionId);

  if (isSupabaseEnabled()) {
    try {
      // Soft delete - set is_active to false
      await supabase!
        .from("sessions")
        .update({ is_active: false })
        .eq("session_key", sessionId);

      console.log(`[Session] Deactivated in Supabase: ${sessionId}`);
    } catch (error) {
      console.error("[Session] Error deactivating in Supabase:", error);
    }
  }

  console.log(`[Session] Cleared: ${sessionId}`);
}

/**
 * Get all active sessions (for debugging)
 */
export async function getAllSessions(): Promise<{ id: string; messageCount: number; createdAt: number }[]> {
  if (isSupabaseEnabled()) {
    try {
      const { data: sessions, error } = await supabase!
        .from("sessions")
        .select("id, session_key, created_at")
        .eq("is_active", true);

      if (error) throw error;

      // Get message counts
      const result = await Promise.all(
        sessions.map(async (s) => {
          const { count, error: countError } = await supabase!
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("session_id", s.id);

          return {
            id: s.session_key,
            messageCount: count || 0,
            createdAt: new Date(s.created_at).getTime(),
          };
        })
      );

      return result;
    } catch (error) {
      console.error("[Session] Error fetching from Supabase:", error);
    }
  }

  // Fallback to memory
  return Array.from(sessions.entries()).map(([id, session]) => ({
    id,
    messageCount: session.messages.length,
    createdAt: session.createdAt,
  }));
}

/**
 * Get session stats
 */
export async function getStats(): Promise<{ totalSessions: number; totalMessages: number }> {
  if (isSupabaseEnabled()) {
    try {
      const { count: sessionCount, error: sessionError } = await supabase!
        .from("sessions")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      const { count: messageCount, error: msgError } = await supabase!
        .from("messages")
        .select("*", { count: "exact", head: true });

      if (sessionError) throw sessionError;
      if (msgError) throw msgError;

      return {
        totalSessions: sessionCount || 0,
        totalMessages: messageCount || 0,
      };
    } catch (error) {
      console.error("[Session] Error getting stats from Supabase:", error);
    }
  }

  // Fallback to memory
  let totalMessages = 0;
  sessions.forEach((session) => {
    totalMessages += session.messages.length;
  });

  return {
    totalSessions: sessions.size,
    totalMessages,
  };
}