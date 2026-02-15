import { Router } from "express";
import { generateChatResponseWithHistory } from "../lib/fileSearch";
import { addMessage, getHistory, getSession } from "../lib/sessionManager";
import { SupportedLanguage, LANGUAGE_NAMES } from "../lib/language";

const router = Router();

/**
 * POST /api/chat/stream - Streaming chat endpoint
 * Returns response as Server-Sent Events (SSE)
 */
router.post("/", async (req, res) => {
  try {
    const { message, sessionId, selectedLanguage, mode = 'auto' } = req.body;

    if (!message || typeof message !== "string") {
      res.status(400).json({ error: "Message is required" });
      return;
    }

    // Setup SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sid = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
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

    // Stream response in chunks (simulate streaming)
    const words = result.response.split(' ');
    let streamedContent = '';

    for (let i = 0; i < words.length; i++) {
      streamedContent += (i > 0 ? ' ' : '') + words[i];
      
      res.write(`data: ${JSON.stringify({ 
        type: 'chunk', 
        content: streamedContent,
        isComplete: i === words.length - 1
      })}\n\n`);

      // Small delay between chunks for natural feel
      if (i < words.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    // Send final metadata
    res.write(`data: ${JSON.stringify({ 
      type: 'complete', 
      detectedLanguage: result.detectedLang,
      targetLanguage: result.targetLang,
      responseTime: result.responseTime 
    })}\n\n`);

    // Save to session (now async)
    await addMessage(sid, "user", message, {
      language: result.detectedLang,
      source: "stream",
    });
    await addMessage(sid, "model", result.response, {
      language: result.targetLang,
      source: "stream",
    });

    res.end();

  } catch (error) {
    console.error("Streaming error:", error);
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to generate response' })}\n\n`);
    res.end();
  }
});

export default router;
