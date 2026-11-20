# @repo/enrollment

Turns enrollment form emails into requests and recommends a group for each
child. Pure TypeScript with no dependencies; runs in Node, the browser and
React Native. Kept self-contained so it can be open-sourced later.

## Parse a form email

```ts
import { parseEnrollmentEmail } from "@repo/enrollment";

const { enrollment, problems } = parseEnrollmentEmail(emailText);
// enrollment: { parent: { name, surname, phone, email }, children: [{ name, age }] }
// problems:   [{ field: "childAge", code: "child_count_mismatch" }, ...]
```

- Labels default to the Minotaur web form (`Ime Roditelja`, `Telefon`,
  `Email`, `Ime Djeteta`, `Dob Djeteta`) and common other spellings
  (`E-mail`, `E-pošta`, `Mobitel`, `Dob`, …); pass your own as the second
  argument.
- A value is on the label's line (`Telefon: 091...`) or the next non-blank line.
- Several children: `Jan, Eva` with `9, 7,5` are paired by position. `, `,
  `;`, `/`, ` i ` and ` and ` separate; a comma between digits is a decimal.
- The result always holds what could be read, so a person can fix the rest.
  Problem codes: `missing`, `invalid_age`, `child_count_mismatch`.

## Recommend a group

```ts
import { recommendGroups } from "@repo/enrollment";

recommendGroups(4.5, [
  { id: "a", ageFrom: 4, ageTo: 6, maxMembers: 12, members: 9, pending: 1 },
  { id: "b", ageFrom: 4, ageTo: 8, maxMembers: null, members: 20, pending: 0 },
]);
// [{ groupId: "a", freeSpots: 2, full: false },
//  { groupId: "b", freeSpots: null, full: false }]
```

Groups fit when the age in whole years is inside their range. They are
ranked: groups with room before full ones (a member limit is soft, so full
groups stay in the list), then the narrowest age range (a 5–7 group beats an
open group for a six-year-old), then most free spots (no limit beats any
limit), then fewest members. `pending` is the number of open requests already
recommended to the group, so two children are not sent to the same last place.
