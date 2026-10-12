# Pilot-SD

Pilot-SD is a focused school dismissal pilot for guardians and carline staff.

## Current pilot flow

- Guardians see only their authorized students.
- A guardian can announce arrival for one student or a sibling group and include a pickup note.
- Staff see arrivals in a live queue and advance students through `waiting`, `ready`, `released`, and `complete`.
- Completed pickups remain visible in the recent dismissal history.
- Every school-local date gets a separate run, so operational status never carries into the next day.
- Pilot data persists in the browser so the flow can be demonstrated without external services.

Open the family portal at `/guardian` and the separate school workspace at `/school`. The legacy `/staff` route redirects to `/school`.

## Run locally

Requirements: Node.js 24 and pnpm 11.

```bash
pnpm install --frozen-lockfile
pnpm --filter @openhall/web dev
```

## Verify

```bash
pnpm --filter @openhall/web build
```

Then complete the real browser flow: announce a guardian arrival, confirm it appears in the staff queue, and advance the pickup through completion.

## Intentionally not in the first slice

Production authentication, durable server storage, notifications, vehicle administration, analytics, and deployment are not part of this browser-persisted pilot slice. The existing shared UI, authentication, tenancy, roster, API, and database foundations remain available for the next phase.
