# Design QA

## Source visual truth

- Source: Google AI Studio app, https://ai.studio/apps/0e11fa99-be13-467c-863e-ef8f24972aff
- Reference state: authenticated staff pickup console with a live sibling queue
- Reference capture: full browser viewport, approximately 1664 x 936
- Intentional scope changes: analytics, announcements, biometric sign-in, Apple sign-in, staff PIN, and production identity flows are excluded from this first slice

## Implementation evidence

- Route: http://127.0.0.1:4173/school
- State: two siblings checked in by Carlos Garcia with the note “Blue Honda in lane 2”
- Capture: full visible in-app browser viewport, 1265 x 712
- Focused region: queue header, status counters, sibling group action, and individual pickup cards

## Comparison

The implementation preserves the reference product's two-portal model, bright neutral canvas, translucent white cards, compact role switch, blue operational actions, sibling grouping, live queue hierarchy, and recent-dismissal area. The pilot intentionally replaces reference-only demo features with a complete guardian-to-staff workflow.

| Check                                                             | Result |
| ----------------------------------------------------------------- | ------ |
| Guardian and staff surfaces are visually distinct but coherent    | passed |
| Primary queue action and current state are immediately legible    | passed |
| Siblings can be recognized and advanced as one pickup             | passed |
| Guardian note is visible at the point of staff action             | passed |
| Desktop layout remains usable without overlap or clipped controls | passed |

## Interaction verification

1. Selected Mia Garcia and Lucas Garcia in the guardian portal.
2. Added a pickup note and announced arrival.
3. Confirmed both records appeared in the staff queue with queue positions and the persisted note.
4. Advanced the sibling group through waiting, ready, released, and complete.
5. Confirmed both students appeared in Recently dismissed.
6. Checked browser logs; no application errors were present.

## Comparison history

- Pass 1: matched the core visual language and portal structure from the Studio reference.
- Pass 2: verified the populated staff queue at the same desktop scale and confirmed the operational hierarchy.
- Pass 3: completed the entire state transition and checked the final empty-queue and dismissal-history states.

final result: passed
