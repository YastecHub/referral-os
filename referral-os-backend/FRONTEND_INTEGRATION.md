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

---

## 12. Voice & Multilingual Engine (STT, TTS & 4 Nigerian Languages)

ReferralOS features a specialized clinical voice and translation engine designed for Nigerian healthcare workers, midwives, emergency responders, and patients across the **4 core languages of Nigeria**:
- **English** (`en`, BCP-47: `en-NG`)
- **Yorùbá** (`yo`, BCP-47: `yo-NG`)
- **Hausa** (`ha`, BCP-47: `ha-NG`)
- **Igbo** (`ig`, BCP-47: `ig-NG`)

---

### A. Supported Languages & Metadata Lookup

```http
GET /api/voice/languages
GET /api/multilingual/languages
```

**Response (`200 OK`):**
```json
{
  "supportedLanguages": [
    {
      "code": "en",
      "name": "English",
      "nativeName": "English (Nigeria)",
      "bcp47": "en-NG",
      "region": "National / Official",
      "samplePhrases": {
        "postpartumHemorrhage": "Severe bleeding after delivery, patient is pale and tachycardic",
        "obstructedLabour": "Prolonged labor over 14 hours, fetal distress detected",
        "ambulanceDispatch": "Emergency ambulance dispatched to your facility immediately"
      }
    },
    {
      "code": "yo",
      "name": "Yoruba",
      "nativeName": "Èdè Yorùbá",
      "bcp47": "yo-NG",
      "region": "Southwest Nigeria (Lagos, Ogun, Oyo, Osun, Ondo, Ekiti)",
      "samplePhrases": {
        "postpartumHemorrhage": "Ẹ̀jẹ̀ ń tú jáde púpọ̀ lẹ́yìn ìbímọ, ara aláìsàn ti tutù",
        "obstructedLabour": "Ìrọbi tí kò tètè bí lẹ́yìn wákàtí mẹ́rìnlá, ọmọ inú ń jàkàdì",
        "ambulanceDispatch": "Ọkọ̀ ìtọ́jú pàjáwìrì ti ń bọ̀ wá sí ilé-ìwòsàn yín lẹ́sẹ̀kẹsẹ̀"
      }
    },
    {
      "code": "ha",
      "name": "Hausa",
      "nativeName": "Harshen Hausa",
      "bcp47": "ha-NG",
      "region": "Northern Nigeria (Kano, Kaduna, Sokoto, Katsina, etc.)",
      "samplePhrases": {
        "postpartumHemorrhage": "Zubar jini mai tsanani bayan haihuwa, majiyyaciyar tana cikin mawuyacin hali",
        "obstructedLabour": "Nakuda mai tsawo sama da sa'o'i goma sha hudu, bugun zuciyar jariri yana raguwa",
        "ambulanceDispatch": "An aiko motar asibiti ta gaggawa zuwa asibitinku nan take"
      }
    },
    {
      "code": "ig",
      "name": "Igbo",
      "nativeName": "Asụsụ Igbo",
      "bcp47": "ig-NG",
      "region": "Southeast Nigeria (Enugu, Imo, Anambra, Abia, Ebonyi)",
      "samplePhrases": {
        "postpartumHemorrhage": "Ọbara na-agbapụta nke ukwuu mgbe a mụsịrị nwa, ahụ adịghị onye ọrịa mma",
        "obstructedLabour": "Ime ime na-esiri ike karịa awa iri na anọ, nwa nọ n'ime na-ata ahụhụ",
        "ambulanceDispatch": "Ụgbọ ala mberede na-abịa n'ụlọ ọgwụ unu ngwa ngwa"
      }
    }
  ]
}
```

---

### B. Speech-to-Text (STT) — Transcribe Audio

Upload an audio recording from mobile or browser microphone (WebM, WAV, MP3, M4A, OGG).

- **Multipart Upload**: `POST /api/voice/transcribe` with `audio` or `file` file field.
- **Base64 JSON**: `POST /api/voice/transcribe` with JSON body:

```http
POST /api/voice/transcribe
Content-Type: application/json
```
```json
{
  "audio": "data:audio/webm;base64,GkXfo59ChoEBQveBA...",
  "format": "webm",
  "language": "yo"
}
```
**Response (`200 OK`):**
```json
{
  "transcript": "Obinrin ọmọ ọgbọ̀n ọdún kan ń ṣẹ̀jẹ̀ púpọ̀ lẹ́yìn ìbímọ, BP rẹ̀ jẹ́ 85 lórí 50...",
  "language": "yo",
  "duration": 6.8,
  "wordsCount": 18
}
```

---

### C. Hands-Free "Speech-to-Referral" (Voice Intake)

Allows rural health workers, midwives, or ER doctors to record voice notes in **English, Yorùbá, Hausa, or Igbo**. The engine:
1. Transcribes audio via Whisper Large v3.
2. Translates to clinical English if spoken in Yorùbá, Hausa, or Igbo.
3. Automatically parses patient demographics, vitals, urgency tier (`EMERGENCY`, `URGENT`, `ROUTINE`), and required capabilities.

```http
POST /api/voice/speech-to-referral
Content-Type: application/json
```
```json
{
  "audio": "data:audio/webm;base64,GkXfo59ChoEBQveBA...",
  "format": "webm",
  "language": "ha",
  "notes": "Optional extra typed notes"
}
```

**Response (`200 OK`):**
```json
{
  "transcript": "Mace mai shekaru talatin tana zubar da jini sosai bayan haihuwa a PHC...",
  "translatedTranscript": "A 30-year-old female is experiencing severe postpartum hemorrhage following delivery at the PHC...",
  "sourceLanguage": "ha",
  "structuredReferral": {
    "patientName": "Unknown Female",
    "patientAge": 30,
    "patientGender": "Female",
    "chiefComplaint": "Severe postpartum hemorrhage with hemodynamic instability",
    "clinicalFindings": "Estimated blood loss > 1000ml, BP 85/50 mmHg, tachycardic, uterus atonic.",
    "urgencyTier": "EMERGENCY",
    "urgencyReason": "Life-threatening postpartum hemorrhage with signs of hypovolemic shock requiring urgent surgical intervention and blood transfusion.",
    "requiredCapability": "ICU",
    "vitalSigns": {
      "bloodPressure": "85/50",
      "heartRate": 128,
      "respiratoryRate": 26
    }
  }
}
```

---

### D. Text-to-Speech (TTS) & Audio Synthesis

Synthesizes audio alerts for high-urgency notifications or patient instructions.

```http
POST /api/voice/text-to-speech
Content-Type: application/json
```
```json
{
  "text": "Àkíyèsí pàjáwìrì: Ọkọ̀ ìtọ́jú ti ń bọ̀ wá sí ilé-ìwòsàn yín.",
  "language": "yo",
  "voiceHint": "female",
  "speed": 1.0
}
```

**Response (`200 OK`):**
```json
{
  "text": "Àkíyèsí pàjáwìrì: Ọkọ̀ ìtọ́jú ti ń bọ̀ wá sí ilé-ìwòsàn yín.",
  "language": "yo",
  "bcp47": "yo-NG",
  "audioContent": null,
  "webSpeechConfig": {
    "lang": "yo-NG",
    "rate": 1.0,
    "pitch": 1.0,
    "voiceHint": "female"
  }
}
```

---

### E. Clinical Translation & Localized Referral Summaries

#### 1. Translate Clinical Text
```http
POST /api/multilingual/translate
Content-Type: application/json
```
```json
{
  "text": "Patient has severe pre-eclampsia with BP 180/110. Administer magnesium sulfate immediately.",
  "targetLanguage": "ig",
  "context": "clinical"
}
```
**Response (`200 OK`):**
```json
{
  "originalText": "Patient has severe pre-eclampsia with BP 180/110. Administer magnesium sulfate immediately.",
  "translatedText": "Onye ọrịa nwere oke ọrịa pre-eclampsia nwere ọbara mgbali elu 180/110. Nyee magnesium sulfate ozugbo.",
  "sourceLanguage": "en",
  "targetLanguage": "ig",
  "context": "clinical"
}
```

#### 2. Localized Referral Summary (Localized Emergency Cards + TTS Voice Prompt)

```http
POST /api/multilingual/referral-summary
Content-Type: application/json
```
```json
{
  "referral": {
    "refCode": "REF-LA-2026-9042",
    "urgencyTier": "EMERGENCY",
    "patientAge": 28,
    "patientGender": "Female",
    "chiefComplaint": "Severe eclampsia with recurrent seizures",
    "clinicalFindings": "Unconscious post-ictal, BP 190/120, protein 3+ in urine"
  },
  "targetLanguage": "yo"
}
```

**Response (`200 OK`):**
```json
{
  "language": "yo",
  "bcp47": "yo-NG",
  "localizedSummary": {
    "emergencyTitle": "ÌFÚNNILÓKÙN PÀJÁWÌRÌ (EMERGENCY)",
    "urgencyLabel": "ÌṢÈRÒ PÀJÁWÌRÌ",
    "patientInfo": "Aláìsàn: Obìnrin, ọmọ ọdún 28",
    "complaint": "Ẹ̀kùn Àkọ́kọ́: Severe eclampsia pẹ̀lú ìgúnlẹ̀ léraléra",
    "instructions": "Ẹ tètè gba aláìsàn yìí láyè, kí ẹ sì pèsè ẹ̀rọ àti egbògi fún ìtọ́jú eclampsia.",
    "ttsSpokenText": "Àkíyèsí pàjáwìrì: Ìfọwọ́sowọ́pọ̀ pàjáwìrì fún Obìnrin, ọmọ ọdún 28."
  },
  "ttsSpokenText": "Àkíyèsí pàjáwìrì: Ìfọwọ́sowọ́pọ̀ pàjáwìrì fún Obìnrin, ọmọ ọdún 28..."
}
```

---

### F. Frontend Code Snippets

#### 1. React / Browser Voice Recording Hook (`useAudioRecorder.ts`)
```typescript
import { useState, useRef } from "react";

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunksRef.current = [];
    const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data);
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setIsRecording(true);
  };

  const stopRecording = (): Promise<Blob> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) return;
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setIsRecording(false);
        resolve(audioBlob);
      };
      mediaRecorderRef.current.stop();
    });
  };

  const submitSpeechToReferral = async (blob: Blob, language: "yo" | "ha" | "ig" | "en" = "en") => {
    const formData = new FormData();
    formData.append("audio", blob, "voice_intake.webm");
    formData.append("language", language);

    const token = localStorage.getItem("token");
    const response = await fetch("http://localhost:4000/api/voice/speech-to-referral", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    return await response.json();
  };

  return { isRecording, startRecording, stopRecording, submitSpeechToReferral };
}
```

#### 2. Native Browser Text-to-Speech Playback (`speakText.ts`)
```typescript
export function playVoiceAlert(spokenText: string, bcp47: "en-NG" | "yo-NG" | "ha-NG" | "ig-NG" = "en-NG") {
  if (!("speechSynthesis" in window)) {
    console.warn("Web Speech API not supported in this browser.");
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(spokenText);
  utterance.lang = bcp47;
  utterance.rate = 0.95;
  utterance.pitch = 1.0;

  const voices = window.speechSynthesis.getVoices();
  const matchedVoice = voices.find(v => v.lang.startsWith(bcp47.slice(0, 2)) || v.lang === bcp47);
  if (matchedVoice) {
    utterance.voice = matchedVoice;
  }

  window.speechSynthesis.speak(utterance);
}
```

