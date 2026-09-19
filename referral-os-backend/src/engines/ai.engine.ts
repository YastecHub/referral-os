import { Capability, UrgencyTier } from "@prisma/client";
import { env } from "../config/env";
import { StructuredNotes } from "../types";

// ─── Prompts ──────────────────────────────────────────────────────────────────

const STRUCTURE_PROMPT = (rawNotes: string) =>
  `You are a clinical triage assistant for a Nigerian emergency referral system.
Extract structured information from these raw clinical notes and return ONLY valid JSON.

Raw notes: "${rawNotes}"

Return this exact JSON shape (no markdown, no explanation):
{
  "patientName": "patient full name if mentioned or null",
  "patientSummary": "clean 1-2 sentence clinical summary",
  "patientAge": <number or null>,
  "patientGender": "Male" | "Female" | null,
  "chiefComplaint": "primary presenting complaint",
  "clinicalFindings": "key clinical findings",
  "urgencyTier": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "urgencyReason": "one sentence reason for urgency tier",
  "requiredCapability": "OBSTETRIC_EMERGENCY" | "BLOOD_BANK" | "THEATRE" | "NICU" | "ICU" | "DIALYSIS" | "TRAUMA" | "PAEDIATRICS",
  "requiredCapabilities": ["one or more capabilities such as: Emergency obstetric, Blood transfusion, Theater, Maternal ICU, NICU, PICU, Pediatric emergency, Obstetric specialist, Surgery, Burns & trauma"]
}`;

const INSIGHT_PROMPT = (stats: {
  totalReferrals: number;
  completionRate: number;
  avgAcceptanceMinutes: number;
  topRejectionReason: string | null;
  criticalCount: number;
}) =>
  `You are a health systems analyst. Given these referral statistics for a Nigerian emergency maternal referral network, write ONE plain-language insight (2-3 sentences, no jargon) that a hospital administrator would find actionable.

Stats:
- Total referrals: ${stats.totalReferrals}
- Completion rate: ${stats.completionRate.toFixed(1)}%
- Average time to acceptance: ${stats.avgAcceptanceMinutes.toFixed(0)} minutes
- Top rejection reason: ${stats.topRejectionReason ?? "N/A"}
- Critical urgency cases: ${stats.criticalCount}

Return only the insight text, no labels or formatting.`;

// ─── Fallback: rules-based note structuring ───────────────────────────────────

function fallbackStructure(rawNotes: string): StructuredNotes {
  const lower = rawNotes.toLowerCase();

  const nameMatch = rawNotes.match(/(?:patient(?:\s*name)?(?:\s*:\s*|\s+is\s+)|\b(?:mrs|ms|miss|mr)\.?\s+)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
  const patientName = nameMatch ? nameMatch[1].trim() : null;

  const ageMatch = rawNotes.match(/(\d{1,3})\s*(?:yr|years?\s*old|y\/o)/i);
  const patientAge = ageMatch ? parseInt(ageMatch[1], 10) : null;

  const patientGender = /female|woman|girl|mother|pregnant|gravida|para/i.test(lower)
    ? "Female"
    : /male|man|boy|father/i.test(lower)
    ? "Male"
    : null;

  let urgencyTier: UrgencyTier = UrgencyTier.MEDIUM;
  if (/bleed|haemorrhage|hemorrhage|seizure|eclampsia|shock|collapse|unconscious|asphyxia/i.test(lower))
    urgencyTier = UrgencyTier.CRITICAL;
  else if (/distress|obstructed|prolonged|dropping|urgent|hypertens|severe/i.test(lower))
    urgencyTier = UrgencyTier.HIGH;

  const requiredCapabilities: string[] = [];
  let requiredCapability: Capability = Capability.OBSTETRIC_EMERGENCY;

  if (/bleed|haemorrhage|hemorrhage|obstetric|pregnant|labor|labour|eclampsia/i.test(lower)) {
    requiredCapabilities.push("Emergency obstetric");
  }
  if (/blood|transfus|anemia|anaemia|pcv/i.test(lower)) {
    requiredCapabilities.push("Blood transfusion");
    requiredCapability = Capability.BLOOD_BANK;
  }
  if (/theatre|surgery|surgical|c-section|caesarean|laparotomy/i.test(lower)) {
    requiredCapabilities.push("Theater");
    requiredCapability = Capability.THEATRE;
  }
  if (/maternal icu|icu|intensive care|ventilator/i.test(lower)) {
    requiredCapabilities.push("Maternal ICU");
    requiredCapability = Capability.ICU;
  }
  if (/nicu|preterm|premature|neonat/i.test(lower)) {
    requiredCapabilities.push("NICU");
    requiredCapability = Capability.NICU;
  }
  if (/picu|pediatric emergency|paediatric/i.test(lower)) {
    requiredCapabilities.push("Pediatric emergency");
    requiredCapability = Capability.PAEDIATRICS;
  }
  if (/trauma|burn|accident|fracture/i.test(lower)) {
    requiredCapabilities.push("Burns & trauma");
    requiredCapability = Capability.TRAUMA;
  }

  if (requiredCapabilities.length === 0) {
    requiredCapabilities.push("Emergency obstetric");
  }

  return {
    patientName,
    patientSummary: rawNotes.trim(),
    patientAge,
    patientGender: patientGender ?? "Female",
    chiefComplaint: null,
    clinicalFindings: null,
    urgencyTier,
    urgencyReason: "Assessed by rules-based triage engine",
    requiredCapability,
    requiredCapabilities,
  };
}

function fallbackInsight(stats: {
  completionRate: number;
  avgAcceptanceMinutes: number;
  topRejectionReason: string | null;
}): string {
  const parts: string[] = [];
  if (stats.completionRate < 70)
    parts.push(`Referral completion rate is ${stats.completionRate.toFixed(0)}% — below the 70% target.`);
  else
    parts.push(`Referral completion rate is ${stats.completionRate.toFixed(0)}%, meeting the network target.`);

  if (stats.avgAcceptanceMinutes > 30)
    parts.push(`Average acceptance time of ${stats.avgAcceptanceMinutes.toFixed(0)} minutes suggests delays in hospital response.`);

  if (stats.topRejectionReason)
    parts.push(`The most common rejection reason is "${stats.topRejectionReason}" — consider targeted capacity planning.`);

  return parts.join(" ");
}

// ─── Groq ─────────────────────────────────────────────────────────────────────

async function callGroq(prompt: string, json: boolean): Promise<string> {
  const Groq = (await import("groq-sdk")).default;
  const client = new Groq({ apiKey: env.GROQ_API_KEY });

  // Try active models available on this Groq account
  const models = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"];
  let lastError: unknown = null;

  for (const model of models) {
    try {
      const response = await client.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: json ? 1500 : 500,
        ...(json && { response_format: { type: "json_object" } }),
      });

      return response.choices[0].message.content ?? "";
    } catch (err: unknown) {
      lastError = err;
      const status = (err as { status?: number }).status;
      const code = (err as { error?: { code?: string } }).error?.code;
      if (
        status === 404 ||
        code === "model_not_found" ||
        code === "json_validate_failed" ||
        status === 400
      ) {
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}

// ─── Claude ───────────────────────────────────────────────────────────────────

async function callClaude(prompt: string): Promise<string> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model: "claude-3-5-haiku-20241022",
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });

  return message.content[0].type === "text" ? message.content[0].text : "";
}

// ─── OpenAI ───────────────────────────────────────────────────────────────────

async function callOpenAI(prompt: string, json: boolean): Promise<string> {
  const OpenAI = (await import("openai")).default;
  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 512,
    ...(json && { response_format: { type: "json_object" } }),
  });

  return response.choices[0].message.content ?? "";
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

async function callLLM(prompt: string, json = false): Promise<string> {
  if (env.AI_PROVIDER === "groq" && env.GROQ_API_KEY)
    return callGroq(prompt, json);
  if (env.AI_PROVIDER === "claude" && env.ANTHROPIC_API_KEY)
    return callClaude(prompt);
  if (env.AI_PROVIDER === "openai" && env.OPENAI_API_KEY)
    return callOpenAI(prompt, json);
  throw new Error("No AI provider configured");
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function structureNotes(rawNotes: string): Promise<StructuredNotes> {
  try {
    const text = await callLLM(STRUCTURE_PROMPT(rawNotes), true);
    return JSON.parse(text) as StructuredNotes;
  } catch (err) {
    console.warn("[AI] structureNotes failed, using fallback:", (err as Error).message);
    return fallbackStructure(rawNotes);
  }
}

export async function generateAnalyticsInsight(stats: {
  totalReferrals: number;
  completionRate: number;
  avgAcceptanceMinutes: number;
  topRejectionReason: string | null;
  criticalCount: number;
}): Promise<string> {
  try {
    return await callLLM(INSIGHT_PROMPT(stats), false);
  } catch (err) {
    console.warn("[AI] generateAnalyticsInsight failed, using fallback:", (err as Error).message);
    return fallbackInsight(stats);
  }
}
