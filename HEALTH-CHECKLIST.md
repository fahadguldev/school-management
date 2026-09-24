# Full-Stack Health Checklist

Use this checklist before merging major changes, deploying, or debugging production-like issues.

## 1) Environment & Dependencies

- [ ] Node.js version is `>=18` for backend compatibility.
- [ ] Dependencies are installed in all workspaces:
  - [ ] Root: `npm install`
  - [ ] Backend: `cd backend && npm install`
  - [ ] Frontend: `cd frontend && npm install`
- [ ] Required env files exist:
  - [ ] `backend/.env`
  - [ ] `frontend/.env.local`
- [ ] `frontend/.env.local` points to backend API (`NEXT_PUBLIC_API_URL`).

## 2) Backend Health (NestJS + TypeORM)

From `backend/`:

- [ ] Type-check passes: `npm run typecheck`
- [ ] Tests pass: `npm test`
- [ ] Build passes: `npm run build`
- [ ] Service boots cleanly: `npm run start:dev`
- [ ] Health endpoint responds:
  - [ ] `GET /health` returns `{ "status": "ok" }`
  - [ ] `GET /` returns status + message
- [ ] Auth flow sanity:
  - [ ] `POST /auth/bootstrap-school`
  - [ ] `POST /auth/login`
  - [ ] `POST /auth/refresh`
  - [ ] Protected route access requires valid `Authorization: Bearer <token>`

## 3) Frontend Health (Next.js)

From `frontend/`:

- [ ] Lint passes: `npm run lint`
- [ ] Production build passes: `npm run build`
- [ ] App runs locally: `npm run dev`
- [ ] Core pages render without console/runtime errors.
- [ ] Frontend can reach backend using configured `NEXT_PUBLIC_API_URL`.

## 4) API + UI Integration

- [ ] Start both apps:
  - [ ] Backend: `npm run dev:backend`
  - [ ] Frontend: `npm run dev:frontend`
- [ ] Login from UI succeeds and token-based requests work.
- [ ] At least one protected workflow works end-to-end (e.g., create/read a domain entity such as students, classes, or subjects).
- [ ] Invalid/expired token behavior is handled gracefully in UI.

## 5) Data Layer & Multi-Tenancy Safety

- [ ] Backend connects to intended database (not accidental fallback).
- [ ] Tenant-isolated data behavior is verified for authenticated requests.
- [ ] CRUD operations for key modules succeed against real DB:
  - [ ] Users
  - [ ] Students
  - [ ] Teachers
  - [ ] Classes
  - [ ] Subjects
- [ ] No destructive schema sync is enabled unintentionally in production-like envs.

## 6) Security & Operational Checks

- [ ] No secrets are committed to git (`.env*` files ignored and sanitized).
- [ ] JWT secrets are explicitly set (not default development placeholders).
- [ ] Error responses do not leak sensitive internals.
- [ ] CORS configuration is reviewed for deployment environment.
- [ ] Logging/monitoring confirms startup, auth failures, and critical API errors.

## 7) Release Readiness Quick Gate

Mark ready only if all are true:

- [ ] Backend type-check, tests, and build all pass.
- [ ] Frontend lint and build pass.
- [ ] `/health` is reachable.
- [ ] One full login + protected workflow passes from UI.
- [ ] No secret leakage and env config is validated.

