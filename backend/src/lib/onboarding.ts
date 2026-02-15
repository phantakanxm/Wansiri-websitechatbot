/**
 * Onboarding Manager - จัดการการเก็บข้อมูลลูกค้าใหม่
 */

import { supabase, isSupabaseEnabled } from "./supabase";

interface OnboardingState {
  step: "none" | "asked_name" | "asked_country" | "asked_service" | "asked_contact" | "completed";
  attempts: number;
  patientName?: string;
  nationality?: string;
  interestedServices?: string[];
  preferredContact?: string;
}

const SERVICES = [
  { code: "srs", name: { en: "SRS (Sex Reassignment Surgery)", th: "SRS (การผ่าตัดแปลงเพศ)", ko: "SRS (성전환 수술)" } },
  { code: "consultation", name: { en: "Consultation Only", th: "ปรึกษาก่อนตัดสินใจ", ko: "상담" } },
];

const COUNTRIES = [
  { code: "thailand", name: { en: "🇹🇭 Thailand", th: "🇹🇭 ไทย", ko: "🇹🇭 태국" } },
  { code: "korea", name: { en: "🇰🇷 Korea", th: "🇰🇷 เกาหลี", ko: "🇰🇷 한국" } },
  { code: "english", name: { en: "🇬🇧 UK/English", th: "🇬🇧 อังกฤษ", ko: "🇬🇧 영국" } },
  { code: "other", name: { en: "🌏 Other", th: "🌏 อื่นๆ", ko: "🌏 기타" } },
];

/**
 * ดึง state การ onboard จาก onboarding_sessions
 */
export async function getOnboardingState(sessionId: string): Promise<OnboardingState> {
  if (!isSupabaseEnabled()) {
    return { step: "completed", attempts: 0 };
  }

  try {
    // หา session_id จาก sessions table ก่อน
    const { data: session } = await supabase!
      .from("sessions")
      .select("id")
      .eq("session_key", sessionId)
      .single();

    if (!session) return { step: "none", attempts: 0 };

    // ดึง onboarding state
    const { data: onboarding } = await supabase!
      .from("onboarding_sessions")
      .select("*")
      .eq("session_id", session.id)
      .single();

    if (!onboarding) return { step: "none", attempts: 0 };

    // ถ้า completed
    if (onboarding.step === "completed") {
      return {
        step: "completed",
        attempts: 0,
        patientName: onboarding.patient_name,
        nationality: onboarding.nationality,
        interestedServices: onboarding.interested_services || [],
        preferredContact: onboarding.preferred_contact_method,
      };
    }

    // ถ้ากำลัง onboarding
    return {
      step: onboarding.step,
      attempts: 1,
      patientName: onboarding.patient_name,
      nationality: onboarding.nationality,
      interestedServices: onboarding.interested_services || [],
      preferredContact: onboarding.preferred_contact_method,
    };
  } catch (error) {
    console.error("[Onboarding] Error:", error);
    return { step: "none", attempts: 0 };
  }
}

/**
 * สร้าง onboarding record ใหม่ (เรียกตอนเริ่มถามชื่อครั้งแรก)
 */
export async function createOnboardingRecord(sessionId: string): Promise<void> {
  if (!isSupabaseEnabled()) {
    console.log("[Onboarding] Supabase not enabled");
    return;
  }

  try {
    console.log("[Onboarding] Creating record for session:", sessionId);
    const sessionUuid = await getSessionUuid(sessionId);
    if (!sessionUuid) {
      console.log("[Onboarding] Session not found:", sessionId);
      return;
    }
    console.log("[Onboarding] Found session UUID:", sessionUuid);

    // Check if already exists
    const { data: existing } = await supabase!
      .from("onboarding_sessions")
      .select("id")
      .eq("session_id", sessionUuid)
      .single();

    if (existing) {
      console.log("[Onboarding] Record already exists");
      return;
    }

    // Create new record
    const { data, error } = await supabase!
      .from("onboarding_sessions")
      .insert({
        session_id: sessionUuid,
        step: "asked_name"
      })
      .select();

    if (error) {
      console.error("[Onboarding] Error creating record:", error);
    } else {
      console.log("[Onboarding] Record created:", data);
    }
  } catch (error) {
    console.error("[Onboarding] Error creating record:", error);
  }
}

/**
 * ตรวจสอบว่าต้องถามข้อมูลก่อนไหม
 */
export async function needsOnboarding(sessionId: string): Promise<boolean> {
  const state = await getOnboardingState(sessionId);
  return state.step !== "completed";
}

/**
 * ถอดคำนำหน้าออกจากชื่อ (I'm, My name is, etc.)
 */
export function extractName(message: string): string | null {
  const patterns = [
    // English patterns
    /(?:^|\s)(?:i['']?m|my name is|i am|call me|name[\s:]+)\s+(.+?)(?:\s|$|[.!?,])/i,
    // Thai patterns  
    /(?:ชื่อ|ฉันชื่อ|ผมชื่อ|ดิฉันชื่อ|หนูชื่อ|ชื่อเล่น|เรียก)\s*[:\s]*(.+?)(?:\s|$|[.!?,])/i,
    // Korean patterns
    /(?:이름|성함|제 이름은|저는)\s*[:\s]*(.+?)(?:\s|$|[.!?,])/i,
    // Simple: just the name if it's 2-30 chars
    /^[\p{L}\s'-]{2,30}$/u,
  ];

  for (const pattern of patterns.slice(0, -1)) {
    const match = message.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  // If simple pattern matches (just a name)
  if (patterns[patterns.length - 1].test(message.trim())) {
    return message.trim();
  }

  return null;
}

/**
 * ตรวจสอบว่าเป็นคำตอบที่ดีหรือไม่ (ไม่ใช่คำหยาบ, ไม่ใช่ความยาวผิดปกติ)
 */
export function isValidName(name: string): boolean {
  // Must be 2-30 characters
  if (name.length < 2 || name.length > 30) return false;
  
  // Should contain at least one letter
  if (!/[\p{L}]/u.test(name)) return false;
  
  // Should not be all numbers or symbols
  if (!/[a-zA-Z\u0E00-\u0E7F\uAC00-\uD7AF]/u.test(name)) return false;
  
  return true;
}

/**
 * สร้างข้อความถามชื่อ (3 ภาษา)
 */
export function askForName(lang: "en" | "th" | "ko" = "en", isRetry: boolean = false): string {
  const messages = {
    en: isRetry 
      ? `Sorry, I didn't quite get that. Could you please tell me your name?

[You can type "skip" to remain anonymous]`
      : `👋 Hello! I'm Wansiri Hospital assistant.

May I know your name? This helps me personalize our conversation.

[You can type "skip" if you prefer to remain anonymous]`,
    
    th: isRetry
      ? `ขอโทษค่ะ ฉันไม่เข้าใจ กรุณาบอกชื่อของคุณอีกครั้งได้ไหมคะ?

[พิมพ์ "ข้าม" หากไม่สะดวกบอกชื่อ]`
      : `👋 สวัสดีค่ะ ดิฉันเป็นผู้ช่วยของโรงพยาบาลวรรณสิริ

ขอทราบชื่อของคุณหน่อยได้ไหมคะ? เพื่อให้การสนทนาเป็นกันเองมากขึ้น

[พิมพ์ "ข้าม" หากไม่สะดวกบอกชื่อ]`,
    
    ko: isRetry
      ? `죄송합니다. 이름을 다시 알려주시겠어요?

[익명을 원하시면 "걸너뛰기"를 입력하세요]`
      : `👋 안녕하세요! 완시리 병원 챗봇입니다.

성함을 알려주시겠어요? 더 나은 상담을 위해 도움이 됩니다.

[익명을 원하시면 "걸너뛰기"를 입력하세요]`,
  };
  
  return messages[lang];
}

/**
 * สร้างข้อความถามประเทศ
 */
export function askForCountry(name: string, lang: "en" | "th" | "ko" = "en"): string {
  const countryList = COUNTRIES.map((c, i) => `${i + 1}. ${c.name[lang]}`).join("\n");
  
  const messages = {
    en: `Nice to meet you, ${name}! 😊

Which country are you from?

${countryList}

[Please type the number 1-4]`,
    
    th: `ยินดีที่ได้รู้จักคุณ${name}ค่ะ! 😊

คุณมาจากประเทศไหนคะ?

${countryList}

[กรุณาพิมพ์ตัวเลข 1-4]`,
    
    ko: `만나서 반갑습니다, ${name}님! 😊

어느 나라에서 오셨나요?

${countryList}

[번호 1-4를 입력해주세요]`,
  };
  
  return messages[lang];
}

/**
 * สร้างข้อความถามบริการที่สนใจ
 */
export function askForService(name: string, lang: "en" | "th" | "ko" = "en"): string {
  const serviceList = SERVICES.map((s, i) => `${i + 1}. ${s.name[lang]}`).join("\n");
  
  const messages = {
    en: `Thank you, ${name}! 

Which procedure are you interested in?

${serviceList}

[You can select multiple by typing numbers separated by comma, e.g., "1,2"]`,
    
    th: `ขอบคุณค่ะคุณ${name}!

คุณสนใจบริการไหนคะ?

${serviceList}

[เลือกหลายรายการได้โดยพิมพ์ตัวเลขคั่นด้วยลูกน้ำ เช่น "1,2"]`,
    
    ko: `감사합니다, ${name}님!

어떤 시술에 관심이 있으신가요?

${serviceList}

[여러 개 선택하려면 쉼표로 구분하여 번호를 입력하세요. 예: "1,2"]`,
  };
  
  return messages[lang];
}

/**
 * สร้างข้อความถามช่องทางติดต่อ
 */
export function askForContact(name: string, lang: "en" | "th" | "ko" = "en"): string {
  const messages = {
    en: `Great, ${name}! 

What's your preferred contact method for our staff to follow up?

📧 Email
📱 WhatsApp
💬 Line
💬 KakaoTalk
💬 WeChat

[Please type your choice and your contact info]
Example: "WhatsApp +1234567890"`,
    
    th: `เยี่ยมเลยค่ะคุณ${name}!

คุณสะดวกให้เจ้าหน้าที่ติดต่อกลับทางไหนคะ?

📧 Email
📱 WhatsApp
💬 Line
💬 KakaoTalk
💬 WeChat

[กรุณาพิมพ์ช่องทางและข้อมูลติดต่อ]
ตัวอย่าง: "WhatsApp +66123456789"`,
    
    ko: `좋습니다, ${name}님!

상담원이 연락드릴 연락처를 알려주세요.

📧 Email
📱 WhatsApp
💬 Line
💬 KakaoTalk
💬 WeChat

[연락 방법과 연락처를 입력해주세요]
예시: "WhatsApp +821012345678"`,
  };
  
  return messages[lang];
}

/**
 * สร้างข้อความขอบคุณเมื่อเสร็จสิ้น
 */
export function thankYouMessage(name: string, lang: "en" | "th" | "ko" = "en"): string {
  const messages = {
    en: `Thank you, ${name}! 🎉

Our team will contact you within 24 hours.

In the meantime, feel free to ask me any questions about our services!`,
    
    th: `ขอบคุณค่ะคุณ${name}! 🎉

ทีมงานของเราจะติดต่อกลับภายใน 24 ชั่วโมง

ระหว่างนี้ถ้ามีคำถามเกี่ยวกับบริการ สามารถสอบถามฉันได้เลยค่ะ!`,
    
    ko: `감사합니다, ${name}님! 🎉

24시간 이내에 담당자가 연락드리겠습니다.

그동안 서비스에 대해 궁금한 점이 있으시면 언제든지 물어보세요!`,
  };
  
  return messages[lang];
}

/**
 * Helper: หา session UUID จาก session_key
 */
async function getSessionUuid(sessionKey: string): Promise<string | null> {
  if (!isSupabaseEnabled()) return null;
  
  const { data } = await supabase!
    .from("sessions")
    .select("id")
    .eq("session_key", sessionKey)
    .single();
  
  return data?.id || null;
}

/**
 * Helper: สร้างหรือดึง onboarding record
 */
async function getOrCreateOnboarding(sessionKey: string) {
  const sessionUuid = await getSessionUuid(sessionKey);
  if (!sessionUuid) return null;
  
  const { data: existing } = await supabase!
    .from("onboarding_sessions")
    .select("*")
    .eq("session_id", sessionUuid)
    .single();
  
  if (existing) return existing;
  
  // สร้างใหม่
  const { data: created } = await supabase!
    .from("onboarding_sessions")
    .insert({ session_id: sessionUuid, step: "asked_name" })
    .select()
    .single();
  
  return created;
}

/**
 * บันทึกชื่อลง onboarding_sessions
 * พร้อมถอดคำนำหน้าและ validate
 */
export async function savePatientName(sessionId: string, rawMessage: string): Promise<string> {
  if (!isSupabaseEnabled()) return rawMessage;

  try {
    const onboarding = await getOrCreateOnboarding(sessionId);
    if (!onboarding) return rawMessage;

    // Try to extract name from message
    let extractedName = extractName(rawMessage);
    
    // If extraction failed or invalid, use raw message
    if (!extractedName || !isValidName(extractedName)) {
      // Check if it's skip message
      if (isSkipMessage(rawMessage)) {
        extractedName = `Anonymous-${Date.now().toString().slice(-6)}`;
      } else if (isValidName(rawMessage.trim())) {
        extractedName = rawMessage.trim();
      } else {
        // Return the invalid input so caller can ask again
        return rawMessage;
      }
    }

    await supabase!
      .from("onboarding_sessions")
      .update({ 
        patient_name: extractedName,
        step: "asked_country"
      })
      .eq("id", onboarding.id);
    
    return extractedName;
  } catch (error) {
    console.error("[Onboarding] Error saving name:", error);
    return rawMessage;
  }
}

/**
 * บันทึกประเทศลง onboarding_sessions
 * รองรับทั้งชื่อประเทศและตัวเลข 1-4
 */
export async function saveNationality(sessionId: string, country: string): Promise<void> {
  if (!isSupabaseEnabled()) return;

  try {
    const onboarding = await getOrCreateOnboarding(sessionId);
    if (!onboarding) return;

    // Check if input is a number (1-4)
    const numInput = parseInt(country.trim());
    if (!isNaN(numInput) && numInput >= 1 && numInput <= 4) {
      const selectedCountry = COUNTRIES[numInput - 1];
      if (selectedCountry) {
        await supabase!
          .from("onboarding_sessions")
          .update({ 
            nationality: selectedCountry.code,
            step: "asked_service"
          })
          .eq("id", onboarding.id);
        return;
      }
    }

    // Map common inputs to standard codes
    const countryMap: Record<string, string> = {
      "korea": "korea",
      "korean": "korea",
      "south korea": "korea",
      "เกาหลี": "korea",
      "เกาหลีใต้": "korea",
      "한국": "korea",
      "uk": "english",
      "united kingdom": "english",
      "british": "english",
      "england": "english",
      "english": "english",
      "อังกฤษ": "english",
      "영국": "english",
      "thailand": "thailand",
      "ไทย": "thailand",
      "태국": "thailand",
      "thai": "thailand",
    };

    const normalizedCountry = countryMap[country.toLowerCase().trim()] || "other";

    await supabase!
      .from("onboarding_sessions")
      .update({ 
        nationality: normalizedCountry,
        step: "asked_service"
      })
      .eq("id", onboarding.id);
  } catch (error) {
    console.error("[Onboarding] Error saving country:", error);
  }
}

/**
 * บันทึกบริการที่สนใจ
 */
export async function saveInterestedServices(
  sessionId: string, 
  serviceIndices: number[]
): Promise<void> {
  if (!isSupabaseEnabled()) return;

  try {
    const onboarding = await getOrCreateOnboarding(sessionId);
    if (!onboarding) return;

    const serviceCodes = serviceIndices
      .map(i => SERVICES[i - 1]?.code)
      .filter(Boolean);

    await supabase!
      .from("onboarding_sessions")
      .update({ 
        interested_services: serviceCodes,
        step: "asked_contact"
      })
      .eq("id", onboarding.id);
  } catch (error) {
    console.error("[Onboarding] Error saving services:", error);
  }
}

/**
 * บันทึกช่องทางติดต่อ
 */
export async function saveContactMethod(
  sessionId: string, 
  method: string,
  contactInfo: string
): Promise<void> {
  if (!isSupabaseEnabled()) return;

  try {
    const onboarding = await getOrCreateOnboarding(sessionId);
    if (!onboarding) return;

    await supabase!
      .from("onboarding_sessions")
      .update({ 
        preferred_contact_method: method.toLowerCase(),
        contact_info: contactInfo,
        step: "completed"
      })
      .eq("id", onboarding.id);
  } catch (error) {
    console.error("[Onboarding] Error saving contact:", error);
  }
}

/**
 * สร้าง lead record เมื่อเสร็จสิ้น onboarding
 * อ่านข้อมูลจาก onboarding_sessions แล้วบันทึกลง leads
 */
export async function createPatientFromSession(sessionId: string): Promise<string | null> {
  if (!isSupabaseEnabled()) return null;

  try {
    // หา session UUID
    const sessionUuid = await getSessionUuid(sessionId);
    if (!sessionUuid) return null;

    // Get onboarding data
    const { data: onboarding } = await supabase!
      .from("onboarding_sessions")
      .select("*")
      .eq("session_id", sessionUuid)
      .single();

    if (!onboarding || !onboarding.patient_name) return null;

    // Check if lead already exists
    const { data: existing } = await supabase!
      .from("leads")
      .select("id")
      .eq("session_id", sessionUuid)
      .single();

    if (existing) return existing.id;

    // Create lead
    const { data: lead, error } = await supabase!
      .from("leads")
      .insert({
        session_id: sessionUuid,
        name: onboarding.patient_name,
        nationality: onboarding.nationality || "unknown",
        interested_services: onboarding.interested_services || [],
        email: onboarding.preferred_contact_method === 'email' ? onboarding.contact_info : null,
        phone: ['whatsapp', 'phone'].includes(onboarding.preferred_contact_method || '') ? onboarding.contact_info : null,
        line_id: onboarding.preferred_contact_method === 'line' ? onboarding.contact_info : null,
        source: "chatbot",
        status: "new",
        chat_summary: `Contact: ${onboarding.preferred_contact_method} - ${onboarding.contact_info}`,
      })
      .select()
      .single();

    if (error) {
      console.error("[Onboarding] Error creating lead:", error);
      return null;
    }

    // Update session with lead_id
    await supabase!
      .from("sessions")
      .update({ lead_id: lead.id })
      .eq("id", sessionUuid);

    return lead.id;
  } catch (error) {
    console.error("[Onboarding] Error creating lead:", error);
    return null;
  }
}

/**
 * ตรวจสอบว่าข้อความเป็นการตอบคำถาม onboarding หรือไม่
 */
export function parseServiceSelection(message: string): number[] | null {
  // Match patterns like "1", "1,2,3", "1 and 2", "breast augmentation"
  const numbers = message.match(/\d+/g);
  if (numbers) {
    return numbers.map(Number).filter(n => n >= 1 && n <= SERVICES.length);
  }
  
  // Check for service names
  const lowerMsg = message.toLowerCase();
  const foundServices: number[] = [];
  
  SERVICES.forEach((service, index) => {
    if (lowerMsg.includes(service.code.replace("_", " "))) {
      foundServices.push(index + 1);
    }
    // Check in all languages
    Object.values(service.name).forEach(name => {
      if (lowerMsg.includes(name.toLowerCase())) {
        foundServices.push(index + 1);
      }
    });
  });
  
  return foundServices.length > 0 ? [...new Set(foundServices)] : null;
}

/**
 * ตรวจสอบว่าข้อความเป็นการข้ามหรือไม่
 */
export function isSkipMessage(message: string): boolean {
  const skipWords = ["skip", "ข้าม", "걸너뛰기", "pass", "no", "ไม่", "아니"];
  return skipWords.some(word => message.toLowerCase().includes(word));
}

export { SERVICES, COUNTRIES };
