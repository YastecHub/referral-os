# ReferralOS — Frontend Integration Guide & API Reference

> **Base API URL**: `http://localhost:4000/api` (or `http://localhost:4001/api` if port 4000 is occupied)  
> **Swagger Interactive Docs**: `http://localhost:4000/api/docs`  
> **WebSocket URL**: `http://localhost:4000` (Socket.IO client)

---

## 1. Quick Start & Demo Credentials

The database has been seeded with 9 Lagos healthcare facilities, 5 demo staff accounts, and comprehensive referral scenarios.

| Role | Email (.com or .ng) | Password | Facility Name | Use Case |
| :--- | :--- | :--- | :--- | :--- |
| **PHC Worker** | `amaka@surulere-phc.com` | `demo1234` | Surulere PHC — Aguda | Creating referrals, dispatching transport |
| **PHC Worker** | `chidi@kosofe-phc.com` | `demo1234` | Kosofe PHC — Alapere | Creating referrals, dispatching transport |
| **Hospital Staff** | `fatima@gbagada.com` | `demo1234` | Gbagada General Hospital | Accepting/rejecting, intake, confirming care, feedback |
| **Hospital Staff** | `emeka@lasuth.com` | `demo1234` | LASUTH (Teaching Hospital) | Receiving tertiary referrals, updating ICU/blood |
| **Admin** | `admin@referralos.com` | `demo1234` | Command Centre | Viewing analytics, facility matrix, managing staff |

---

## 2. Authentication & Authorization

ReferralOS uses standard **JWT Bearer Authentication**.

### Client HTTP Header
Include this header in every authenticated request:
```http
Authorization: Bearer <JWT_TOKEN>
```

### Authentication Endpoints

#### 1. Public Facility Lookup (For Sign Up Dropdown)
Populate the facility selector on the registration page:
```http
GET /api/auth/facilities
```
**Response (`200 OK`):**
```json
[
  {
    "id": "6aadc7a1ce862dbbba2f375f",
    "name": "Surulere PHC",
    "tier": "PHC",
    "tierLabel": "Tier 1 — PHC",
    "location": "Surulere, Lagos",
    "address": "12 Aguda St, Surulere, Lagos",
    "availability": "Available"
  },
  {
    "id": "6aadc7a1ce862dbbba2f3760",
    "name": "Mushin PHC",
    "tier": "PHC",
    "tierLabel": "Tier 1 — PHC",
    "location": "Mushin, Lagos",
    "address": "22 Palm Ave, Mushin, Lagos",
    "availability": "Available"
  },
  {
    "id": "6aadc7a1ce862dbbba2f3761",
    "name": "Lagos General",
    "tier": "SECONDARY",
    "tierLabel": "Tier 2 — Secondary",
    "location": "Lagos Island, Lagos",
    "address": "1 Broad St, Marina, Lagos Island, Lagos",
    "availability": "Available"
  },
  {
    "id": "6aadc7a1ce862dbbba2f3762",
    "name": "Ebute metta CHC",
    "tier": "PHC",
    "tierLabel": "Tier 1 — PHC",
    "location": "Lagos Mainland, Lagos",
    "address": "14 Cemetery St, Ebute Metta, Lagos",
    "availability": "Available"
  }
]
```

#### 2. Register New User (Open for Healthcare Workers)
Supports all frontend sign-up fields. Facility can be passed by ID or by name (e.g. `"Mushin PHC"`, `"Surulere PHC"`, `"Lagos General"`, `"Ebute metta CHC"`):
```http
POST /api/auth/register
Content-Type: application/json
```
**Request Body:**
```json
{
  "fullName": "Dr. Chidi Nwosu",
  "email": "chidi@ebute-metta.ng",
  "phoneNumber": "08012345678",
  "gender": "Male",
  "profession": "Doctor",
  "facility": "Ebute metta CHC",
  "password": "securePassword123"
}
```
**Response (`201 Created`):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "6aadc7a3ce862dbbba2f3764",
    "name": "Dr. Chidi Nwosu",
    "fullName": "Dr. Chidi Nwosu",
    "email": "chidi@ebute-metta.ng",
    "role": "PHC_WORKER",
    "facilityId": "6aadc7a1ce862dbbba2f3762",
    "phone": "08012345678",
    "gender": "Male",
    "profession": "Doctor",
    "facility": {
      "id": "6aadc7a1ce862dbbba2f3762",
      "name": "Ebute metta CHC",
      "tier": "PHC",
      "lga": "Lagos Mainland"
    },
    "redirectTo": "/dashboard"
  }
}
```

#### 3. Sign In (Normal User & Admin)
Supports both normal staff and "Sign in as Admin":
```http
POST /api/auth/login
Content-Type: application/json
```
**Request Body (Normal Healthcare Staff):**
```json
{
  "email": "amaka@surulere-phc.com",
  "password": "demo1234"
}
```
**Request Body (Sign in as Admin):**
```json
{
  "email": "admin@referralos.com",
  "password": "demo1234",
  "isAdmin": true
}
```
*(Or use dedicated endpoint `POST /api/auth/admin/login`)*

**Response (`200 OK`):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "6aadc7a3ce862dbbba2f3764",
    "name": "Admin Nexoria",
    "fullName": "Admin Nexoria",
    "email": "admin@referralos.com",
    "role": "ADMIN",
    "facilityId": "6aadc7a1ce862dbbba2f375a",
    "redirectTo": "/command-centre"
  }
}
```
> **Routing Advice**:  
> Normal healthcare users receive `"redirectTo": "/dashboard"`.  
> Admins receive `"redirectTo": "/command-centre"`.

#### 4. Current User Profile
```http
GET /api/auth/me
Authorization: Bearer <TOKEN>
```

#### 5. List All Users (Admin Only)
```http
GET /api/auth/users
Authorization: Bearer <ADMIN_TOKEN>
```

---

## 3. End-to-End Clinical Workflows

### Flow A: Emergency Referral Happy Path (PHC to Hospital)

```mermaid
sequenceDiagram
    autonumber
    actor PHC as PHC Worker (Amaka)
    participant API as ReferralOS API
    participant AI as AI Engine (Groq)
    participant Match as Matching Engine
    actor Hosp as Hospital Staff (Dr. Fatima)

    PHC->>API: POST /api/referrals (Raw clinical text)
    API->>AI: Extract symptoms, urgency, capability
    AI-->>API: Structured Referral (CREATED)
    API-->>PHC: Referral Created (REF-2026-XXXX)

    PHC->>API: POST /api/referrals/:id/match
    API->>Match: Rank nearby facilities by distance & capacity
    Match-->>API: Top 3 Candidates (Auto-assigns Candidate #1)
    API-->>Hosp: WebSocket event: referral:matched

    Hosp->>API: POST /api/referrals/:id/accept
    API-->>PHC: WebSocket event: referral:accepted (Status: ACCEPTED)

    PHC->>API: POST /api/referrals/:id/status { status: "IN_TRANSIT" }
    API-->>Hosp: WebSocket: Patient on the way

    Hosp->>API: POST /api/referrals/:id/status { status: "ARRIVED" }
    Hosp->>API: POST /api/referrals/:id/status { status: "CARE_CONFIRMED" }

    Hosp->>API: POST /api/referrals/:id/feedback { diagnosisConfirmed, treatmentGiven }
    API-->>PHC: Status: FEEDBACK_SENT (Loop closed)
```

---

### Flow B: Rejection & Automated Re-routing Loop

When a hospital is at capacity or lacks emergency resources (e.g. theatre busy), rejecting the referral **automatically** engages the recommendation engine to find and assign the next best facility.

```mermaid
sequenceDiagram
    autonumber
    actor Hosp1 as Hospital A (Gbagada)
    participant API as ReferralOS API
    actor Hosp2 as Hospital B (LASUTH)
    actor PHC as PHC Worker

    Hosp1->>API: POST /api/referrals/:id/reject { reason: "Theatre busy" }
    Note over API: System adds Hospital A to rejectedFacilityIds[]<br/>Auto-triggers matching engine
    API->>API: Re-rank excluding Hospital A
    API-->>Hosp2: Assigned to next hospital (MATCHED)
    API-->>PHC: WebSocket: referral:rematched (rematchCount: 1)
    Hosp2->>API: POST /api/referrals/:id/accept
```

---

## 4. Complete Endpoint Reference & Test Payloads

### 🏥 Facilities

#### 1. List Facilities with Live Indicators
```http
GET /api/facilities
Authorization: Bearer <TOKEN>
```
**Response Sample:**
```json
[
  {
    "id": "6aadc7a1ce862dbbba2f3759",
    "name": "Gbagada General Hospital",
    "tier": "SECONDARY",
    "address": "Hospital Rd, Gbagada, Lagos",
    "lga": "Kosofe",
    "lat": 6.5568,
    "lng": 3.3869,
    "phone": "01-234-5601",
    "capabilities": [
      "OBSTETRIC_EMERGENCY",
      "BLOOD_BANK",
      "THEATRE",
      "NICU"
    ],
    "acceptingStatus": "ACCEPTING",
    "bloodStock": 12,
    "specialistsOnDuty": 3,
    "bedsAvailable": 10,
    "theatreAvailable": true
  }
]
```

#### 2. Update Facility Capacity / Status
Only facility staff or admins can update their own facility.
```http
PATCH /api/facilities/6aadc7a1ce862dbbba2f3759/status
Authorization: Bearer <HOSPITAL_TOKEN>
Content-Type: application/json
```
**Request Body:**
```json
{
  "acceptingStatus": "ACCEPTING",
  "bedsAvailable": 8,
  "bloodStock": 15,
  "specialistsOnDuty": 4,
  "theatreAvailable": true
}
```

---

### 📋 Sending Flow & Referrals

There are **2 ways** to create a referral:
1. **Normal Form**: Direct form submission with all fields.
2. **AI-Assisted**: User types a messy clinical note, calls `/ai-assist` to populate the form, reviews/edits fields, and submits.

#### 1. AI-Assisted Note Parsing (Optional Pre-Submission Step)
Allows user to write a quick/messy note and get structured fields for review in the UI:
```http
POST /api/referrals/ai-assist
Authorization: Bearer <TOKEN>
Content-Type: application/json
```
**Request Body:**
```json
{
  "notes": "Mrs. Adeola, 32yo woman, 34 weeks, severe antepartum bleeding for 2 hours, BP 85/50, needs blood transfusion and emergency cesarean section"
}
```
**Response (`200 OK`):**
```json
{
  "patientName": "Mrs. Adeola",
  "age": 32,
  "gender": "Female",
  "urgency": "Emergency",
  "urgencyTier": "CRITICAL",
  "urgencyReason": "Severe obstetric haemorrhage with haemodynamic instability",
  "requiredCapabilities": [
    "Emergency obstetric",
    "Blood transfusion",
    "Theater"
  ],
  "requiredCapability": "OBSTETRIC_EMERGENCY",
  "chiefComplaint": "Antepartum haemorrhage",
  "clinicalFindings": "BP 85/50, severe bleeding",
  "patientSummary": "Mrs. Adeola, 32yo Female. Severe antepartum bleeding...",
  "notes": "Mrs. Adeola, 32yo woman, 34 weeks..."
}
```

#### 2. Create Referral (Normal Form or AI-Assisted Output)
Both flows submit to this endpoint to create the structured referral:
```http
POST /api/referrals
Authorization: Bearer <TOKEN>
Content-Type: application/json
```
**Request Body (Normal Form):**
```json
{
  "patientName": "Amina Bello",
  "age": 26,
  "gender": "Female",
  "urgency": "Emergency",
  "requiredCapabilities": [
    "Emergency obstetric",
    "Blood transfusion",
    "Theater"
  ],
  "notes": "Patient in obstructed labour, fetal heart rate 90 bpm, signs of fetal distress. Needs immediate emergency surgical intervention.",
  "receivingFacilityId": "6aadc7a1ce862dbbba2f3759"
}
```
*(Available Urgency values: `"Emergency"`, `"Urgent"`, `"Routine"` or `"CRITICAL"`, `"HIGH"`, `"MEDIUM"`)*  
*(Available Capabilities: `"Emergency obstetric"`, `"Blood transfusion"`, `"Theater"`, `"Maternal ICU"`, `"NICU"`, `"PICU"`, `"Pediatric emergency"`, `"Obstetric specialist"`, `"Surgery"`, `"Burns & trauma"`)*

**Response (`201 Created`):**
```json
{
  "referralId": "6aadc8062abdb2f61d925de2",
  "patientReference": "REF-2026-0010",
  "patientName": "Amina Bello",
  "age": 26,
  "sex": "Female",
  "gender": "Female",
  "urgency": "Emergency",
  "urgencyTier": "CRITICAL",
  "requirements": [
    "Emergency obstetric",
    "Blood transfusion",
    "Theater"
  ],
  "requiredCapabilities": [
    "Emergency obstetric",
    "Blood transfusion",
    "Theater"
  ],
  "clinicalInformation": "Patient in obstructed labour, fetal heart rate 90 bpm...",
  "currentStatus": "MATCHED",
  "statusLabel": "Facility Identified",
  "sendingFacilityId": "6aadc7a1ce862dbbba2f375f",
  "receivingFacilityId": "6aadc7a1ce862dbbba2f3759",
  "timeReceived": "2026-09-19T11:40:00.000Z"
}
```

#### 3. Receiving Page: Accept / Can't Accept Actions

##### A. Accept Referral
```http
POST /api/referrals/:id/accept
Authorization: Bearer <HOSPITAL_TOKEN>
```
Updates status to `ACCEPTED`.

##### B. Can't Accept (Reject & Auto Re-Route)
*Note: No reason field is required for MVP!*
```http
POST /api/referrals/:id/cant-accept
Authorization: Bearer <HOSPITAL_TOKEN>
Content-Type: application/json
```
**Request Body (Optional):**
```json
{}
```
*(Or optional `{ "reason": "Theatre currently occupied" }`)*  
Updates status to `REJECTED`, adds the rejecting hospital to `rejectedFacilityIds`, and automatically re-routes to the next best available facility.

#### 4. Referral Status Lifecycle Updates
Advances the referral through the stages:
`Created` → `Facility Identified` → `Accepted` → `Transport Requested` → `In Transit` → `Arrived` → `Care Confirmed` → `Feedback Sent`
```http
POST /api/referrals/:id/status
Authorization: Bearer <TOKEN>
Content-Type: application/json
```
**Request Body:**
```json
{
  "status": "Transport Requested",
  "note": "Ambulance dispatched from LASAMBUS station"
}
```
*(Accepted status values: `"Facility Identified"`, `"Accepted"`, `"Transport Requested"`, `"In Transit"`, `"Arrived"`, `"Care Confirmed"`, `"Feedback Sent"`)*

---

### 📊 Facility Dashboard Endpoint

Returns dynamic counts and categorized referral lists for the facility dashboard:
```http
GET /api/referrals/dashboard
Authorization: Bearer <TOKEN>
```
*(Or `GET /api/dashboard` or `GET /api/facilities/:facilityId/dashboard`)*

**Response (`200 OK`):**
```json
{
  "facility": {
    "id": "6aadc7a1ce862dbbba2f375f",
    "name": "Surulere PHC",
    "tier": "PHC",
    "tierLabel": "Tier 1 — PHC",
    "location": "Surulere, Lagos",
    "availability": "Available",
    "readiness": {
      "blood": "0 units available",
      "bloodStock": 0,
      "equipment": "2 beds available (Theatre unavailable)",
      "bedsAvailable": 2,
      "theatreAvailable": false,
      "specialist": "1 specialist(s) on duty",
      "specialistsOnDuty": 1
    }
  },
  "stats": {
    "awaitingResponse": 2,
    "acceptedToday": 4,
    "urgentCount": 3,
    "activeCount": 5,
    "completedCount": 18,
    "totalSent": 21,
    "totalReceived": 7
  },
  "sentReferrals": [...],
  "receivedReferrals": [...],
  "activeReferrals": [...],
  "pastReferrals": [...]
}
```

---

### 🛰️ Network Command Centre Endpoints

The central monitoring view for facilities, map, and network-wide referrals.

#### 1. Command Centre Overview
```http
GET /api/command-centre/overview
Authorization: Bearer <ADMIN_TOKEN>
```
*(Aliases: `GET /api/command-center/overview` or `GET /api/analytics/command-centre`)*

**Response (`200 OK`):**
```json
{
  "summary": {
    "totalFacilities": 13,
    "availableFacilities": 11,
    "unavailableFacilities": 2,
    "activeReferrals": 6,
    "urgentReferrals": 4,
    "awaitingResponse": 2,
    "inTransit": 1,
    "arrived": 1,
    "careConfirmed": 1,
    "completedReferrals": 24,
    "totalReferrals": 30,
    "byStatus": {
      "CREATED": 1,
      "MATCHED": 1,
      "ACCEPTED": 2,
      "IN_TRANSIT": 1,
      "ARRIVED": 1,
      "CARE_CONFIRMED": 1,
      "FEEDBACK_SENT": 24
    },
    "byUrgency": {
      "CRITICAL": 12,
      "HIGH": 10,
      "MEDIUM": 8
    }
  },
  "facilities": [
    {
      "facilityId": "6aadc7a1ce862dbbba2f3759",
      "facilityName": "Gbagada General Hospital",
      "facilityTier": "Tier 2 — Secondary",
      "tierLabel": "Tier 2 — Secondary",
      "location": "Kosofe, Lagos",
      "address": "Hospital Rd, Gbagada, Lagos",
      "lat": 6.5568,
      "lng": 3.3869,
      "phone": "01-234-5601",
      "availability": "Available",
      "readiness": {
        "blood": "12 units",
        "bloodStock": 12,
        "equipment": "Theatre ready, 10 beds",
        "bedsAvailable": 10,
        "theatreAvailable": true,
        "specialist": "3 specialist(s) on duty",
        "specialistsOnDuty": 3
      },
      "activeReferralsCount": 2
    }
  ],
  "referrals": [...]
}
```

#### 2. Selected Facility Details (With Active Referrals)
When a user clicks on a facility in the Command Centre:
```http
GET /api/facilities/:id
Authorization: Bearer <ADMIN_TOKEN>
```
*(Or `GET /api/facilities/:id/overview`)*

Returns full facility information, readiness parameters, and all its active referrals.

---

### 🔍 Matching Engine

#### 1. Preview Candidates (Pre-Submission Matching)
```http
POST /api/referrals/match-candidates
Authorization: Bearer <TOKEN>
Content-Type: application/json
```
**Request Body:**
```json
{
  "urgency": "Emergency",
  "requiredCapabilities": ["Emergency obstetric", "Blood transfusion"]
}
```

#### 2. Run Matching on Created Referral
```http
POST /api/referrals/:id/match
Authorization: Bearer <TOKEN>
```
      "facilityId": "6aadc7a1ce862dbbba2f375a",
      "facilityName": "Lagos Island General Hospital",
      "score": 97,
      "reason": "has required capability, currently accepting, 7.0 km away",
      "distance": 7.0
    },
    {
      "facilityId": "6aadc7a1ce862dbbba2f375c",
      "facilityName": "LASUTH",
      "score": 96,
      "reason": "has required capability, currently accepting, 9.6 km away",
      "distance": 9.6
    }
  ]
}
```

#### 3. List Referrals
```http
GET /api/referrals?status=MATCHED
Authorization: Bearer <TOKEN>
```
*(Admins can also supply `?facilityId=<ID>` to view any specific facility's queue)*

#### 4. Get Single Referral with Full Audit Timeline
```http
GET /api/referrals/:id
Authorization: Bearer <TOKEN>
```
**Response includes:**
- Referral details
- `sendingFacility` and `receivingFacility` objects
- `events`: Array of chronological actions (CREATED, MATCHED, ACCEPTED, etc.)
- `feedback`: Clinical outcome note (when completed)

#### 5. Hospital Accepts Referral
Transitions referral from `MATCHED` to `ACCEPTED`.
```http
POST /api/referrals/:id/accept
Authorization: Bearer <HOSPITAL_TOKEN>
```

#### 6. Hospital Rejects Referral (Triggers Auto-Rematch)
```http
POST /api/referrals/:id/reject
Authorization: Bearer <HOSPITAL_TOKEN>
Content-Type: application/json
```
**Request Body:**
```json
{
  "reason": "Theatre currently in use for emergency C-section"
}
```
**Response (`200 OK`):**
```json
{
  "referral": {
    "id": "...",
    "refCode": "REF-2026-0007",
    "status": "MATCHED",
    "rematchCount": 1,
    "receivingFacilityId": "6aadc7a1ce862dbbba2f375a",
    "rejectionReason": "Theatre currently in use for emergency C-section"
  },
  "rerouted": true,
  "newFacilityId": "6aadc7a1ce862dbbba2f375a",
  "candidates": [ ... ]
}
```

#### 7. Advance Transport & Care Status
Valid transitions:
- `IN_TRANSIT` (Patient departs PHC)
- `ARRIVED` (Ambulance reaches receiving hospital triage)
- `CARE_CONFIRMED` (Patient admitted into ward/theatre)

```http
POST /api/referrals/:id/status
Authorization: Bearer <TOKEN>
Content-Type: application/json
```
**Request Body:**
```json
{
  "status": "IN_TRANSIT",
  "note": "Patient departing with midwife in ambulance LAG-441"
}
```

#### 8. Submit Feedback Note (Closes Loop)
Referral must be in `CARE_CONFIRMED` state. Moves referral to `FEEDBACK_SENT`.
```http
POST /api/referrals/:id/feedback
Authorization: Bearer <HOSPITAL_TOKEN>
Content-Type: application/json
```
**Request Body:**
```json
{
  "diagnosisConfirmed": "Severe Pre-eclampsia in labour",
  "treatmentGiven": "IV Magnesium sulphate loading dose, emergency caesarean section under spinal anaesthesia. Healthy baby delivered, APGAR 8/10.",
  "followUpRequired": true,
  "followUpNote": "PHC BP check on day 3 post-discharge.",
  "outcomeStatus": "Mother and baby stable"
}
```

---

### 📊 Analytics & Command Centre

#### 1. System Summary & AI Insight
```http
GET /api/analytics/summary
Authorization: Bearer <TOKEN>
```
**Response Sample:**
```json
{
  "totalReferrals": 11,
  "completionRate": 36.4,
  "avgAcceptanceMinutes": 12.0,
  "criticalCount": 4,
  "topRejectionReason": "Theatre unavailable",
  "byStatus": {
    "CREATED": 1,
    "MATCHED": 2,
    "ACCEPTED": 1,
    "IN_TRANSIT": 1,
    "ARRIVED": 1,
    "CARE_CONFIRMED": 1,
    "FEEDBACK_SENT": 4
  },
  "insight": "Referral completion rate is 36% — below the 70% target. The most common rejection reason is 'Theatre unavailable'. Consider reallocating surgical teams during peak evening hours."
}
```

#### 2. Live Command Centre Active Referrals
Returns all currently open referrals (excluding terminal `FEEDBACK_SENT` and `REJECTED`).
```http
GET /api/analytics/active
Authorization: Bearer <ADMIN_OR_TOKEN>
```

#### 3. Facility Capacity Matrix
Returns real-time capacity and live referral volume for every facility in the network.
```http
GET /api/analytics/facilities
Authorization: Bearer <ADMIN_OR_TOKEN>
```

#### 4. Historical Timeline Activity
```http
GET /api/analytics/timeline?days=30
Authorization: Bearer <ADMIN_OR_TOKEN>
```

---

## 5. Real-Time WebSockets (Socket.IO Client)

ReferralOS features real-time push updates. All connected clients automatically join their facility's room: `facility:<facilityId>`. Admins additionally join the `admin` room.

### Connection Example (React / Vue / Vanilla JS)

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:4000", {
  auth: {
    token: userJwtToken, // Pass token during handshake
  },
  transports: ["websocket"],
});

socket.on("connect", () => {
  console.log("Connected to ReferralOS WebSocket! Socket ID:", socket.id);
});

// 1. When a new referral is matched to this facility
socket.on("referral:matched", (referral) => {
  console.log("🔔 Incoming referral:", referral.refCode, referral.patientSummary);
});

// 2. When hospital accepts
socket.on("referral:accepted", (referral) => {
  console.log("✅ Referral accepted:", referral.refCode);
});

// 3. When hospital rejects and auto-reroute triggers
socket.on("referral:rematched", ({ referral, newFacilityId }) => {
  console.log("⚠️ Referral auto-rerouted to new facility:", newFacilityId);
});

// 4. Status transitions (IN_TRANSIT, ARRIVED, CARE_CONFIRMED)
socket.on("referral:status_changed", (referral) => {
  console.log("🔄 Referral status update:", referral.refCode, "→", referral.status);
});

// 5. Final feedback note
socket.on("referral:feedback_sent", (referral) => {
  console.log("📄 Clinical feedback received for:", referral.refCode);
});

// 6. Live bed & blood capacity change
socket.on("facility:status_updated", (facility) => {
  console.log("🏥 Facility status change:", facility.name, "Beds:", facility.bedsAvailable);
});
```

---

## 6. TypeScript Data Models (Copy & Paste for Frontend)

```typescript
export type UserRole = "PHC_WORKER" | "HOSPITAL_STAFF" | "ADMIN";

export type FacilityTier = "PHC" | "SECONDARY" | "TERTIARY";

export type AcceptingStatus = "ACCEPTING" | "LIMITED" | "UNAVAILABLE";

export type Capability =
  | "OBSTETRIC_EMERGENCY"
  | "BLOOD_BANK"
  | "THEATRE"
  | "NICU"
  | "ICU"
  | "DIALYSIS"
  | "TRAUMA"
  | "PAEDIATRICS";

export type UrgencyTier = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type ReferralStatus =
  | "CREATED"
  | "MATCHED"
  | "ACCEPTED"
  | "IN_TRANSIT"
  | "ARRIVED"
  | "CARE_CONFIRMED"
  | "FEEDBACK_SENT"
  | "REJECTED";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  facilityId: string;
}

export interface Facility {
  id: string;
  name: string;
  tier: FacilityTier;
  address: string;
  lga: string;
  lat: number;
  lng: number;
  phone: string;
  capabilities: Capability[];
  acceptingStatus: AcceptingStatus;
  bloodStock: number;
  specialistsOnDuty: number;
  bedsAvailable: number;
  theatreAvailable: boolean;
}

export interface ReferralEvent {
  id: string;
  referralId: string;
  eventType: string;
  actorId?: string | null;
  note?: string | null;
  timestamp: string;
}

export interface FeedbackNote {
  id: string;
  referralId: string;
  diagnosisConfirmed: string;
  treatmentGiven: string;
  followUpRequired: boolean;
  followUpNote?: string | null;
  outcomeStatus?: string | null;
  sentAt: string;
}

export interface MatchCandidate {
  facilityId: string;
  facilityName: string;
  score: number; // 0 to 100
  reason: string;
  distance: number; // in km
}

export interface Referral {
  id: string;
  refCode: string;
  rawNotes: string;
  patientSummary?: string | null;
  patientAge?: number | null;
  patientGender?: string | null;
  chiefComplaint?: string | null;
  clinicalFindings?: string | null;
  urgencyTier: UrgencyTier;
  urgencyReason?: string | null;
  requiredCapability: Capability;
  status: ReferralStatus;
  sendingFacilityId: string;
  receivingFacilityId?: string | null;
  matchCandidates?: MatchCandidate[] | null;
  rejectionReason?: string | null;
  rematchCount: number;
  createdAt: string;
  updatedAt: string;
  sendingFacility?: Facility;
  receivingFacility?: Facility | null;
  events?: ReferralEvent[];
  feedback?: FeedbackNote | null;
}
```
