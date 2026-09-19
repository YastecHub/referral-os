import { env } from "../config/env";

export type NigerianLanguage = "en" | "yo" | "ha" | "ig";

export interface LanguageInfo {
  code: NigerianLanguage;
  bcp47: string;
  name: string;
  nativeName: string;
  region: string;
  speechSynthesisVoiceHint: string;
  sampleEmergencyPhrases: {
    phrase: string;
    english: string;
    category: "bleeding" | "labour" | "neonatal" | "general";
  }[];
}

export const NIGERIAN_LANGUAGES: Record<NigerianLanguage, LanguageInfo> = {
  en: {
    code: "en",
    bcp47: "en-NG",
    name: "English",
    nativeName: "English (Nigeria)",
    region: "Nationwide / Official",
    speechSynthesisVoiceHint: "en-NG, en-GB, en-US",
    sampleEmergencyPhrases: [
      {
        phrase: "Severe postpartum bleeding, emergency blood transfusion needed.",
        english: "Severe postpartum bleeding, emergency blood transfusion needed.",
        category: "bleeding",
      },
      {
        phrase: "Patient in obstructed labour secondary to CPD. Theatre required immediately.",
        english: "Patient in obstructed labour secondary to CPD. Theatre required immediately.",
        category: "labour",
      },
      {
        phrase: "Severe neonatal distress with respiratory failure. Immediate NICU admission required.",
        english: "Severe neonatal distress with respiratory failure. Immediate NICU admission required.",
        category: "neonatal",
      },
      {
        phrase: "Emergency transfer in transit. Please prepare triage team and theatre.",
        english: "Emergency transfer in transit. Please prepare triage team and theatre.",
        category: "general",
      },
    ],
  },
  yo: {
    code: "yo",
    bcp47: "yo-NG",
    name: "Yorùbá",
    nativeName: "Èdè Yorùbá",
    region: "South West Nigeria (Lagos, Oyo, Ogun, Osun, Ondo, Ekiti)",
    speechSynthesisVoiceHint: "yo-NG, Google Yoruba, en-NG",
    sampleEmergencyPhrases: [
      {
        phrase: "Aláìlera ní ìjìnlẹ̀ ẹ̀jẹ̀ tó pọ̀ lẹ́yìn ìbí, a nílò ìtúnbọ̀ ẹ̀jẹ̀ kíákíá.",
        english: "Patient has severe postpartum bleeding, emergency blood transfusion needed.",
        category: "bleeding",
      },
      {
        phrase: "Oyún dí pọ̀ lẹ́yìn ìrọbí gígùn, a nílò yàrá iṣẹ́ abẹ lẹ́sẹ̀kẹsẹ̀.",
        english: "Obstructed labour after prolonged contractions, theatre required immediately.",
        category: "labour",
      },
      {
        phrase: "Ọmọ tuntun kò lè mí dáadáa, ẹ tètè gbé lọ sí yàrá ìtọ́jú ọmọ wẹ́wẹ́.",
        english: "Newborn is having respiratory distress, transfer to neonatal ICU immediately.",
        category: "neonatal",
      },
      {
        phrase: "Ọkọ̀ ìrànwọ́ ti wà lójú ọ̀nà pẹ̀lú aláìlera. Ẹ jọ̀wọ́ ẹ pèsè sílẹ̀ fún gbígbà wọlé.",
        english: "Ambulance is in transit with patient. Please prepare reception and triage.",
        category: "general",
      },
    ],
  },
  ha: {
    code: "ha",
    bcp47: "ha-NG",
    name: "Hausa",
    nativeName: "Harshen Hausa",
    region: "Northern Nigeria & Commercial Hubs",
    speechSynthesisVoiceHint: "ha-NG, Google Hausa, en-NG",
    sampleEmergencyPhrases: [
      {
        phrase: "Mai ciki tana zubar da jini sosai bayan haihuwa, ana bukatar karin jini cikin gaggawa.",
        english: "Patient has severe bleeding after birth, emergency blood transfusion needed.",
        category: "bleeding",
      },
      {
        phrase: "Haihuwa ta tsaya saboda matsala, ana bukatar dakin tiyata yanzu.",
        english: "Labour has obstructed, surgical theatre required now.",
        category: "labour",
      },
      {
        phrase: "Jinjirin da aka haifa ba ya numfashi da kyau, a kai shi dakin kulawa na musamman.",
        english: "Newborn is not breathing properly, transfer to NICU special care.",
        category: "neonatal",
      },
      {
        phrase: "Motar daukar marasa lafiya na kan hanya. Don Allah a shirya dakin karbar gaggawa.",
        english: "Ambulance is on the way. Please prepare the emergency intake room.",
        category: "general",
      },
    ],
  },
  ig: {
    code: "ig",
    bcp47: "ig-NG",
    name: "Igbo",
    nativeName: "Asụsụ Igbo",
    region: "South East Nigeria & Commercial Hubs",
    speechSynthesisVoiceHint: "ig-NG, Google Igbo, en-NG",
    sampleEmergencyPhrases: [
      {
        phrase: "Nwanyi mụrụ nwa na-agba ezigbo ọbara, a chọrọ mmịnye ọbara ngwa ngwa.",
        english: "Patient has severe postpartum hemorrhage, urgent blood transfusion needed.",
        category: "bleeding",
      },
      {
        phrase: "Ịmụ nwa akwụsịla kpamkpam, a chọrọ ụlọ ịwa ahụ ozugbo.",
        english: "Labour has completely obstructed, emergency surgery theatre needed immediately.",
        category: "labour",
      },
      {
        phrase: "Nwa ọhụrụ anaghị eku ume nke ọma, kpụga ya n'ụlọ nlekọta pụrụ iche nke ụmụaka.",
        english: "Newborn cannot breathe properly, transfer to neonatal intensive care.",
        category: "neonatal",
      },
      {
        phrase: "Ụgbọ ala ndị ọrịa nọ n'ụzọ na-abịa. Biko kwado ndị ọrụ mberede na ụlọ ọrụ.",
        english: "Ambulance is on the way. Please ready the emergency triage team.",
        category: "general",
      },
    ],
  },
};

// ─── AI Translation Function ──────────────────────────────────────────────────

export interface TranslationResult {
  sourceLanguage: NigerianLanguage | "auto";
  targetLanguage: NigerianLanguage;
  originalText: string;
  translatedText: string;
  phoneticGuide?: string;
  spokenSummary: string;
  bcp47: string;
}

export async function translateClinicalText(
  text: string,
  targetLang: NigerianLanguage,
  sourceLang: NigerianLanguage | "auto" = "auto"
): Promise<TranslationResult> {
  const targetInfo = NIGERIAN_LANGUAGES[targetLang] || NIGERIAN_LANGUAGES.en;

  if (sourceLang === targetLang && targetLang === "en") {
    return {
      sourceLanguage: "en",
      targetLanguage: "en",
      originalText: text,
      translatedText: text,
      spokenSummary: text,
      bcp47: targetInfo.bcp47,
    };
  }

  // Use Groq with medical translation prompt
  try {
    const Groq = (await import("groq-sdk")).default;
    const client = new Groq({ apiKey: env.GROQ_API_KEY });

    const prompt = `You are a medical translator specializing in Nigerian health systems and emergency maternal referrals.
Translate the following clinical text into ${targetInfo.name} (${targetInfo.nativeName}).

CRITICAL INSTRUCTIONS:
1. Preserve medical urgency and clinical fidelity.
2. Use natural, respectful phrasing appropriate for Nigerian healthcare staff and patients.
3. If translating to Yorùbá, include proper tone marks (àmì ohùn) where appropriate.
4. If translating to Hausa, use standard Latin orthography.
5. If translating to Igbo, use standard orthography with diacritics where appropriate.

Text to translate:
"${text}"

Return ONLY a JSON object with this exact structure (no markdown, no other keys):
{
  "detectedSourceLanguage": "en" | "yo" | "ha" | "ig",
  "translatedText": "full accurate translation",
  "spokenSummary": "clear, concise phrase suitable for Text-to-Speech playback (1-2 sentences)",
  "phoneticGuide": "approximate pronunciation guide in plain syllables"
}`;

    const models = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"];
    let content = "";

    for (const model of models) {
      try {
        const response = await client.chat.completions.create({
          model,
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          max_tokens: 1000,
        });
        content = response.choices[0]?.message?.content || "";
        if (content) break;
      } catch (err: any) {
        if (err?.status === 404 || err?.error?.code === "model_not_found") continue;
        throw err;
      }
    }

    if (content) {
      const parsed = JSON.parse(content);
      return {
        sourceLanguage: (parsed.detectedSourceLanguage as NigerianLanguage) || sourceLang,
        targetLanguage: targetLang,
        originalText: text,
        translatedText: parsed.translatedText || text,
        phoneticGuide: parsed.phoneticGuide,
        spokenSummary: parsed.spokenSummary || parsed.translatedText || text,
        bcp47: targetInfo.bcp47,
      };
    }
  } catch (_err) {
    // Fallback to phrase-matching or passthrough
  }

  return fallbackTranslation(text, targetLang, sourceLang);
}

// ─── Referral Summary Translation ────────────────────────────────────────────

export interface TranslatedReferralSummary {
  referralId: string;
  targetLanguage: NigerianLanguage;
  languageName: string;
  bcp47: string;
  title: string;
  patientInfo: string;
  urgencyLabel: string;
  clinicalAction: string;
  dispatchInstruction: string;
  fullSpokenText: string;
}

export async function translateReferralSummary(
  referral: {
    id: string;
    refCode?: string;
    patientName?: string | null;
    patientAge?: number | null;
    patientGender?: string | null;
    urgencyTier?: string;
    patientSummary?: string | null;
    requiredCapabilities?: string[];
    sendingFacility?: { name: string } | null;
    receivingFacility?: { name: string } | null;
  },
  targetLang: NigerianLanguage
): Promise<TranslatedReferralSummary> {
  const langInfo = NIGERIAN_LANGUAGES[targetLang] || NIGERIAN_LANGUAGES.en;
  const isEmergency = referral.urgencyTier === "CRITICAL";

  // Build clean clinical brief in English first
  const patient = `${referral.patientName || "Patient"}, ${referral.patientAge ? referral.patientAge + " years old" : ""}`;
  const caps = referral.requiredCapabilities?.join(", ") || "Emergency care";
  const sending = referral.sendingFacility?.name || "Sending clinic";
  const receiving = referral.receivingFacility?.name || "Receiving hospital";
  const clinicalNotes = referral.patientSummary || "Emergency maternal referral";

  const englishSummary = `Emergency referral ${referral.refCode || referral.id}. Patient ${patient}. Dispatched from ${sending} to ${receiving}. Clinical condition: ${clinicalNotes}. Required: ${caps}.`;

  const translation = await translateClinicalText(englishSummary, targetLang, "en");

  // Localized Titles & Urgency
  const TITLES: Record<NigerianLanguage, { title: string; emergency: string; urgent: string; routine: string }> = {
    en: {
      title: "Emergency Referral Brief",
      emergency: "EMERGENCY — IMMEDIATE ATTENTION",
      urgent: "URGENT",
      routine: "ROUTINE",
    },
    yo: {
      title: "Ìròyìn Ìfiránṣẹ́ Pàjáwìrì",
      emergency: "PÀJÁWÌRÌ — ÌTỌ́JÚ LẸ́SẸ̀KẸSẸ̀",
      urgent: "KÍÁKÍÁ",
      routine: "DÉÈDÈ",
    },
    ha: {
      title: "Rahoton Turawa na Gaggawa",
      emergency: "GAGGAWA — KULA CIKIN GAGGAWA",
      urgent: "DA SAURI",
      routine: "NA YAU DA KULLUM",
    },
    ig: {
      title: "Ozi Nbufe Mberede",
      emergency: "MBEREDE — NLEKỌTA OZUGBO",
      urgent: "NGWA NGWA",
      routine: "NKITI",
    },
  };

  const localizedLabels = TITLES[targetLang] || TITLES.en;
  const urgencyLabel = isEmergency
    ? localizedLabels.emergency
    : referral.urgencyTier === "HIGH"
    ? localizedLabels.urgent
    : localizedLabels.routine;

  return {
    referralId: referral.id,
    targetLanguage: targetLang,
    languageName: langInfo.name,
    bcp47: langInfo.bcp47,
    title: localizedLabels.title,
    patientInfo: `${referral.patientName || "Patient"} (${referral.patientAge || "?"}yo ${referral.patientGender || ""})`,
    urgencyLabel,
    clinicalAction: caps,
    dispatchInstruction: `From ${sending} → To ${receiving}`,
    fullSpokenText: translation.spokenSummary || translation.translatedText,
  };
}

// ─── Rule-Based Fallback ──────────────────────────────────────────────────────

function fallbackTranslation(
  text: string,
  targetLang: NigerianLanguage,
  sourceLang: NigerianLanguage | "auto"
): TranslationResult {
  const targetInfo = NIGERIAN_LANGUAGES[targetLang] || NIGERIAN_LANGUAGES.en;
  const lower = text.toLowerCase();

  let translated = text;

  if (targetLang === "yo") {
    if (lower.includes("bleeding") || lower.includes("blood")) {
      translated = "Aláìlera ní ìṣòro ẹ̀jẹ̀ púpọ̀ lẹ́yìn ìbímọ, ó nílò ìtúnbọ̀ ẹ̀jẹ̀ pàjáwìrì.";
    } else if (lower.includes("labour") || lower.includes("contractions")) {
      translated = "Oyún dí kò lè jáde dáadáa, a nílò yàrá iṣẹ́ abẹ lẹ́sẹ̀kẹsẹ̀.";
    } else if (lower.includes("baby") || lower.includes("neonatal")) {
      translated = "Ọmọ tuntun nílò ìtọ́jú pàjáwìrì ní yàrá àwọn ọmọ wẹ́wẹ́.";
    } else {
      translated = `Ìfiránṣẹ́ aláìlera pàjáwìrì: ${text}`;
    }
  } else if (targetLang === "ha") {
    if (lower.includes("bleeding") || lower.includes("blood")) {
      translated = "Mai haihuwa na zubar da jini sosai, ana bukatar karin jini na gaggawa.";
    } else if (lower.includes("labour") || lower.includes("contractions")) {
      translated = "Haihuwa ta tsaya, ana bukatar dakin tiyata yanzu da gaggawa.";
    } else if (lower.includes("baby") || lower.includes("neonatal")) {
      translated = "Jinjiri na bukatar kulawa ta gaggawa a dakin kulawa na musamman.";
    } else {
      translated = `Turawar gaggawa: ${text}`;
    }
  } else if (targetLang === "ig") {
    if (lower.includes("bleeding") || lower.includes("blood")) {
      translated = "Nwanyi na-agba nnukwu ọbara mgbe ọ mụsịrị nwa, a chọrọ mmịnye ọbara ngwa ngwa.";
    } else if (lower.includes("labour") || lower.includes("contractions")) {
      translated = "Ịmụ nwa akwụsịla, a chọrọ ụlọ ịwa ahụ ngwa ngwa.";
    } else if (lower.includes("baby") || lower.includes("neonatal")) {
      translated = "Nwa ọhụrụ chọrọ nlekọta mberede n'ụlọ nlekọta pụrụ iche.";
    } else {
      translated = `Ozi nbufe mberede: ${text}`;
    }
  }

  return {
    sourceLanguage: sourceLang === "auto" ? "en" : sourceLang,
    targetLanguage: targetLang,
    originalText: text,
    translatedText: translated,
    spokenSummary: translated,
    bcp47: targetInfo.bcp47,
  };
}
