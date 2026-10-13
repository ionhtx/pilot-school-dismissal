# Project handoff

This file is the portable continuity record for this repository. It is intentionally useful without
access to the Codex account or chat that created it. Update it when a milestone lands, the deployment
changes, or the next priority is agreed.

## Snapshot

- **Snapshot date:** 2026-10-13
- **Repository:** `https://github.com/ionhtx/pilot-school-dismissal.git`
- **GitHub visibility/ID:** public repository `1414730987`
- **Default upstream branch:** `origin/main`
- **Snapshot base commit:** `dbcf273` (`Fix deployment type generation artifact`, 2026-10-12)
- **Local branch before these handoff edits:** `work`, clean and exactly aligned with `origin/main`
- **License:** Apache-2.0
- **Maturity:** early development; explicitly not production-ready and not approved for real student
  data (see `SECURITY.md`)

The repository/project name is `pilot-school-dismissal`, the internal package and architecture name
is still **OpenHall**, and the current user-facing product name is **Pilot-SD**. Older architecture and
design documents also use **WayPass**. Treat this as naming history, not three separate products.
The 2026-10-12 product rename changed user-facing strings only. On 2026-10-13, the owner decided
that active internal OpenHall/WayPass naming must also converge on Pilot-SD to prevent continuing
ambiguity. Implement that as a deliberate migration: inventory compatibility-sensitive identifiers
(cookies, database/channel names, package names, URLs, deployment resources, and generated
artifacts) before changing them rather than leaving a partial rename.

## Product in one paragraph

Pilot-SD is an open-source, self-hosted school presence and movement product. It models expected
placement, actual movement, and observed presence as different facts. The implemented system covers
school setup, session authentication, tenant-aware authorization, school administration, pass
requests and policy decisions, destination capacity/queues, explicit movement execution, realtime
invalidation, and role-focused web surfaces. It is a TypeScript monorepo with a React browser client,
Fastify API, PostgreSQL/Kysely persistence, and schema-generated HTTP types.

## Agreed next product milestone

The top priority is a **visually demonstrable, working, two-sided student pickup experience**:

- a staff dashboard for seeing and progressing pickup activity;
- a guardian experience for initiating pickup and following its status;
- both sides operating on the same real application state so a change on one side is visible on the
  other;
- a polished seeded/demo path that can be shown reliably without explaining unfinished internals.

The milestone is successful when a reviewer can complete the core pickup journey across guardian
and staff views and clearly see the state transition on both sides. First define the smallest safe
vertical slice and its state model, then build that slice end to end. Do not expand this milestone
into generalized SIS integration, native mobile clients, or production use of real student data
without a separate owner decision. The full Pilot-SD naming migration is also an accepted direction,
but should be executed as an explicit compatibility-aware change rather than mixed incidentally
into pickup feature edits.

## What is implemented

The architecture record and recent history show these working areas:

- operator bootstrap/recovery plus guided first-school setup;
- OIDC sessions and self-service email magic-link onboarding;
- tenant- and school-aware authorization with explicit capability checks;
- expected-placement resolution from schedules, rosters, and calendars;
- pass request, approval/override, cancellation, concurrency, and idempotency flows;
- destination configuration, categories, capacity reservations, queues, and reconciliation;
- student, teacher, operations, station, and administrator web experiences;
- school control-plane pages for people, locations, destinations, policies, schedules, grants, and
  audit data;
- same-origin SSE invalidation backed by the durable outbox;
- deterministic local demo data and product/wayfinder Playwright coverage;
- container build, migration job, health checks, and a Compose shape suitable for Dokploy-style
  deployment.

Most recent delivered work, newest first:

1. repaired and committed the generated browser OpenAPI type artifact (`dbcf273`);
2. added lean school-people onboarding (`e3144bb`);
3. changed user-facing branding to Pilot-SD (`f8154ce`);
4. removed the obsolete tenant-selection prompt (`c76aa6c`);
5. added self-service email magic-link onboarding (`35cb264`);
6. fixed production dependency packaging and adjusted Compose for deployment (`f5996be`, `9ac60ab`).

## Source map

| Area                    | Location                                                          | Responsibility                                                     |
| ----------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------ |
| Browser app             | `apps/web`                                                        | React Router UI, TanStack Query cache, role-specific workspaces    |
| HTTP/API composition    | `apps/api`                                                        | Fastify routes, auth adapters, SSE hub, application wiring         |
| Domain                  | `packages/domain`                                                 | Closed lifecycle states, IDs, errors, time primitives              |
| Use cases               | `packages/application`                                            | authorization, orchestration, ports, transactions, policy          |
| Persistence             | `packages/db`                                                     | PostgreSQL/Kysely adapters, migrations, demo seed, outbox listener |
| Public contracts        | `packages/contracts`                                              | TypeBox request/response schemas                                   |
| Configuration           | `packages/config`                                                 | validated runtime configuration                                    |
| Generated API artifacts | `openapi/openapi.json`, `apps/web/src/api/generated/openapi.d.ts` | committed; regenerate and verify with scripts                      |
| Architectural decisions | `docs/adr`                                                        | accepted constraints and phase decisions                           |
| Current overview        | `docs/architecture.md`, `docs/data-model.md`                      | package boundaries and model                                       |
| Product/design intent   | `docs/design`, `docs/ui-03-component-catalog.md`                  | interface principles and component catalog                         |

The dependency direction is:

```text
domain <- application <- db <- api
                  contracts <- api
                     config <- api

web (independent HTTP client shell)
test-support -> domain
```

Preserve these boundaries. In particular: the tenant is the hard security boundary; public API
contracts are not database rows; schedule-derived placement is not observed presence; HTTP remains
authoritative over realtime invalidations; and schema migrations are forward-only.

## Resume locally

Prerequisites are Node.js 24, pnpm 11, PostgreSQL 18, and optionally Docker with Compose.

```sh
git clone https://github.com/ionhtx/pilot-school-dismissal.git
cd pilot-school-dismissal
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env
docker compose up -d postgres
set -a && source .env && set +a
pnpm db:migrate
pnpm dev
```

For a deterministic product sandbox:

```sh
docker compose up -d postgres
pnpm demo
```

Then open `http://localhost:5173/demo`. The demo database is deliberately separate and is dropped
and recreated by the reset path; never point it at data that must be retained.

## Verification contract

Before handing off a code change, run:

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm db:types:check
pnpm openapi:check
```

Integration tests require a reachable PostgreSQL 18 instance. Product and wayfinder browser checks
are available through `pnpm test:product` and `pnpm test:wayfinder` when the change touches UI flows.
Generated database, OpenAPI, and browser API type artifacts are committed and must not be left stale.

### Baseline observed while preparing this handoff

These results are from the unmodified application snapshot at `dbcf273` on 2026-10-13; the handoff
edits touch Markdown only:

- `pnpm typecheck`: passed;
- `pnpm lint`: failed on the existing
  `apps/web/src/features/admin/people/PeoplePage.tsx:194` shorthand returning a void expression;
- `pnpm test:unit`: 269 passed and 10 failed; all 10 failures parse `openapi/openapi.json`, which has a
  captured `Warning: truncated output ...` preamble before the JSON document;
- `pnpm openapi:check`: failed because the committed OpenAPI document differs from regenerated
  output;
- `pnpm db:types:check`: not executed to completion because this environment did not provide
  `DATABASE_URL`;
- integration tests, browser tests, and the full build were not run for this documentation-only
  handoff.

Do not mistake the 2026-10-12 generated browser type fix for a fully green generated-artifact
baseline. Repairing the committed OpenAPI artifact and the lint violation is a concrete carryover,
but it should not be allowed to silently expand a future product task.

## Deployment and secrets

The production image serves the built browser shell from the API origin. `compose.yaml` defines
PostgreSQL, a one-shot migration service, and the application. The repository does **not** contain a
complete production environment or production secrets.

Required or operationally important configuration is documented in `.env.example`, including:

- `APP_BASE_URL`
- `DATABASE_URL` or the Compose PostgreSQL variables
- `APP_SECRET`
- `DATA_ENCRYPTION_KEY` and `DATA_ENCRYPTION_KEY_ID`
- `RESEND_API_KEY` and `RESEND_FROM_EMAIL` for email sign-in
- `TRUST_PROXY`

Never place secret values in this handoff or commit them. Transfer them through the deployment
platform or a password manager. A replacement operator also needs DNS/proxy, deployment platform,
email provider, database/backup, and GitHub access; none can be reconstructed from source control.
`TRUST_PROXY=true` is safe only when direct client access to the application is blocked by the
trusted proxy.

### Connected infrastructure evidence (2026-10-13)

- **GitHub:** the connected `ionhtx` account owns the public repository and has admin permission.
  GitHub reported no open issues or pull requests. `main` is the default branch; `qms-integration`
  also exists. Only the `ionhtx` account is installed in the current GitHub connector, so access from
  the second Codex/GitHub account is not yet verified.
- **Supabase:** the owner confirms that a Pilot-SD Supabase project exists. The connected `ionhtx`
  organization currently enumerates six projects, but none is named Pilot-SD/OpenHall or exposes the
  repository's schema; the active projects inspected belong to other products. The source also
  currently defines its own PostgreSQL 18 service in Compose and contains no Supabase integration.
  This is an unresolved access/discovery mismatch. Do not attach or modify an unrelated Supabase
  project; obtain the Pilot-SD project name/reference or connect the account/organization that owns
  it first.
- **DNS:** Hostinger contains an A record for `pilot-sd.ionstack.dev` pointing to `2.25.180.218` with
  TTL `300`. The owner supplied the Hostinger record directly on 2026-10-13. This verifies the
  intended hostname and DNS target; it does not by itself verify application health, TLS, the
  deployment platform project, or that `APP_BASE_URL` currently matches it.

## Continuity checklist

Complete this while the original account still works:

- [ ] Grant the second GitHub account access to the repository and verify it can clone and push.
- [ ] Make a second, independently controlled mirror or export if the repository owner account is a
      single point of failure.
- [x] Commit and push this handoff; chat history is not a backup.
- [ ] Verify the second operator can access the deployment platform, DNS/proxy, email provider,
      database backups, and secret manager.
- [ ] Record the production URL, deployment project name, backup/restore procedure, and responsible
      owner in a private operations record (not in the public repository).
- [x] Identify the intended Pilot-SD hostname and DNS target:
      `pilot-sd.ionstack.dev` -> `2.25.180.218` (Hostinger A record, TTL `300`).
- [ ] Rotate credentials if they were ever pasted into a chat or stored outside the secret manager.
- [ ] In Antigravity or another coding agent, open the repository root and give it the resume prompt
      below before requesting changes.

## Known gaps and decisions that are not safe to invent

Do not interpret old numbered “phase” language as the next work queue. The pickup milestone and
Pilot-SD naming direction above are owner-confirmed. The following still require resolution:

- whether a live deployment exists and, if so, its private operations/backup ownership;
- the confirmed Pilot-SD Supabase project name/reference and owning account/organization;
- the path and evidence required before any real student data is allowed;

Known technical limitations called out by the repository include production-readiness, deferred
PostgreSQL row-level security, and the absence of an outbox publisher beyond realtime invalidation.
Revalidate these statements against the current code and ADRs before turning them into work items.

## Resume prompt for another Codex account or Antigravity

Copy this prompt into a new coding session:

> Continue the Pilot-SD project in this repository. First read `PROJECT_HANDOFF.md`, `README.md`,
> `SECURITY.md`, `CONTRIBUTING.md`, `docs/architecture.md`, and the ADRs relevant to the task. Treat
> the repository and tests as the source of truth, and verify the current branch, commit, git status,
> open PRs/issues if accessible, and generated-artifact checks before editing. Preserve tenant
> isolation, package dependency direction, forward-only migrations, schema-first contracts, and the
> distinction between expected placement, actual movement, and observed presence. Do not infer a
> roadmap from old phase numbers. State any conflict between this handoff and newer code, ask before
> expanding scope, never copy secrets into source or chat, and finish by updating this handoff if the
> milestone, deployment, or agreed next priority changed.

## How to keep this handoff current

When meaningful work lands, update only the sections affected:

1. snapshot date and commit;
2. recent delivered work;
3. implemented scope or known gaps;
4. verification evidence;
5. agreed next priority and any owner decisions;
6. private operations record references, without copying secrets here.

Use commit history and tests for facts. Label owner intent as owner intent. If a future session finds
this file stale, preserve it as historical evidence until the discrepancy is reconciled.
