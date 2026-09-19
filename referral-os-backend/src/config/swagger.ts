import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "ReferralOS API",
      version: "1.0.0",
      description:
        "Real-time emergency maternal referral coordination system for Nigerian PHCs and hospitals.",
    },
    servers: [
      { url: "", description: "Current Server (Auto-detect)" },
      { url: "http://localhost:4000", description: "Port 4000 (Default)" },
      { url: "http://localhost:4001", description: "Port 4001 (Secondary)" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        // ── Auth ──────────────────────────────────────────────────────────────
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", example: "amaka@surulere-phc.com" },
            password: { type: "string", example: "demo1234" },
          },
        },
        RegisterRequest: {
          type: "object",
          required: ["name", "email", "password", "facilityId"],
          properties: {
            name: { type: "string", example: "Dr. Ngozi Adeyemi" },
            email: { type: "string", example: "ngozi@gbagada.com" },
            password: { type: "string", minLength: 6, example: "demo1234" },
            role: {
              type: "string",
              enum: ["PHC_WORKER", "HOSPITAL_STAFF", "ADMIN"],
              default: "PHC_WORKER",
              description: "HOSPITAL_STAFF and ADMIN require admin Authorization header",
            },
            facilityId: {
              type: "string",
              example: "6aadc7a1ce862dbbba2f375f",
              description: "MongoDB ObjectId of the facility (e.g. Surulere PHC: 6aadc7a1ce862dbbba2f375f, Gbagada: 6aadc7a1ce862dbbba2f3759)",
            },
          },
        },
        LoginResponse: {
          type: "object",
          properties: {
            token: { type: "string" },
            user: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                email: { type: "string" },
                role: { type: "string", enum: ["PHC_WORKER", "HOSPITAL_STAFF", "ADMIN"] },
                facilityId: { type: "string" },
              },
            },
          },
        },
        // ── Facility ──────────────────────────────────────────────────────────
        Facility: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            tier: { type: "string", enum: ["PHC", "SECONDARY", "TERTIARY"] },
            address: { type: "string" },
            lga: { type: "string" },
            lat: { type: "number" },
            lng: { type: "number" },
            phone: { type: "string" },
            capabilities: {
              type: "array",
              items: {
                type: "string",
                enum: ["OBSTETRIC_EMERGENCY", "BLOOD_BANK", "THEATRE", "NICU", "ICU", "DIALYSIS", "TRAUMA", "PAEDIATRICS"],
              },
            },
            acceptingStatus: { type: "string", enum: ["ACCEPTING", "LIMITED", "UNAVAILABLE"] },
            bloodStock: { type: "integer" },
            specialistsOnDuty: { type: "integer" },
            bedsAvailable: { type: "integer" },
            theatreAvailable: { type: "boolean" },
          },
        },
        FacilityStatusUpdate: {
          type: "object",
          properties: {
            acceptingStatus: { type: "string", enum: ["ACCEPTING", "LIMITED", "UNAVAILABLE"] },
            bloodStock: { type: "integer", minimum: 0 },
            specialistsOnDuty: { type: "integer", minimum: 0 },
            bedsAvailable: { type: "integer", minimum: 0 },
            theatreAvailable: { type: "boolean" },
          },
        },
        // ── Referral ──────────────────────────────────────────────────────────
        CreateReferralRequest: {
          type: "object",
          required: ["rawNotes"],
          properties: {
            rawNotes: {
              type: "string",
              minLength: 10,
              example: "28yr old woman, 36wks pregnant, heavy bleeding since 2hrs, BP 80/50, very weak",
            },
            sendingFacilityId: {
              type: "string",
              example: "6aadc7a1ce862dbbba2f375f",
              description: "Defaults to the authenticated user's facility (Surulere PHC: 6aadc7a1ce862dbbba2f375f)",
            },
          },
        },
        Referral: {
          type: "object",
          properties: {
            id: { type: "string" },
            refCode: { type: "string", example: "REF-2026-0001" },
            rawNotes: { type: "string" },
            patientSummary: { type: "string" },
            patientAge: { type: "integer", nullable: true },
            patientGender: { type: "string", nullable: true },
            chiefComplaint: { type: "string", nullable: true },
            clinicalFindings: { type: "string", nullable: true },
            urgencyTier: { type: "string", enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"] },
            urgencyReason: { type: "string", nullable: true },
            requiredCapability: { type: "string" },
            status: {
              type: "string",
              enum: ["CREATED", "MATCHED", "ACCEPTED", "IN_TRANSIT", "ARRIVED", "CARE_CONFIRMED", "FEEDBACK_SENT", "REJECTED"],
            },
            sendingFacilityId: { type: "string" },
            receivingFacilityId: { type: "string", nullable: true },
            matchCandidates: { type: "array", nullable: true },
            rejectionReason: { type: "string", nullable: true },
            rematchCount: { type: "integer" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            sendingFacility: { $ref: "#/components/schemas/FacilityRef" },
            receivingFacility: { $ref: "#/components/schemas/FacilityRef", nullable: true },
            events: { type: "array", items: { $ref: "#/components/schemas/ReferralEvent" } },
            feedback: { $ref: "#/components/schemas/FeedbackNote", nullable: true },
          },
        },
        FacilityRef: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            lga: { type: "string" },
          },
        },
        ReferralEvent: {
          type: "object",
          properties: {
            id: { type: "string" },
            referralId: { type: "string" },
            eventType: {
              type: "string",
              enum: ["CREATED", "MATCHED", "ACCEPTED", "REJECTED", "IN_TRANSIT", "ARRIVED", "CARE_CONFIRMED", "FEEDBACK_SENT", "REMATCHED"],
            },
            actorId: { type: "string", nullable: true },
            note: { type: "string", nullable: true },
            timestamp: { type: "string", format: "date-time" },
          },
        },
        MatchResponse: {
          type: "object",
          properties: {
            selectedFacilityId: { type: "string" },
            candidates: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  facilityId: { type: "string" },
                  facilityName: { type: "string" },
                  score: { type: "integer", description: "0–100" },
                  reason: { type: "string" },
                  distance: { type: "number", description: "km" },
                },
              },
            },
          },
        },
        RejectRequest: {
          type: "object",
          required: ["reason"],
          properties: {
            reason: { type: "string", example: "Theatre unavailable" },
          },
        },
        StatusRequest: {
          type: "object",
          required: ["status"],
          properties: {
            status: {
              type: "string",
              enum: ["IN_TRANSIT", "ARRIVED", "CARE_CONFIRMED"],
            },
            note: { type: "string" },
          },
        },
        FeedbackRequest: {
          type: "object",
          required: ["diagnosisConfirmed", "treatmentGiven"],
          properties: {
            diagnosisConfirmed: { type: "string", example: "Placenta praevia with haemorrhage" },
            treatmentGiven: { type: "string", example: "Emergency caesarean section, 4 units blood transfused" },
            followUpRequired: { type: "boolean", default: false },
            followUpNote: { type: "string" },
            outcomeStatus: { type: "string", example: "Stable" },
          },
        },
        FeedbackNote: {
          type: "object",
          properties: {
            id: { type: "string" },
            referralId: { type: "string" },
            diagnosisConfirmed: { type: "string" },
            treatmentGiven: { type: "string" },
            followUpRequired: { type: "boolean" },
            followUpNote: { type: "string", nullable: true },
            outcomeStatus: { type: "string", nullable: true },
            sentAt: { type: "string", format: "date-time" },
          },
        },
        // ── Analytics ─────────────────────────────────────────────────────────
        AnalyticsSummary: {
          type: "object",
          properties: {
            totalReferrals: { type: "integer" },
            completionRate: { type: "number", description: "Percentage 0–100" },
            avgAcceptanceMinutes: { type: "number" },
            criticalCount: { type: "integer" },
            topRejectionReason: { type: "string", nullable: true },
            byStatus: {
              type: "object",
              additionalProperties: { type: "integer" },
            },
            insight: { type: "string", description: "AI-generated plain-language insight" },
          },
        },
        // ── Errors ────────────────────────────────────────────────────────────
        Error: {
          type: "object",
          properties: {
            error: { type: "string" },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    paths: {
      // ── Auth ────────────────────────────────────────────────────────────────
      "/api/auth/register": {
        post: {
          tags: ["Auth"],
          summary: "Register a new user",
          description: "PHC_WORKER registration is open. HOSPITAL_STAFF and ADMIN require a valid admin JWT in the Authorization header.",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RegisterRequest" },
              },
            },
          },
          responses: {
            201: {
              description: "User created",
              content: { "application/json": { schema: { $ref: "#/components/schemas/LoginResponse" } } },
            },
            400: { description: "Validation error" },
            403: { description: "Admin token required for this role" },
            404: { description: "Facility not found" },
            409: { description: "Email already registered" },
          },
        },
      },
      "/api/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Login and receive JWT",
          security: [],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/LoginRequest" } } },
          },
          responses: {
            200: { description: "Success", content: { "application/json": { schema: { $ref: "#/components/schemas/LoginResponse" } } } },
            401: { description: "Invalid credentials", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/api/auth/me": {
        get: {
          tags: ["Auth"],
          summary: "Get current authenticated user",
          responses: {
            200: { description: "Current user", content: { "application/json": { schema: { $ref: "#/components/schemas/LoginResponse" } } } },
            401: { description: "Unauthorized" },
          },
        },
      },
      "/api/auth/users": {
        get: {
          tags: ["Auth"],
          summary: "List all users (admin only)",
          responses: {
            200: { description: "Array of users" },
            403: { description: "Admin only" },
          },
        },
      },
      // ── Facilities ──────────────────────────────────────────────────────────
      "/api/facilities": {
        get: {
          tags: ["Facilities"],
          summary: "List all facilities with live status",
          responses: {
            200: { description: "Array of facilities", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Facility" } } } } },
          },
        },
      },
      "/api/facilities/{id}/status": {
        patch: {
          tags: ["Facilities"],
          summary: "Update facility live indicators",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/FacilityStatusUpdate" } } },
          },
          responses: {
            200: { description: "Updated facility", content: { "application/json": { schema: { $ref: "#/components/schemas/Facility" } } } },
            403: { description: "Insufficient permissions" },
          },
        },
      },
      // ── Referrals ───────────────────────────────────────────────────────────
      "/api/referrals": {
        post: {
          tags: ["Referrals"],
          summary: "Create referral from raw clinical notes (AI structures them)",
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/CreateReferralRequest" } } },
          },
          responses: {
            201: { description: "Created referral", content: { "application/json": { schema: { $ref: "#/components/schemas/Referral" } } } },
            400: { description: "Validation error" },
          },
        },
        get: {
          tags: ["Referrals"],
          summary: "List referrals filtered by user's facility",
          parameters: [
            { name: "status", in: "query", schema: { type: "string" } },
            { name: "facilityId", in: "query", schema: { type: "string" }, description: "Admin only" },
          ],
          responses: {
            200: { description: "Array of referrals", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Referral" } } } } },
          },
        },
      },
      "/api/referrals/{id}": {
        get: {
          tags: ["Referrals"],
          summary: "Get single referral with full event history",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            200: { description: "Referral with events", content: { "application/json": { schema: { $ref: "#/components/schemas/Referral" } } } },
            404: { description: "Not found" },
          },
        },
      },
      "/api/referrals/{id}/match": {
        post: {
          tags: ["Referrals"],
          summary: "Run matching engine — returns top 3 facility candidates",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            200: { description: "Match results", content: { "application/json": { schema: { $ref: "#/components/schemas/MatchResponse" } } } },
            422: { description: "Not in matchable state or no facilities found" },
          },
        },
      },
      "/api/referrals/{id}/accept": {
        post: {
          tags: ["Referrals"],
          summary: "Hospital accepts referral (MATCHED → ACCEPTED)",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            200: { description: "Updated referral" },
            422: { description: "Invalid transition" },
          },
        },
      },
      "/api/referrals/{id}/reject": {
        post: {
          tags: ["Referrals"],
          summary: "Hospital rejects referral — triggers auto re-match",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/RejectRequest" } } },
          },
          responses: {
            200: { description: "Updated referral" },
            422: { description: "Invalid transition" },
          },
        },
      },
      "/api/referrals/{id}/status": {
        post: {
          tags: ["Referrals"],
          summary: "Advance status: IN_TRANSIT → ARRIVED → CARE_CONFIRMED",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/StatusRequest" } } },
          },
          responses: {
            200: { description: "Updated referral" },
            422: { description: "Invalid transition" },
          },
        },
      },
      "/api/referrals/{id}/feedback": {
        post: {
          tags: ["Referrals"],
          summary: "Submit feedback note — moves referral to FEEDBACK_SENT",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/FeedbackRequest" } } },
          },
          responses: {
            201: { description: "Feedback note created", content: { "application/json": { schema: { $ref: "#/components/schemas/FeedbackNote" } } } },
            422: { description: "Referral not in CARE_CONFIRMED state" },
          },
        },
      },
      // ── Analytics ───────────────────────────────────────────────────────────
      "/api/analytics/summary": {
        get: {
          tags: ["Analytics"],
          summary: "System metrics + AI plain-language insight",
          responses: {
            200: { description: "Analytics summary", content: { "application/json": { schema: { $ref: "#/components/schemas/AnalyticsSummary" } } } },
          },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
