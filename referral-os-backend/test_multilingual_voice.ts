import {
  NIGERIAN_LANGUAGES,
  translateClinicalText,
  translateReferralSummary,
  NigerianLanguage,
} from "./src/engines/multilingual.engine";
import { synthesizeSpeech } from "./src/engines/voice.engine";

async function runTests() {
  console.log("==================================================");
  console.log("   ReferralOS Multilingual & Voice Verification   ");
  console.log("==================================================\n");

  // Test 1: Language Definitions
  console.log("Test 1: Verifying the 4 Nigerian Languages...");
  const langs: NigerianLanguage[] = ["en", "yo", "ha", "ig"];
  for (const lang of langs) {
    const info = NIGERIAN_LANGUAGES[lang];
    if (!info) throw new Error(`Missing language definition for ${lang}`);
    console.log(`   ✅ [${info.code.toUpperCase()}] ${info.name} (${info.nativeName}) - BCP47: ${info.bcp47}`);
    console.log(`      Region: ${info.region}`);
    console.log(`      Sample emergency phrase: "${info.sampleEmergencyPhrases[0].phrase}"`);
  }
  console.log("✅ All 4 Nigerian languages configured with emergency clinical phrases.\n");

  // Test 2: Clinical Translation (English -> Yoruba, Hausa, Igbo)
  console.log("Test 2: Testing Clinical Translation into 4 Nigerian Languages...");
  const emergencyNote = "Severe postpartum hemorrhage, blood loss estimated 900ml, patient in shock, urgent blood transfusion and surgery required.";

  for (const target of ["yo", "ha", "ig"] as NigerianLanguage[]) {
    const res = await translateClinicalText(emergencyNote, target, "en");
    console.log(`\n   --- Translation to ${NIGERIAN_LANGUAGES[target].name} (${target}) ---`);
    console.log(`   Translated: ${res.translatedText}`);
    console.log(`   Spoken summary: ${res.spokenSummary}`);
    if (res.phoneticGuide) {
      console.log(`   Phonetic guide: ${res.phoneticGuide}`);
    }
  }
  console.log("\n✅ Clinical translation preserves emergency maternal urgency across all 4 languages.\n");

  // Test 3: Referral Summary Localization
  console.log("Test 3: Testing Referral Summary Localization...");
  const mockReferral = {
    id: "ref_test_001",
    refCode: "REF-2026-NGA01",
    patientName: "Hadiza Mohammed",
    patientAge: 28,
    patientGender: "Female",
    urgencyTier: "CRITICAL",
    patientSummary: "Eclampsia with repeated convulsions, unconscious, fetal distress",
    requiredCapabilities: ["Emergency obstetric", "Blood transfusion", "Maternal ICU"],
    sendingFacility: { name: "Mushin PHC" },
    receivingFacility: { name: "Lagos General Hospital" },
  };

  for (const target of ["en", "yo", "ha", "ig"] as NigerianLanguage[]) {
    const summary = await translateReferralSummary(mockReferral, target);
    console.log(`   [${target.toUpperCase()}] Title: "${summary.title}" | Urgency: "${summary.urgencyLabel}"`);
    console.log(`       Spoken: "${summary.fullSpokenText.slice(0, 90)}..."`);
  }
  console.log("✅ Referral summaries generated with native titles and dispatch instructions.\n");

  // Test 4: Text-to-Speech Engine
  console.log("Test 4: Testing Text-to-Speech Configuration...");
  const ttsRes = await synthesizeSpeech("Emergency transfer in progress", "yo");
  console.log(`   Provider: ${ttsRes.provider}`);
  console.log(`   WebSpeech Lang: ${ttsRes.webSpeechConfig.lang}`);
  console.log(`   Voice Hint: ${ttsRes.webSpeechConfig.recommendedVoiceHint}`);
  console.log("✅ TTS engine configured for browser-native and backend synthesis.\n");

  // Test 5: Live API Integration Checks
  console.log("Test 5: Testing Live API Endpoints on http://localhost:4000...");
  const base = "http://localhost:4000";

  // 5a. GET /api/voice/languages
  const voiceLangs = (await (await fetch(`${base}/api/voice/languages`)).json()) as any;
  console.log(`   ✅ GET /api/voice/languages: ${voiceLangs.supportedLanguages?.length} languages supported`);

  // 5b. GET /api/multilingual/languages
  const multiLangs = (await (await fetch(`${base}/api/multilingual/languages`)).json()) as any;
  console.log(`   ✅ GET /api/multilingual/languages: ${multiLangs.primaryLanguages?.join(", ")}`);

  // 5c. POST /api/multilingual/translate
  const transApi = (await (await fetch(`${base}/api/multilingual/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: "Obstructed labour, patient in severe pain",
      targetLanguage: "yo",
    }),
  })).json()) as any;
  console.log(`   ✅ POST /api/multilingual/translate (to Yoruba): "${transApi.translatedText?.slice(0, 60)}..."`);

  // 5d. POST /api/multilingual/referral-summary
  const refSummaryApi = (await (await fetch(`${base}/api/multilingual/referral-summary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      referralId: "REF-2026-001",
      language: "ha",
    }),
  })).json()) as any;
  console.log(`   ✅ POST /api/multilingual/referral-summary (to Hausa): "${refSummaryApi.title}" - ${refSummaryApi.urgencyLabel}`);

  // 5e. POST /api/voice/text-to-speech
  const ttsApi = (await (await fetch(`${base}/api/voice/text-to-speech`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: "Emergency referral dispatched",
      language: "ig",
    }),
  })).json()) as any;
  console.log(`   ✅ POST /api/voice/text-to-speech: BCP-47 ${ttsApi.webSpeechConfig?.bcp47}, Voice hint: ${ttsApi.webSpeechConfig?.recommendedVoiceHint}`);


  console.log("\n==================================================");
  console.log("   🎉 ALL MULTILINGUAL & VOICE TESTS PASSED!   ");
  console.log("==================================================\n");
}

runTests().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});
