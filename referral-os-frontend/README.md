# ReferralOS — Frontend (`referral-os-frontend`)

This directory contains the user-facing web application for ReferralOS (Healthcare Worker Receiving & Sending Portals, Facility Dashboards, and Network Command Centre).

It is a React/Vite frontend with reusable components, responsive layouts, mock data, and a backend-ready API/service boundary.

## Quick Start
```bash
npm install
npm run dev
```

## Routes

`/` `/signin` `/signup` `/dashboard` `/sending` `/receiving` `/admin`

Use an email containing `admin` on sign-in for the admin demo, or use “Sign in as Admin”.

## Backend API Connection

By default, the backend API is hosted at:
- **Local Dev**: `http://localhost:4000/api`
- **Interactive Swagger Docs**: `http://localhost:4000/api/docs`
- **Real-Time WebSockets**: `http://localhost:4000`

See [FRONTEND_INTEGRATION.md](../referral-os-backend/FRONTEND_INTEGRATION.md) in `referral-os-backend` for full endpoint documentation, auth flows, payloads, and TypeScript types.
