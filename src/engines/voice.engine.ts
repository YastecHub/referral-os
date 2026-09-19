import fs from "fs";
import path from "path";
import os from "os";
import { env } from "../config/env";
import { structureNotes } from "./ai.engine";
import {
  translateClinicalText,
  NigerianLanguage,
  NIGERIAN_LANGUAGES,
} from "./multilingual.engine";
import { StructuredNotes } from "../types";

export interface TranscriptionOptions {
  audioBuffer: Buffer;
  filename?: string;
  mimeType?: string;
  language?: NigerianLanguage | "auto";
  prompt?: string;
}

export interface TranscriptionResult {
  text: string;
  detectedLanguage: string;
  durationSeconds?: number;
  segments?: Array<{ text: string; start: number; end: number }>;
}

export interface SpeechToReferralResult {
  transcript: string;
  spokenLanguage: NigerianLanguage | string;
  englishText: string;
  wasTranslated: boolean;
  structuredReferral: StructuredNotes & {
    urgencyLabel: "Emergency" | "Urgent" | "Routine";
  };
}

export interface SpeechSynthesisResult {
  audioBase64: string | null;
  mimeType: string;
  provider: "openai" | "browser-native";
  webSpeechConfig: {
    text: string;
    lang: string;
    bcp47: string;
    rate: number;
    pitch: number;
    recommendedVoiceHint: string;
  };
}

// ─── Transcribe Audio (Groq Whisper-large-v3) ──────────────────────────────────

export async function transcribeAudio(
  options: TranscriptionOptions
): Promise<TranscriptionResult> {
  const Groq = (await import("groq-sdk")).default;
  const client = new Groq({ apiKey: env.GROQ_API_KEY });

  // Resolve extension
  let ext = ".webm";
  if (options.filename) {
    ext = path.extname(options.filename) || ".webm";
  } else if (options.mimeType?.includes("wav")) {
    ext = ".wav";
  } else if (options.mimeType?.includes("mp3")) {
    ext = ".mp3";
  } else if (options.mimeType?.includes("m4a")) {
    ext = ".m4a";
  } else if (options.mimeType?.includes("ogg")) {
    ext = ".ogg";
  }

  // Write audio buffer to temp file
  const tempPath = path.join(os.tmpdir(), `referral_audio_${Date.now()}_${Math.random().toString(36).slice(2, 7)}${ext}`);
  await fs.promises.writeFile(tempPath, options.audioBuffer);

  try {
    const langCode = options.language && options.language !== "auto" ? options.language : undefined;
    const clinicalPrompt =
      options.prompt ||
      "Nigerian emergency clinical maternal referral. English, Yoruba, Hausa, Igbo medical symptoms, blood loss, patient names, vitals.";

    // Try whisper-large-v3, fallback to whisper-large-v3-turbo
    const whisperModels = ["whisper-large-v3", "whisper-large-v3-turbo"];
    let transcriptionText = "";
    let detectedLang = langCode || "en";

    for (const model of whisperModels) {
      try {
        const fileStream = fs.createReadStream(tempPath);
        const res = await client.audio.transcriptions.create({
          file: fileStream,
          model,
          language: langCode,
          prompt: clinicalPrompt,
          response_format: "verbose_json",
        });

        transcriptionText = res.text?.trim() || "";
        detectedLang = (res as any).language || langCode || "en";
        if (transcriptionText) break;
      } catch (err: any) {
        if (err?.status === 404 || err?.error?.code === "model_not_found") continue;
        throw err;
      }
    }

    if (!transcriptionText) {
      // If whisper returned empty, return fallback informative response
      transcriptionText = "Emergency referral voice note recorded";
    }

    return {
      text: transcriptionText,
      detectedLanguage: detectedLang,
    };
  } finally {
    // Clean up temporary file
    try {
      await fs.promises.unlink(tempPath);
    } catch {}
  }
}

// ─── Speech to Structured Referral ─────────────────────────────────────────────

export async function speechToStructuredReferral(
  options: TranscriptionOptions
): Promise<SpeechToReferralResult> {
  // 1. Transcribe audio
  const transcription = await transcribeAudio(options);
  const transcript = transcription.text;
  let detectedLang = (transcription.detectedLanguage?.toLowerCase() || options.language || "en") as NigerianLanguage;

  if (!["en", "yo", "ha", "ig"].includes(detectedLang)) {
    detectedLang = "en";
  }

  // 2. If spoken in Yoruba, Hausa, or Igbo, translate to English for clinical accuracy
  let englishText = transcript;
  let wasTranslated = false;

  if (detectedLang !== "en") {
    const translation = await translateClinicalText(transcript, "en", detectedLang);
    englishText = translation.translatedText;
    wasTranslated = true;
  }

  // 3. Structure into ReferralOS fields using AI clinical triage engine
  const structured = await structureNotes(englishText);

  const urgencyLabel =
    structured.urgencyTier === "CRITICAL"
      ? "Emergency"
      : structured.urgencyTier === "HIGH"
      ? "Urgent"
      : "Routine";

  return {
    transcript,
    spokenLanguage: detectedLang,
    englishText,
    wasTranslated,
    structuredReferral: {
      ...structured,
      urgencyLabel,
    },
  };
}

// ─── Text-to-Speech (TTS) Synthesis ───────────────────────────────────────────

export async function synthesizeSpeech(
  text: string,
  language: NigerianLanguage = "en",
  voice?: string
): Promise<SpeechSynthesisResult> {
  const langInfo = NIGERIAN_LANGUAGES[language] || NIGERIAN_LANGUAGES.en;

  // If OpenAI API key is available, generate backend MP3 audio
  if (env.OPENAI_API_KEY) {
    try {
      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

      const mp3 = await openai.audio.speech.create({
        model: "tts-1",
        voice: (voice as any) || "alloy",
        input: text.slice(0, 4000),
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());
      return {
        audioBase64: buffer.toString("base64"),
        mimeType: "audio/mpeg",
        provider: "openai",
        webSpeechConfig: {
          text,
          lang: langInfo.bcp47,
          bcp47: langInfo.bcp47,
          rate: 0.95,
          pitch: 1.0,
          recommendedVoiceHint: langInfo.speechSynthesisVoiceHint,
        },
      };
    } catch (_err) {
      // Fallback to browser-native config
    }
  }

  // Browser-native TTS configuration (zero external API dependency, runs on client Web Speech API)
  return {
    audioBase64: null,
    mimeType: "audio/wav",
    provider: "browser-native",
    webSpeechConfig: {
      text,
      lang: langInfo.bcp47,
      bcp47: langInfo.bcp47,
      rate: 0.95,
      pitch: 1.0,
      recommendedVoiceHint: langInfo.speechSynthesisVoiceHint,
    },
  };
}
