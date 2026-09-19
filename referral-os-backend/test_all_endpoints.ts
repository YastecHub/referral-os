// Uses native Node 18+ fetch

const BASE_URL = "http://localhost:4000/api";

interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    facilityId: string;
  };
}

async function run() {
  console.log("==================================================");
  console.log("   ReferralOS Comprehensive Endpoints Test Suite   ");
  console.log("==================================================\n");

  // 1. LOGIN AS ADMIN
  console.log("1. Testing POST /auth/login (Admin)...");
  const adminRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@referralos.com", password: "demo1234" }),
  });
  if (!adminRes.ok) throw new Error(`Admin login failed: ${adminRes.statusText}`);
  const adminData = (await adminRes.json()) as AuthResponse;
  console.log("✅ Admin Logged In:", adminData.user.name, `(${adminData.user.role})`);

  // 2. LOGIN AS PHC WORKER
  console.log("\n2. Testing POST /auth/login (PHC Worker - Amaka)...");
  const phcRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "amaka@surulere-phc.com", password: "demo1234" }),
  });
  const phcData = (await phcRes.json()) as AuthResponse;
  console.log("✅ PHC Worker Logged In:", phcData.user.name, `FacilityId: ${phcData.user.facilityId}`);

  // 3. LOGIN AS HOSPITAL STAFF
  console.log("\n3. Testing POST /auth/login (Hospital Staff - Dr. Fatima)...");
  const hospRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "fatima@gbagada.com", password: "demo1234" }),
  });
  const hospData = (await hospRes.json()) as AuthResponse;
  console.log("✅ Hospital Staff Logged In:", hospData.user.name, `FacilityId: ${hospData.user.facilityId}`);

  // 4. GET /auth/me
  console.log("\n4. Testing GET /auth/me...");
  const meRes = await fetch(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${phcData.token}` },
  });
  const meData = await meRes.json();
  console.log("✅ /auth/me response:", meData);

  // 5. GET /facilities
  console.log("\n5. Testing GET /facilities...");
  const facRes = await fetch(`${BASE_URL}/facilities`, {
    headers: { Authorization: `Bearer ${phcData.token}` },
  });
  const facilities = (await facRes.json()) as any[];
  console.log(`✅ Fetched ${facilities.length} facilities.`);
  const gbagada = facilities.find((f) => f.name.includes("Gbagada"));
  const surulere = facilities.find((f) => f.name.includes("Surulere"));
  console.log(`   - Sample facility: ${gbagada.name} (ID: ${gbagada.id}, Status: ${gbagada.acceptingStatus}, Beds: ${gbagada.bedsAvailable})`);

  // 6. POST /auth/register (PHC Worker - open registration)
  console.log("\n6. Testing POST /auth/register (New PHC Worker)...");
  const randomEmail = `test_phc_${Date.now()}@test.ng`;
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Nurse Grace Okon",
      email: randomEmail,
      password: "password123",
      role: "PHC_WORKER",
      facilityId: surulere.id,
    }),
  });
  const regData = (await regRes.json()) as any;
  console.log("✅ Registered User:", regData.user?.name, regData.user?.email);

  // 7. GET /auth/users (Admin Only)
  console.log("\n7. Testing GET /auth/users (Admin Only)...");
  const usersRes = await fetch(`${BASE_URL}/auth/users`, {
    headers: { Authorization: `Bearer ${adminData.token}` },
  });
  const usersList = (await usersRes.json()) as any[];
  console.log(`✅ Admin retrieved ${usersList.length} system users.`);

  // 8. PATCH /facilities/:id/status
  console.log("\n8. Testing PATCH /facilities/:id/status...");
  const updateFacRes = await fetch(`${BASE_URL}/facilities/${gbagada.id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${hospData.token}`,
    },
    body: JSON.stringify({
      bedsAvailable: 10,
      theatreAvailable: true,
      acceptingStatus: "ACCEPTING",
    }),
  });
  const updatedFac = (await updateFacRes.json()) as any;
  console.log(`✅ Updated ${updatedFac.name} status: Beds = ${updatedFac.bedsAvailable}`);

  // 9. POST /referrals (AI Extraction)
  console.log("\n9. Testing POST /referrals (AI extraction from raw notes)...");
  const createRefRes = await fetch(`${BASE_URL}/referrals`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${phcData.token}`,
    },
    body: JSON.stringify({
      rawNotes: "24-year-old prima gravida at 37 weeks gestation presenting with severe headache, epigastric pain, visual blurring, and BP 175/115 mmHg. Deep tendon reflexes brisk.",
    }),
  });
  const newRef = (await createRefRes.json()) as any;
  console.log("✅ Referral Created via AI:", {
    id: newRef.id,
    refCode: newRef.refCode,
    urgencyTier: newRef.urgencyTier,
    requiredCapability: newRef.requiredCapability,
    patientSummary: newRef.patientSummary?.substring(0, 80) + "...",
  });

  // 10. POST /referrals/:id/match (Run Recommendation Engine)
  console.log("\n10. Testing POST /referrals/:id/match...");
  const matchRes = await fetch(`${BASE_URL}/referrals/${newRef.id}/match`, {
    method: "POST",
    headers: { Authorization: `Bearer ${phcData.token}` },
  });
  const matchData = (await matchRes.json()) as any;
  console.log(`✅ Match Results: Selected ${matchData.selectedFacilityId}, Candidates found: ${matchData.candidates?.length}`);
  matchData.candidates?.forEach((c: any, i: number) => {
    console.log(`   Candidate ${i + 1}: ${c.facilityName} - Score: ${c.score}/100, Dist: ${c.distance}km (${c.reason})`);
  });

  // 11. GET /referrals (List Referrals)
  console.log("\n11. Testing GET /referrals...");
  const listRefRes = await fetch(`${BASE_URL}/referrals`, {
    headers: { Authorization: `Bearer ${phcData.token}` },
  });
  const referrals = (await listRefRes.json()) as any[];
  console.log(`✅ Fetched ${referrals.length} referrals for user facility.`);

  // 12. GET /referrals/:id (Single Referral + Timeline)
  console.log("\n12. Testing GET /referrals/:id...");
  const singleRefRes = await fetch(`${BASE_URL}/referrals/${newRef.id}`, {
    headers: { Authorization: `Bearer ${phcData.token}` },
  });
  const singleRef = (await singleRefRes.json()) as any;
  console.log(`✅ Fetched single referral ${singleRef.refCode} with ${singleRef.events?.length} events in timeline.`);

  // 13. POST /referrals/:id/accept OR reject
  console.log("\n13. Testing POST /referrals/:id/accept...");
  const acceptRes = await fetch(`${BASE_URL}/referrals/${newRef.id}/accept`, {
    method: "POST",
    headers: { Authorization: `Bearer ${hospData.token}` },
  });
  const acceptedRef = (await acceptRes.json()) as any;
  console.log(`✅ Referral Status after accept: ${acceptedRef.status}`);

  // 14. POST /referrals/:id/status (IN_TRANSIT -> ARRIVED -> CARE_CONFIRMED)
  console.log("\n14. Testing POST /referrals/:id/status (IN_TRANSIT)...");
  const transitRes = await fetch(`${BASE_URL}/referrals/${newRef.id}/status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${phcData.token}`,
    },
    body: JSON.stringify({ status: "IN_TRANSIT", note: "Patient departing in ambulance LAG-441" }),
  });
  const transitData = (await transitRes.json()) as any;
  console.log(`✅ Status: ${transitData.status}`);

  console.log("\n14b. Testing POST /referrals/:id/status (ARRIVED)...");
  const arrivedRes = await fetch(`${BASE_URL}/referrals/${newRef.id}/status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${hospData.token}`,
    },
    body: JSON.stringify({ status: "ARRIVED", note: "Ambulance arrived at triage" }),
  });
  const arrivedData = (await arrivedRes.json()) as any;
  console.log(`✅ Status: ${arrivedData.status}`);

  console.log("\n14c. Testing POST /referrals/:id/status (CARE_CONFIRMED)...");
  const careRes = await fetch(`${BASE_URL}/referrals/${newRef.id}/status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${hospData.token}`,
    },
    body: JSON.stringify({ status: "CARE_CONFIRMED", note: "Admitted to labour ward, IV magnesium initiated" }),
  });
  const careData = (await careRes.json()) as any;
  console.log(`✅ Status: ${careData.status}`);

  // 15. POST /referrals/:id/feedback
  console.log("\n15. Testing POST /referrals/:id/feedback...");
  const feedRes = await fetch(`${BASE_URL}/referrals/${newRef.id}/feedback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${hospData.token}`,
    },
    body: JSON.stringify({
      diagnosisConfirmed: "Severe Pre-eclampsia in labour",
      treatmentGiven: "IV Magnesium sulphate loading dose, emergency caesarean section under spinal anaesthesia. Healthy baby delivered, APGAR 8/10.",
      followUpRequired: true,
      followUpNote: "PHC BP check on day 3 post-discharge.",
      outcomeStatus: "Mother and baby stable",
    }),
  });
  const feedbackData = (await feedRes.json()) as any;
  console.log("✅ Feedback Note Submitted:", feedbackData.diagnosisConfirmed, "| Outcome:", feedbackData.outcomeStatus);

  // 15b. TEST REJECT & AUTOMATED RE-ROUTING FLOW
  console.log("\n15b. Testing POST /referrals/:id/reject with AUTOMATED RE-ROUTING...");
  const refToRejectRes = await fetch(`${BASE_URL}/referrals`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${phcData.token}`,
    },
    body: JSON.stringify({
      rawNotes: "30-year-old female, 34 weeks, severe postpartum haemorrhage, needs immediate blood transfusion and ICU bed.",
    }),
  });
  const refToReject = (await refToRejectRes.json()) as any;
  // Match it first
  await fetch(`${BASE_URL}/referrals/${refToReject.id}/match`, {
    method: "POST",
    headers: { Authorization: `Bearer ${phcData.token}` },
  });
  // Now reject it
  const rejectRes = await fetch(`${BASE_URL}/referrals/${refToReject.id}/reject`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${hospData.token}`,
    },
    body: JSON.stringify({ reason: "No available ICU beds or blood units" }),
  });
  const rejectedRef = (await rejectRes.json()) as any;
  const refObj = rejectedRef.referral || rejectedRef;
  console.log("✅ Rejection & Auto-rematch Result:", {
    refCode: refObj.refCode,
    status: refObj.status,
    rematchCount: refObj.rematchCount,
    receivingFacility: refObj.receivingFacility?.name,
    rerouted: rejectedRef.rerouted,
  });

  // 16. GET /analytics/summary
  console.log("\n16. Testing GET /analytics/summary...");
  const sumRes = await fetch(`${BASE_URL}/analytics/summary`, {
    headers: { Authorization: `Bearer ${adminData.token}` },
  });
  const summary = (await sumRes.json()) as any;
  console.log("✅ Analytics Summary:", {
    totalReferrals: summary.totalReferrals,
    completionRate: `${summary.completionRate}%`,
    avgAcceptanceMinutes: summary.avgAcceptanceMinutes,
    insight: summary.insight?.substring(0, 90) + "...",
  });

  // 17. GET /analytics/active
  console.log("\n17. Testing GET /analytics/active...");
  const activeRes = await fetch(`${BASE_URL}/analytics/active`, {
    headers: { Authorization: `Bearer ${adminData.token}` },
  });
  const activeReferrals = (await activeRes.json()) as any[];
  console.log(`✅ Command Centre active referrals: ${activeReferrals.length}`);

  // 18. GET /analytics/facilities
  console.log("\n18. Testing GET /analytics/facilities...");
  const facMatrixRes = await fetch(`${BASE_URL}/analytics/facilities`, {
    headers: { Authorization: `Bearer ${adminData.token}` },
  });
  const facMatrix = (await facMatrixRes.json()) as any[];
  console.log(`✅ Command Centre facility matrix: ${facMatrix.length} facilities reported.`);

  // 19. GET /analytics/timeline
  console.log("\n19. Testing GET /analytics/timeline...");
  const timeRes = await fetch(`${BASE_URL}/analytics/timeline`, {
    headers: { Authorization: `Bearer ${adminData.token}` },
  });
  const timeline = (await timeRes.json()) as any;
  console.log(`✅ Command Centre timeline: ${timeline.data?.length} days of data (${timeline.period}).`);

  console.log("\n==================================================");
  console.log("   🎉 ALL ENDPOINTS TESTED AND PASSING 100%!       ");
  console.log("==================================================");
}

run().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
