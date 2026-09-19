import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { z } from "zod";
import {
  transcribeAudio,
  speechToStructuredReferral,
  synthesizeSpeech,
} from "../../engines/voice.engine";
import {
  NIGERIAN_LANGUAGES,
  NigerianLanguage,
} from "../../engines/multilingual.engine";

const router = Router();

// Configure multer for in-memory audio uploads (max 25MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

// Helper to extract audio buffer from either multipart upload or JSON base64 body
function extractAudioInput(req: Request): {
  buffer: Buffer;
  filename?: string;
  mimeType?: string;
  language?: NigerianLanguage;
} {
  // 1. Multipart file upload
  if (req.file?.buffer) {
    const lang = (req.body?.language as NigerianLanguage) || undefined;
    return {
      buffer: req.file.buffer,
      filename: req.file.originalname,
      mimeType: req.file.mimetype,
      language: lang,
    };
  }

  // 2. Base64 string in JSON body
  const base64Data = req.body?.audio || req.body?.audioBase64 || req.body?.file;
  if (typeof base64Data === "string" && base64Data.length > 0) {
    const cleanBase64 = base64Data.replace(/^data:audio\/[a-z0-9]+;base64,/, "");
    const format = req.body?.format || "webm";
    const lang = (req.body?.language as NigerianLanguage) || undefined;
    return {
      buffer: Buffer.from(cleanBase64, "base64"),
      filename: `audio_${Date.now()}.${format}`,
      mimeType: `audio/${format}`,
      language: lang,
    };
  }

  throw new Error("No audio provided. Send multipart file in 'audio' field or JSON '{ audio: \"<base64>\" }'");
}

// ─── GET /api/voice/languages ────────────────────────────────────────────────
router.get("/languages", (_req: Request, res: Response) => {
  res.json({
    supportedLanguages: Object.values(NIGERIAN_LANGUAGES),
    defaultLanguage: "en",
    description: "The four primary Nigerian languages supported for Speech-to-Text and Text-to-Speech in ReferralOS",
  });
});

// ─── POST /api/voice/transcribe (Speech-to-Text) ─────────────────────────────
router.post(
  "/transcribe",
  upload.single("audio"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const audio = extractAudioInput(req);
      const result = await transcribeAudio({
        audioBuffer: audio.buffer,
        filename: audio.filename,
        mimeType: audio.mimeType,
        language: audio.language,
        prompt: req.body?.prompt,
      });

      const langInfo =
        NIGERIAN_LANGUAGES[result.detectedLanguage as NigerianLanguage] ||
        NIGERIAN_LANGUAGES.en;

      res.json({
        text: result.text,
        language: result.detectedLanguage,
        languageName: langInfo.name,
        bcp47: langInfo.bcp47,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/voice/speech-to-referral (End-to-End Voice Intake) ─────────────
router.post(
  "/speech-to-referral",
  upload.single("audio"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const audio = extractAudioInput(req);
      const result = await speechToStructuredReferral({
        audioBuffer: audio.buffer,
        filename: audio.filename,
        mimeType: audio.mimeType,
        language: audio.language,
      });

      res.json({
        transcript: result.transcript,
        spokenLanguage: result.spokenLanguage,
        englishText: result.englishText,
        wasTranslated: result.wasTranslated,
        structuredReferral: result.structuredReferral,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/voice/text-to-speech (Speech Synthesis) ───────────────────────
const TtsSchema = z.object({
  text: z.string().min(1),
  language: z.enum(["en", "yo", "ha", "ig"]).default("en"),
  voice: z.string().optional(),
});

router.post("/text-to-speech", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = TtsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { text, language, voice } = parsed.data;
    const result = await synthesizeSpeech(text, language as NigerianLanguage, voice);

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Alias
router.post("/synthesize", (req, res, next) => {
  (router as any).handle({ ...req, url: "/text-to-speech", method: "POST" }, res, next);
});

export default router;
