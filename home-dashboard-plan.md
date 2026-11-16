# Home dashboard (web + mobile)

The main page becomes a dashboard for trainers and admins, with three
sections: Today's trainings, Needs attention, and Month overview. Money data
comes from the existing `/subscriptions/summary` and `/subscriptions/overdue`
endpoints. One new endpoint, `GET /dashboard`, adds the rest.

## Decisions
- Today's trainings: every group with a session today, the logged-in member's
  own groups first, then by start time. Each row shows the time, trainer and
  member count, and links to that group's attendance page.
- Needs attention:
  - unpaid members this month (`summary.unpaid`) and overdue members from
    past months (`overdue.items.length`, `overdue.total`). Both link to
    payments.
  - members on a roster this month who have no subscription set. Each links
    to the attendance page of their first group, where the subscription is
    set.
  - When nothing needs attention, the section shows "All good".
- Month overview: active members, expected vs collected fees, and the
  attendance rate for the current month.
- Gating, all through `ability.can`, with no new CASL rules:
  - Today's trainings needs `read Group`.
  - Needs attention and Month overview need `read Attendance`; their money
    parts also need `read Subscription`.
  - Today that covers both trainers and admins.
- The gym's "today" comes from the backend (`GYM_TIME_ZONE`) in the
  dashboard response, so clients never guess the date from the device clock.
- Mobile keeps the nav buttons, language switcher and logout below the
  dashboard.

## API contract (new)
`GET /dashboard`, `onRequest: requireAbility("read", "Attendance")`, returns
200, 401, 403 and 500:
```ts
dashboardResponse = z.object({
  today: z.iso.date(),          // at the gym
  month,                        // month of today
  activeMembers: count,         // not archived, roles child + member
  withoutSubscription: z.array(z.object({
    id, name: z.string(), surname: z.string(),
    groupIds: z.array(id).min(1),   // groups whose roster they are on this month, by id
  })),                          // by surname, name; archived members left out
  attendance: z.object({
    expected: count,            // sum of roster size over this month's sessions dated <= today
    attended: count,            // attendance rows for those sessions
  }),
})
```
The attendance rate is `attended / expected`, computed by a shared client
helper. Nothing is shown when `expected` is 0.

## Steps
- [x] 1. Shared: `types/dashboard.ts` (`dashboardResponse`); in `client/`:
       `dashboard.ts` (keys, query options), `groupsTrainingOn(groups, today, myId)`
       (filter by weekday, mine first, then by `from`), and
       `attendanceRate`. Unit tests. Then build shared and typecheck all apps.
- [x] 2. Backend: `services/dashboard.ts` and `routes/dashboard.ts`,
       registered at `/dashboard`. Service tests against the test DB, and
       route tests (200 for admin and trainer, 401). No role that can log in
       lacks `read Attendance`, so 403 is declared but cannot be tested yet.
- [x] 3. Frontend: `features/dashboard/` (`TodayTrainings`, `NeedsAttention`,
       `MonthOverview`) and `api/dashboard.ts` hook. HomePage keeps the logo
       and renders the sections. Each section has loading, error and empty
       states. Add en + hr messages and CSS that uses only tokens. Tests for
       the main flow, the empty state and the error state.
- [x] 4. Mobile: the same three sections in `features/home/`, with the same
       states plus no connection. Lists are capped at 5 rows inside
       the screen's scroll view. On mobile, a member's name opens the
       member-subscription screen directly. Add en + hr messages and use
       tokens. Jest tests.
- [x] 5. Typecheck, lint, and test every touched package. Then write the
       summary and the visual checklist.
