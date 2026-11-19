# Monthly comment per member (web + mobile)

Trainers can write a short comment for each member for each month. It lives
on `member_month`, next to the subscription and `paid`, so a member who trains
in several groups has one comment per month, shown the same in every group.

## Decisions
- Stored as a nullable `comment` on `MemberMonth`. Empty or whitespace-only
  text clears it (stored as `null`). Max 500 characters after trimming.
- Editing uses the existing `update Attendance` ability, with no new CASL rules.
  Reading comes with `read Attendance`, through the attendance response.
- Web: a "Comment" column in `AttendanceGrid`, after "Paid". It is an inline
  text input that saves on blur or Enter, and only when the value changed.
  Escape restores the saved value. While a save is in flight it shows the
  value being saved. The field error appears under the input.
- Web narrow screens: `SessionChecklist` shows the same input, full width,
  under each member's subscription and paid controls.
- Mobile: `AttendanceRow` shows the comment under the subscription/paid line
  when there is one. `MemberSubscriptionScreen` gets a multiline comment field
  with a Save button, which keeps the user on the screen, like the paid box does.
  `TextField` now passes `multiline` through.
- The comment is free text about a member, so it is never logged.

## Database (additive, no data impact)
New migration `add_month_comment`:
`ALTER TABLE member_month ADD COLUMN comment TEXT` (nullable, existing rows get `null`).

## API contract
- `attendanceMemberResponse` gets `comment: z.string().nullable()`.
- New route `PUT /groups/:id/months/:month/members/:memberId/comment`, with
  `onRequest: requireAbility("update", "Attendance")`, params `monthMemberParams`,
  body `setMonthCommentBody = { comment: monthComment }`. It returns 204, plus
  400, 401, 403, 404 and 500. A member who is not on that group's roster for
  the month gets 400 `VALIDATION_ERROR`, the same check `paid` uses.
- `monthComment` = `z.string().trim().max(MAX_MONTH_COMMENT_LENGTH)` with a
  transform that turns `""` into `null`. The body also accepts `null`.

## Steps
- [x] 1. Shared: `MAX_MONTH_COMMENT_LENGTH`, `monthComment`, `setMonthCommentBody`,
      `comment` on `attendanceMemberResponse`; client `setMonthComment` request and
      `validateMonthCommentDraft` + tests; build, then typecheck the apps.
- [x] 2. Backend: Prisma field + migration, map `comment` in `getGroupAttendance`,
      `setMonthComment` service, route; service + route tests (success,
      validation failure, not on roster, 401).
- [x] 3. Frontend: `useSetMonthComment` hook (invalidates attendance), `MonthCommentInput`
      component, grid column + CSS, en/hr messages; test for the main flow.
- [x] 4. Mobile: `useSetMonthComment` hook, comment shown in `AttendanceRow`, comment
      field on `MemberSubscriptionScreen`, en/hr messages; test for the main flow.
- [x] 5. Typecheck, lint and test every touched package. Commit per package.
