# Coding Agent Contract

These instructions govern every coding pass in this repository.

## Scope lock

Every pass has exactly one named outcome. Do not expand that outcome while working.

Before editing, state:

- **Pass:** one user-visible outcome.
- **In scope:** the smallest changes required for that outcome.
- **Explicitly out of scope:** adjacent improvements and future work.
- **Allowed surfaces:** files, routes, services, or data boundaries that may change.
- **Acceptance checks:** 3–5 observable checks.
- **Stop condition:** the exact point at which the pass ends.

During the pass:

- Implement only what is required for the named outcome and acceptance checks.
- Do not add refactors, cleanup, integrations, abstractions, analytics, infrastructure, or redesigns unless they are required by an acceptance check.
- Record newly discovered ideas in the final report or a parking-lot note; do not implement them.
- If completing the acceptance checks would require changing the product workflow, repository foundation, data model beyond the stated slice, or adding infrastructure, stop and ask for explicit approval.
- Treat “make it better,” “continue,” and “finish” as insufficient permission to expand the current pass.

At completion:

- Stop immediately after the acceptance checks pass or a required blocker is confirmed.
- Do not begin another pass automatically.
- Report only:
  1. acceptance checks that work,
  2. acceptance checks that do not work,
  3. files or surfaces changed,
  4. one smallest recommended next action.
- The next action is only a recommendation; wait for explicit user direction before implementing it.

## Pass template

Use this contract before each implementation pass:

```text
PASS: <one visible outcome>

IN SCOPE:
- <required change>

OUT OF SCOPE:
- <adjacent feature or improvement>

ALLOWED SURFACES:
- <files, routes, services, or data boundaries>

ACCEPTANCE CHECKS:
- <observable check>
- <observable check>

STOP WHEN:
- <exact completion point>

Do not start another pass after this.
```
