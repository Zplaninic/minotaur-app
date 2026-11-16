# Structure cleanup plan

Refactor only: no API contract, schema, or behaviour changes. Every step must
leave typecheck, lint, and tests green.

Baseline (before any change): shared, backend, frontend, mobile all pass
typecheck, lint, and tests (backend 245, frontend 75, mobile 87, shared 163).

## Steps

- [x] 1. Backend: move date and month helpers out of `services/attendance.ts`
      into `services/dates.ts`; drop the copies in `services/members.ts`;
      point every importer at the new module.
- [x] 2. Backend: one `requireDbId(value, message)` in `services/ids.ts`,
      replacing the private copies in attendance and members services.
- [x] 3. Backend: one roster-or-404 helper in the attendance service instead of
      the three copies of "on roster, else member exists".
- [x] 4. Backend: `getGroupAttendance` groups ticks by member once instead of
      filtering the whole list per member.
- [x] 5. Backend: `routes/responses.ts` with `errorResponses(...)` and
      `guardedErrorResponses(...)`; routes use them instead of repeating
      `401/403/500: errorResponse` by hand. Declared status codes stay identical.
- [x] 6. Verify: shared build, then typecheck, lint, test for every package;
      compare test counts to the baseline.

Result: all packages pass typecheck, lint, and tests; backend build passes.
Backend tests 248 (baseline 245 plus 3 new: `nextMonth`, `errorResponses`,
`guardedErrorResponses`); frontend, mobile, and shared counts unchanged. A
script confirmed that all 33 routes declare the same status codes as before.
