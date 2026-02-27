import { Router } from "express";
import { generateChatResponseWithHistory } from "../lib/fileSearch";
import { addMessage, getHistory, getSession } from "../lib/sessionManager";
import { SupportedLanguage, LANGUAGE_NAMES } from "../lib/language";
import { recordMessage } from "../lib/analytics";

const router = Router();

/**
 * POST /api/chat/stream - Streaming chat endpoint
 * Returns response as Server-Sent Events (SSE)
 */
router.post("/", async (req, res) => {
  const startTime = Date.now();
  const { message, sessionId, selectedLanguage, mode = 'auto' } = req.body;
  const sid: string = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    if (!message || typeof message !== "string") {
      res.status(400).json({ error: "Message is required" });
      return;
    }

    // Setup SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Get session and history (now async)
    const session = await getSession(sid);
    const history = await getHistory(sid);

    // Send session ID immediately
    res.write(`data: ${JSON.stringify({ type: 'session', sessionId: sid })}\n\n`);

    // Determine language
    let forceLanguage: SupportedLanguage | undefined;
    if (mode === 'manual' && selectedLanguage) {
      forceLanguage = selectedLanguage as SupportedLanguage;
    }

    // Generate response
    const result = await generateChatResponseWithHistory(message, history, forceLanguage);

    // Stream response in chunks - use character chunks for Thai text safety
    const CHUNK_SIZE = 8; // Characters per chunk (safer for Thai combining characters)
    let streamedContent = '';
    
    for (let i = 0; i < result.response.length; i += CHUNK_SIZE) {
      const chunk = result.response.slice(i, i + CHUNK_SIZE);
      streamedContent += chunk;
      const isLast = i + CHUNK_SIZE >= result.response.length;
      
      res.write(`data: ${JSON.stringify({ 
        type: 'chunk', 
        content: streamedContent,
        isComplete: isLast
      })}\n\n`);

      // Small delay between chunks for natural feel
      if (!isLast) {
        await new Promise(resolve => setTimeout(resolve, 15));
      }
    }

    // Send final metadata with availableImages and videos (not displayed immediately)
    console.log("[ChatStream] Sending complete event with availableImages:", result.availableImages?.length || 0);
    console.log("[ChatStream] Sending complete event with videos:", result.videos?.length || 0);
    if (result.availableImages && result.availableImages.length > 0) {
      console.log("[ChatStream] Available image URLs:", result.availableImages.map(img => img.url.substring(0, 50) + "..."));
    }
    if (result.videos && result.videos.length > 0) {
      console.log("[ChatStream] Video URLs:", result.videos.map(v => v.url.substring(0, 50) + "..."));
    }
    
    res.write(`data: ${JSON.stringify({ 
      type: 'complete', 
      detectedLanguage: result.detectedLang,
      targetLanguage: result.targetLang,
      responseTime: result.responseTime,
      availableImages: result.availableImages || [],
      imageCount: result.imageCount || 0,
      videos: result.videos || []
    })}\n\n`);

    // Save to session (now async)
    await addMessage(sid, "user", message, {
      language: result.detectedLang,
      source: "stream",
    });
    await addMessage(sid, "model", result.response, {
      language: result.targetLang,
      source: "stream",
      availableImages: result.availableImages,
      imageCount: result.imageCount,
      videos: result.videos,
    });

    // Record analytics
    const responseTime = Date.now() - startTime;
    await recordMessage({
      sessionId: sid,
      language: result.targetLang,
      question: message,
      responseTime,
      cacheHit: result.fromCache || false,
      fileSearchUsed: true,
      error: null,
    });

    res.end();

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    // Record error analytics
    await recordMessage({
      sessionId: sid,
      language: 'en',
      question: message || '',
      responseTime,
      cacheHit: false,
      fileSearchUsed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    console.error("Streaming error:", error);
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to generate response' })}\n\n`);
    res.end();
  }
});

export default router;
