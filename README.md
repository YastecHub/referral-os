# ReferralOS 🏥🇳🇬

**ReferralOS** is an intelligent, multi-tier healthcare referral coordination system built for maternal, pediatric, and emergency health networks across Nigeria. It features real-time facility matching, automated triage, hands-free voice intake, and clinical translation across the 4 major Nigerian languages (**English**, **Yorùbá**, **Hausa**, and **Igbo**).

---

## 📁 Repository Structure (Monorepo)

This repository is structured as a monorepo containing both the backend service and the frontend web client:

```text
referral-os/
├── referral-os-backend/       # Node.js / Express / TypeScript / Prisma backend
│   ├── src/                  # Core modules (Auth, Referrals, Facilities, Analytics, Voice, Multilingual)
│   ├── prisma/               # MongoDB schema & seed scripts
│   ├── FRONTEND_INTEGRATION.md # API reference, auth guide, contracts & types
│   ├── package.json
│   └── tsconfig.json
│
├── referral-os-frontend/      # React / Next.js / Vite web frontend client
│   └── README.md             # Frontend setup instructions
│
├── package.json              # Monorepo workspace config & unified scripts
└── README.md
```

---

## ⚡ Quick Start

### 1. Prerequisites
- **Node.js**: v18 or later
- **npm** / **yarn** / **pnpm**
- **MongoDB Atlas** database URI
- **Groq API Key** (for AI triage, STT Whisper Large v3, and Nigerian language translations)

### 2. Backend Setup
```bash
# Navigate to backend directory
cd referral-os-backend

# Copy environment template & configure your keys
cp .env.example .env

# Install backend dependencies
npm install

# Run backend development server
npm run dev
```
The backend API will run on `http://localhost:4000`.  
- **Swagger Documentation**: `http://localhost:4000/api/docs`  
- **Health Check**: `http://localhost:4000/api/health`

### 3. Frontend Setup
```bash
# Navigate to frontend directory
cd referral-os-frontend

# Install frontend dependencies
npm install

# Run frontend development server
npm run dev
```

### 4. Running from Root
From the root repository folder, you can run:
```bash
npm run dev:backend   # Start backend
npm run dev:frontend  # Start frontend
```

---

## 👥 Teammate Collaboration & Git Workflow

### Adding Teammates on GitHub
To allow teammates to push directly to this repository:
1. Go to the GitHub repository: **`https://github.com/YastecHub/referral-os`**
2. Click **Settings** (tab at the top).
3. Click **Collaborators** (left sidebar under "Access").
4. Click **Add people** and enter each teammate's GitHub username or email address.
5. Once your teammates accept the invitation email, they will have full push access.

### Recommended Branching Strategy
- Teammates working on the frontend should work inside `referral-os-frontend/`.
- Backend developers work inside `referral-os-backend/`.
- Use feature branches:
  ```bash
  git checkout -b feat/frontend-auth
  git commit -m "feat(frontend): build registration and login UI"
  git push origin feat/frontend-auth
  ```
  Then open a Pull Request into `main`.

---

## 📚 Documentation & Integration Guide
For detailed documentation on the backend API endpoints, payload schemas, WebSocket events, and frontend code snippets (voice recorder, text-to-speech, translation), see:
👉 **[`referral-os-backend/FRONTEND_INTEGRATION.md`](./referral-os-backend/FRONTEND_INTEGRATION.md)**
