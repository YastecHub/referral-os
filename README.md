# ReferralOS — Backend API

Real-time emergency maternal referral coordination system for Nigerian PHCs and hospitals.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy env template and fill in your values
cp .env.example .env

# 3. Generate Prisma client
npm run db:generate

# 4. Run migrations
npm run db:migrate

# 5. Seed demo data (8 facilities + 6 referral scenarios)
npm run db:seed

# 6. Start dev server
npm run dev
```

Server runs at `http://localhost:4000`

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | MongoDB connection string (Atlas or local) |
| `JWT_SECRET` | ✅ | Long random string for signing JWTs |
| `JWT_EXPIRES_IN` | ❌ | Token lifetime (default: `8h`) |
| `AI_PROVIDER` | ❌ | `groq`, `claude`, or `openai` (default: `groq`) |
| `GROQ_API_KEY` | ❌ | Required if `AI_PROVIDER=groq` |
| `ANTHROPIC_API_KEY` | ❌ | Required if `AI_PROVIDER=claude` |
| `OPENAI_API_KEY` | ❌ | Required if `AI_PROVIDER=openai` |
| `PORT` | ❌ | Server port (default: `4000`) |
| `CLIENT_ORIGIN` | ❌ | Frontend URL for CORS (default: `http://localhost:3000`) |

> AI is optional — all engines fall back to rules-based logic if no API key is set.

---

## Swagger API Docs

Once the server is running, open:

```
http://localhost:4000/api/docs
```

All 12 endpoints are documented with request/response schemas and examples.
Click **Authorize** and paste your JWT token (from `/api/auth/login`) to test protected routes.

---

## Reset Demo Data

```bash
npm run db:reset
```

This drops all data and re-seeds 8 facilities + 6 referral scenarios.

---

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| PHC Worker | amaka@surulere-phc.ng | demo1234 |
| PHC Worker | chidi@kosofe-phc.ng | demo1234 |
| Hospital Staff | fatima@gbagada.ng | demo1234 |
| Hospital Staff | emeka@lasuth.ng | demo1234 |
| Admin | admin@referralos.ng | demo1234 |

---

## API Contract

### Auth
```
POST /api/auth/login
Body: { email, password }
Returns: { token, user }
```

### Referrals
```
POST   /api/referrals               Create referral from raw notes (AI structures them)
GET    /api/referrals               List referrals (filtered by user's facility)
GET    /api/referrals/:id           Get single referral with full event history
POST   /api/referrals/:id/match     Run matching engine → returns top 3 candidates
POST   /api/referrals/:id/accept    Hospital accepts referral
POST   /api/referrals/:id/reject    Hospital rejects + triggers auto re-match
POST   /api/referrals/:id/status    Advance status (IN_TRANSIT / ARRIVED / CARE_CONFIRMED)
POST   /api/referrals/:id/feedback  Submit feedback note → moves to FEEDBACK_SENT
```

### Facilities
```
GET    /api/facilities              List all facilities with live status
PATCH  /api/facilities/:id/status  Update facility live indicators
```

### Analytics
```
GET    /api/analytics/summary      Metrics + AI plain-language insight
```

### WebSocket
```
Channel : referral-updates
Payload : {
  referralId, refCode, status,
  sendingFacilityId, receivingFacilityId,
  urgencyTier, timestamp
}
```

---

## Status Machine

```
CREATED → MATCHED → ACCEPTED → IN_TRANSIT → ARRIVED → CARE_CONFIRMED → FEEDBACK_SENT
                ↓
            REJECTED → (auto re-match) → MATCHED
```

Every transition:
1. Is validated against the allowed transitions table
2. Creates a `ReferralEvent` record with timestamp + actor
3. Broadcasts a `referral-updates` WebSocket event

---

## Folder Structure

```
src/
  config/         prisma.ts, env.ts, socket.ts
  middleware/     auth.ts, errorHandler.ts
  engines/        ai.engine.ts, matching.engine.ts, coordination.engine.ts
  modules/
    auth/         auth.routes.ts
    referrals/    referrals.routes.ts, referral.helpers.ts
    facilities/   facilities.routes.ts
    analytics/    analytics.routes.ts
  types/          index.ts
  app.ts
  server.ts
prisma/
  schema.prisma
  seed.ts
```

---

## AI Touch Points

1. `POST /api/referrals` — raw clinical notes → structured patient summary + urgency tier
2. `POST /api/referrals/:id/match` — urgency tier informs facility scoring
3. `GET /api/analytics/summary` — plain-language insight from system metrics

All AI calls are backend-only. API keys never reach the frontend.
