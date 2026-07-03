# Hooke Deployment Architecture

This document describes the deployment environments, pipeline, and operational requirements for Hooke v2.

---

## Environments

| Environment | Purpose | Branch | URL Pattern |
|---|---|---|---|
| Development | Local development | `feature/*` | `localhost:5173` |
| Preview | Branch previews | `feature/*` | Replit preview |
| Staging | Integration testing | `v2-development` | staging.hooke.app |
| Production | Live users | `main` | hooke.app |

Each environment is fully isolated. Staging uses its own Supabase project. Production uses its own Supabase project.

---

## Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React 19 + TanStack Router | SSR via TanStack Start |
| Build | Vite 8 + Nitro | `@lovable.dev/vite-tanstack-config` |
| Runtime | Node.js 20 | |
| Local storage | IndexedDB (idb-keyval) | Primary data store |
| Cloud storage | Supabase Storage | Binary assets |
| Database | Supabase PostgreSQL | Cross-device sync (Phase 6+) |
| Edge functions | Supabase Edge Functions | AI gateway (server-side routing) |
| Hosting | Replit Deployments | |

---

## Build Pipeline

### Development Build

```bash
npm run dev
# Starts Vite dev server with HMR
# Available at localhost:5173
```

### Production Build

```bash
npm run build
# Vite + Nitro build
# Output: .output/ directory
```

### Environment Validation

Before deployment, validate the environment:

```bash
npm run build
npm run type-check
npm run lint
npm test
```

All must pass. A build that fails any check is not deployable.

---

## CI/CD Pipeline

Every push to any branch triggers:

1. **Type check** — `npm run type-check`
2. **Lint** — `npm run lint`
3. **Unit tests** — `npm test`
4. **Build** — `npm run build`

Pushes to `v2-development` additionally trigger:

5. **Integration tests** — `npm run test:integration`
6. **E2E tests** — `npm run test:e2e`
7. **Bundle analysis** — size compared to last `v2-development` build
8. **Security audit** — `npm audit --audit-level=high`

Pushes to `main` additionally trigger:

9. **Staging deployment** (deploy to staging, run smoke tests)
10. **Production deployment** (only if staging passes)

---

## Environment Variables

| Variable | Environment | Required | Description |
|---|---|---|---|
| `VITE_SUPABASE_URL` | All | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | All | Yes | Supabase anonymous key |
| `NODE_ENV` | All | Auto | Set by build system |
| `NITRO_PORT` | Deployed | Auto | Port for SSR server |

**AI provider keys are NOT environment variables.** They are managed by users through the Settings UI and stored encrypted in IndexedDB.

---

## Supabase Setup

### Edge Functions

Edge functions handle server-side operations that should not be client-side:
- AI gateway routing (for providers that require server-side keys)
- Webhook processing
- Background sync

Deployed with:
```bash
supabase functions deploy --project-ref <project-ref>
```

### Storage Buckets

| Bucket | Access | Contents |
|---|---|---|
| `project-assets` | Private (per user) | Generated images, audio, video |
| `exports` | Private (per user) | Final rendered exports |

### Row Level Security

All tables have RLS enabled. Users can only access their own data.

---

## Monitoring

### Error Tracking

Runtime errors are captured and reported. Error reports include:
- Stack trace
- Browser and OS info
- Route where error occurred
- User-anonymized context (no PII in error reports)

### Performance Monitoring

Key metrics tracked:
- Largest Contentful Paint (LCP) — target < 2.5s
- Time to Interactive (TTI)
- Route transition time — target < 200ms
- AI generation duration (first token, total)

### Uptime Monitoring

- Production URL checked every 60 seconds
- Supabase health checked every 60 seconds
- Alert on consecutive failures (2+)

---

## Release Process

### Pre-Release Checklist

- [ ] All tests passing on `v2-development`
- [ ] Bundle size within budget
- [ ] Security audit clean
- [ ] Changelog written
- [ ] Documentation updated
- [ ] Staging deployment successful
- [ ] Smoke tests passing on staging
- [ ] Database migrations tested on staging
- [ ] Rollback procedure verified

### Release Steps

1. Create `release/v2.x.x` branch from `v2-development`.
2. Update version in `package.json`.
3. Write release notes.
4. Open PR to `main`.
5. Deploy to staging, run full test suite.
6. Merge to `main` after approval.
7. Production deployment triggers automatically.
8. Monitor error rates and performance for 30 minutes.
9. Tag the release on GitHub.

### Rollback Procedure

If production shows elevated error rates after deployment:

1. Redeploy the previous production build (Replit checkpoint or tagged release).
2. Verify rollback by checking error rates drop to baseline.
3. Identify root cause before attempting re-deployment.
4. Fix, test on staging, re-deploy.

---

## Database Migrations

All schema changes go through migrations:

1. Write migration file: `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
2. Test migration on local Supabase: `supabase db reset`
3. Test migration on staging (with production-like data snapshot if available)
4. Apply to production as part of the release.

Migrations must be:
- Backward compatible (old code can run against new schema) OR
- Deployed atomically with the code change that requires them

---

*Deployment reliability is a platform requirement, not an afterthought. Every release is verified before users see it.*
