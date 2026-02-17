import { Router } from "express";
import { generateChatResponseWithHistory } from "../lib/fileSearch";
import { addMessage, getHistory, getSession } from "../lib/sessionManager";
import { SupportedLanguage, LANGUAGE_NAMES, detectLanguage } from "../lib/language";
import { recordMessage } from "../lib/analytics";
import { 
  needsOnboarding, 
  getOnboardingState,
  askForName,
  askForCountry,
  askForService,
  askForContact,
  thankYouMessage,
  savePatientName,
  saveNationality,
  saveInterestedServices,
  saveContactMethod,
  createPatientFromSession,
  parseServiceSelection,
  isSkipMessage,
  isValidName,
  extractName,
  COUNTRIES,
  SERVICES,
  createOnboardingRecord
} from "../lib/onboarding";

const router = Router();

// ONBOARDING TOGGLE: Set to true to enable name/country/service/contact questions
const ONBOARDING_ENABLED = false;

// POST /api/chat - Chat with the bot (with session memory and multilingual support)
// Mode: 'auto' = detect from message, 'manual' = use selected language
router.post("/", async (req, res) => {
  const startTime = Date.now();
  const { message, sessionId, selectedLanguage, mode = 'auto' } = req.body;
  let sid = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log("[API] Chat request received:", message);
    console.log("[API] Session ID:", sessionId || "(new session)");
    console.log("[API] Mode:", mode, "Selected:", selectedLanguage);

    if (!message || typeof message !== "string") {
      res.status(400).json({ error: "Message is required" });
      return;
    }
    
    // Check if this is first message - need onboarding
    const onboardingState = await getOnboardingState(sid);
    const detectedLang = await detectLanguage(message);
    const lang: "en" | "th" | "ko" | "zh" = (["th", "ko", "zh"].includes(detectedLang) ? detectedLang : "en") as "th" | "ko" | "zh" | "en";
    
    // Handle "start" message (trigger from frontend for new session)
    const isStartMessage = message.toLowerCase().trim() === 'start';
    
    // Handle onboarding flow (SKIP if disabled)
    if (ONBOARDING_ENABLED && (onboardingState.step === "none" || isStartMessage)) {
      // First time - ask for name
      const response = askForName(lang);
      
      // Save session first (this creates the session in Supabase)
      await addMessage(sid, "model", response, { language: detectedLang, source: "api" });
      
      // Then create onboarding record
      await createOnboardingRecord(sid);
      
      res.json({
        response,
        sessionId: sid,
        detectedLanguage: detectedLang,
        targetLanguage: detectedLang,
        languageName: LANGUAGE_NAMES[detectedLang],
        mode: "onboarding_name",
      });
      return;
    }
    
    if (ONBOARDING_ENABLED && (onboardingState.step === "asked_name" || 
        (!onboardingState.patientName))) {
      // User is providing name
      if (isSkipMessage(message)) {
        await savePatientName(sid, `Anonymous-${Date.now().toString().slice(-6)}`);
        const response = askForCountry("there", lang);
        
        await addMessage(sid, "user", message, { language: detectedLang, source: "api" });
        await addMessage(sid, "model", response, { language: detectedLang, source: "api" });
        
        res.json({
          response,
          sessionId: sid,
          detectedLanguage: detectedLang,
          targetLanguage: detectedLang,
          languageName: LANGUAGE_NAMES[detectedLang],
          mode: "onboarding_country",
        });
        return;
      }
      
      // Try to save the name
      const savedName = await savePatientName(sid, message.trim());
      
      // Check if the name is valid
      const extracted = extractName(message.trim());
      if (!extracted || !isValidName(extracted)) {
        // Invalid name - ask again
        const response = askForName(lang, true); // true = retry mode
        
        await addMessage(sid, "user", message, { language: detectedLang, source: "api" });
        await addMessage(sid, "model", response, { language: detectedLang, source: "api" });
        
        res.json({
          response,
          sessionId: sid,
          detectedLanguage: detectedLang,
          targetLanguage: detectedLang,
          languageName: LANGUAGE_NAMES[detectedLang],
          mode: "onboarding_name_retry",
        });
        return;
      }
      
      // Valid name - proceed to country
      const response = askForCountry(savedName || message.trim(), lang);
      
      await addMessage(sid, "user", message, { language: detectedLang, source: "api" });
      await addMessage(sid, "model", response, { language: detectedLang, source: "api" });
      
      res.json({
        response,
        sessionId: sid,
        detectedLanguage: detectedLang,
        targetLanguage: detectedLang,
        languageName: LANGUAGE_NAMES[detectedLang],
        mode: "onboarding_country",
      });
      return;
    }
    
    if (ONBOARDING_ENABLED && (onboardingState.step === "asked_country" || 
        (onboardingState.patientName && !onboardingState.nationality))) {
      // User is providing country
      await saveNationality(sid, message.trim());
      
      const response = askForService(onboardingState.patientName || "there", lang);
      
      await addMessage(sid, "user", message, { language: detectedLang, source: "api" });
      await addMessage(sid, "model", response, { language: detectedLang, source: "api" });
      
      res.json({
        response,
        sessionId: sid,
        detectedLanguage: detectedLang,
        targetLanguage: detectedLang,
        languageName: LANGUAGE_NAMES[detectedLang],
        mode: "onboarding_service",
      });
      return;
    }
    
    if (ONBOARDING_ENABLED && (onboardingState.step === "asked_service" || 
        (!onboardingState.interestedServices))) {
      // User is selecting services
      const services = parseServiceSelection(message);
      if (services) {
        await saveInterestedServices(sid, services);
      }
      
      const response = askForContact(onboardingState.patientName || "there", lang);
      
      await addMessage(sid, "user", message, { language: detectedLang, source: "api" });
      await addMessage(sid, "model", response, { language: detectedLang, source: "api" });
      
      res.json({
        response,
        sessionId: sid,
        detectedLanguage: detectedLang,
        targetLanguage: detectedLang,
        languageName: LANGUAGE_NAMES[detectedLang],
        mode: "onboarding_contact",
      });
      return;
    }
    
    if (ONBOARDING_ENABLED && (onboardingState.step === "asked_contact" || 
        !onboardingState.preferredContact)) {
      // User is providing contact method
      const contactMatch = message.match(/(email|whatsapp|line|kakao|wechat)[\s:]+(.+)/i);
      if (contactMatch) {
        await saveContactMethod(sid, contactMatch[1], contactMatch[2].trim());
      }
      
      // Create patient record
      await createPatientFromSession(sid);
      
      const response = thankYouMessage(onboardingState.patientName || "there", lang);
      
      await addMessage(sid, "user", message, { language: detectedLang, source: "api" });
      await addMessage(sid, "model", response, { language: detectedLang, source: "api" });
      
      // Record analytics
      await recordMessage({
        sessionId: sid,
        language: detectedLang,
        question: "Completed onboarding",
        responseTime: Date.now() - startTime,
        cacheHit: false,
        fileSearchUsed: false,
        error: null,
      });
      
      res.json({
        response,
        sessionId: sid,
        detectedLanguage: detectedLang,
        targetLanguage: detectedLang,
        languageName: LANGUAGE_NAMES[detectedLang],
        mode: "onboarding_complete",
      });
      return;
    }
    
    // Onboarding complete - proceed with normal chat
    const session = await getSession(sid);
    const history = await getHistory(sid);
    
    console.log(`[API] Session ${sid} has ${history.length} previous messages`);
    console.log(`[API] History data:`, JSON.stringify(history.map(m => ({ role: m.role, content: m.content.substring(0, 30) }))));

    // Determine language based on mode
    let forceLanguage: SupportedLanguage | undefined;
    let effectiveMode: 'auto' | 'manual' = mode;
    
    if (mode === 'manual' && selectedLanguage) {
      forceLanguage = selectedLanguage as SupportedLanguage;
      console.log("[API] Manual mode - forcing language:", selectedLanguage);
    } else {
      forceLanguage = undefined;
      console.log("[API] Auto mode - will detect language from message");
    }

    // Generate response with history and multilingual support
    const result = await generateChatResponseWithHistory(
      message, 
      history,
      forceLanguage
    );
    
    const responseTime = Date.now() - startTime;
    
    // Save messages to session
    await addMessage(sid, "user", message, {
      language: result.detectedLang,
      source: "api",
    });
    await addMessage(sid, "model", result.response, {
      language: result.targetLang,
      responseTimeMs: responseTime,
      source: "api",
      availableImages: result.availableImages,
      imageCount: result.imageCount,
    });
    
    // Record analytics
    await recordMessage({
      sessionId: sid,
      language: result.targetLang,
      question: message,
      responseTime,
      cacheHit: result.fromCache || false,
      fileSearchUsed: true,
      error: null,
    });

    console.log("[API] Input language:", result.detectedLang);
    console.log("[API] Target language:", result.targetLang);
    console.log("[API] Mode used:", effectiveMode);
    console.log("[API] Response length:", result.response?.length || 0);
    console.log("[API] Response preview:", result.response?.substring(0, 100) + (result.response?.length > 100 ? "..." : ""));
    console.log("[API] Available images:", result.availableImages?.length || 0);
    console.log("[API] Chat response sent successfully");

    res.json({ 
      response: result.response,
      sessionId: sid,
      detectedLanguage: result.detectedLang,
      targetLanguage: result.targetLang,
      languageName: LANGUAGE_NAMES[result.targetLang],
      translatedQuery: result.translatedQuery,
      mode: effectiveMode,
      selectedLanguage: selectedLanguage || null,
      availableImages: result.availableImages || [],
      imageCount: result.imageCount || 0,
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    await recordMessage({
      sessionId: sid || sessionId || 'unknown',
      language: 'en',
      question: message || '',
      responseTime,
      cacheHit: false,
      fileSearchUsed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    console.error("Chat API Error:", error);
    res.status(500).json({ error: "Failed to generate response" });
  }
});

// GET /api/chat/languages - Get supported languages
router.get("/languages", (_req, res) => {
  res.json({
    languages: [
      { code: "th", name: "Thai", flag: "🇹🇭" },
      { code: "en", name: "English", flag: "🇬🇧" },
      { code: "ko", name: "한국어", flag: "🇰🇷" },
      { code: "zh", name: "中文", flag: "🇨🇳" },
    ],
    default: "en",
  });
});

export default router;
