import type { Month, Weekday } from "@repo/shared";
import { config } from "../config.js";
import type { Db } from "../db/client.js";
import {
  createMonthSessions,
  getGroupAttendance,
  isoDateIn,
  markAttendance,
  removeMonthMember,
} from "../services/attendance.js";
import { addGroupMember, createGroup, removeGroupMember } from "../services/groups.js";
import { createMemberWithLogin } from "../services/logins.js";
import { createMember } from "../services/members.js";
import { runCommand } from "./run.js";

// Demo data for the development database: invented trainers, groups,
// children, monthly rosters and attendance. Every name is made up.
// Runs only with NODE_ENV=development and only once: it stops when the demo
// trainers already exist. Existing data is left alone.

// Test password of both demo trainers. Development only; also in .env.example.
const DEMO_TRAINER_PASSWORD = "demo-trainer-2026";

const SEASON: readonly Month[] = ["2026-09", "2026-10", "2026-11", "2026-12"];

type DemoGroup = {
  days: Weekday[];
  from: string;
  to: string;
  // Children's birth years, oldest first.
  birthYears: [number, number];
  size: number;
};

type DemoTrainer = { name: string; surname: string; email: string; birthday: string; groups: DemoGroup[] };

const TRAINERS: readonly DemoTrainer[] = [
  {
    name: "Lorena",
    surname: "Vidmar",
    email: "lorena.vidmar@demo.example.com",
    birthday: "1994-04-18",
    groups: [
      { days: ["monday", "wednesday"], from: "17:00", to: "18:00", birthYears: [2019, 2021], size: 10 },
      { days: ["monday", "wednesday"], from: "18:00", to: "19:00", birthYears: [2015, 2018], size: 12 },
      { days: ["monday", "wednesday"], from: "19:00", to: "20:30", birthYears: [2008, 2014], size: 11 },
    ],
  },
  {
    name: "Dario",
    surname: "Kolarec",
    email: "dario.kolarec@demo.example.com",
    birthday: "1990-09-02",
    groups: [
      { days: ["tuesday", "thursday"], from: "16:30", to: "17:30", birthYears: [2019, 2021], size: 9 },
      { days: ["tuesday", "thursday"], from: "17:30", to: "19:00", birthYears: [2015, 2018], size: 12 },
      { days: ["saturday"], from: "10:00", to: "11:30", birthYears: [2008, 2014], size: 8 },
    ],
  },
];

const FIRST_NAMES = [
  "Lovro", "Mila", "Toma", "Iskra", "Fran", "Lea", "Jakša", "Nika", "Bruno", "Tena",
  "Roko", "Zara", "Teo", "Ivona", "Mateo", "Dora", "Luka", "Ema", "Noa", "Klara",
  "Vito", "Lota", "Gabriel", "Sara", "Ian", "Mia", "Leon", "Una", "Filip", "Rita",
  "Mak", "Iva", "Dino", "Lucija", "Erik", "Petra", "Oto", "Hana", "Niko", "Vita",
];

const SURNAMES = [
  "Brezovec", "Čulina", "Dragić", "Ercegovac", "Frković", "Golub", "Hrastić", "Iljazi", "Jagodić", "Kranjec",
  "Lukinić", "Mesarić", "Novosel", "Orešković", "Pavletić", "Rubinić", "Starčević", "Tomljanović", "Urem", "Vranić",
  "Zebec", "Bartolić", "Cvitan", "Dumbović", "Ferenčak", "Grgec", "Horvatek", "Jambrek", "Kosanović", "Lisac",
];

const PARENT_NAMES = ["Ana", "Ivan", "Maja", "Tomislav", "Martina", "Krešimir", "Sanja", "Goran", "Vesna", "Hrvoje"];

// mulberry32: a small seeded generator, so every run makes the same data.
const seededRandom = (seed: number) => {
  let state = seed;
  return (): number => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const random = seededRandom(2026);
const between = (min: number, max: number): number => min + Math.floor(random() * (max - min + 1));
const pick = <Item>(items: readonly Item[]): Item => items[between(0, items.length - 1)] as Item;

type DemoChild = {
  memberId: string;
  // Index into SEASON: the first and last month the child trains.
  firstMonth: number;
  lastMonth: number;
  // Chance to come to a session.
  rate: number;
};

// Most children train all season; some join late, some leave early.
const seasonSpan = (): { firstMonth: number; lastMonth: number } => {
  const roll = random();
  if (roll < 0.15) {
    return { firstMonth: between(1, 3), lastMonth: SEASON.length - 1 };
  }
  if (roll < 0.27) {
    return { firstMonth: 0, lastMonth: between(0, 2) };
  }
  return { firstMonth: 0, lastMonth: SEASON.length - 1 };
};

const usedNames = new Set<string>();

const inventChild = (birthYears: [number, number]) => {
  for (;;) {
    const name = pick(FIRST_NAMES);
    const surname = pick(SURNAMES);
    if (!usedNames.has(`${name} ${surname}`)) {
      usedNames.add(`${name} ${surname}`);
      const month = String(between(1, 12)).padStart(2, "0");
      const day = String(between(1, 28)).padStart(2, "0");
      return { name, surname, birthday: `${between(...birthYears)}-${month}-${day}` };
    }
  }
};

// Email addresses are ASCII: "Čulina" becomes "culina".
const demoEmail = (name: string, surname: string): string =>
  `${name}.${surname}@demo.example.com`
    .toLowerCase()
    .replaceAll("đ", "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const createChild = async (db: Db, orgId: string, birthYears: [number, number], today: string): Promise<string> => {
  const child = inventChild(birthYears);
  const parent = pick(PARENT_NAMES);
  const member = await createMember(
    db,
    {
      orgId,
      name: child.name,
      surname: child.surname,
      birthday: child.birthday,
      guardians: [
        {
          kind: "new",
          name: parent,
          surname: child.surname,
          email: demoEmail(parent, child.surname),
        },
      ],
    },
    today,
  );
  return member.id;
};

const seedGroup = async (db: Db, orgId: string, ownerId: string, demo: DemoGroup, today: string) => {
  const group = await createGroup(db, { ownerId, days: demo.days, from: demo.from, to: demo.to });
  const currentMonth = SEASON.indexOf(today.slice(0, 7));

  const children: DemoChild[] = [];
  for (let index = 0; index < demo.size; index += 1) {
    const memberId = await createChild(db, orgId, demo.birthYears, today);
    children.push({ memberId, ...seasonSpan(), rate: 0.55 + random() * 0.4 });
  }

  // Everyone joins the group first: with no sessions yet, no roster changes.
  for (const child of children) {
    await addGroupMember(db, group.id, child.memberId, today);
  }

  let ticks = 0;
  for (const [monthIndex, month] of SEASON.entries()) {
    // Built as if it were the first day of that month, so past months pass
    // the "current or next month" rule.
    await createMonthSessions(db, group.id, month, `${month}-01`);
    for (const child of children) {
      if (monthIndex < child.firstMonth || monthIndex > child.lastMonth) {
        await removeMonthMember(db, { groupId: group.id, month, memberId: child.memberId });
      }
    }

    const { sessions } = await getGroupAttendance(db, group.id, month);
    for (const session of sessions.filter((item) => item.date <= today)) {
      for (const child of children) {
        if (monthIndex >= child.firstMonth && monthIndex <= child.lastMonth && random() < child.rate) {
          await markAttendance(db, { groupId: group.id, sessionId: session.id, memberId: child.memberId }, today);
          ticks += 1;
        }
      }
    }
  }

  // Children who stopped before this month are no longer in the group.
  for (const child of children.filter((item) => currentMonth !== -1 && item.lastMonth < currentMonth)) {
    await removeGroupMember(db, group.id, child.memberId, today);
  }

  return { children: children.length, ticks };
};

await runCommand("pnpm --filter @repo/backend db:seed", {}, async (db) => {
  if (config.NODE_ENV !== "development") {
    throw new Error("db:seed runs only with NODE_ENV=development.");
  }
  const seeded = await db.member.count({ where: { email: { in: TRAINERS.map((trainer) => trainer.email) } } });
  if (seeded > 0) {
    throw new Error("The demo data is already there: the demo trainers exist.");
  }

  const org =
    (await db.org.findFirst({ orderBy: { id: "asc" }, select: { id: true } })) ??
    (await db.org.create({
      data: { name: "SPK Minotaur", contactName: "Demo", email: "club@demo.example.com" },
      select: { id: true },
    }));
  const orgId = String(org.id);
  const now = new Date();
  const today = isoDateIn(now, config.GYM_TIME_ZONE);

  const lines: string[] = [];
  for (const trainer of TRAINERS) {
    const trainerId = await createMemberWithLogin(
      db,
      { orgId: org.id, name: trainer.name, surname: trainer.surname, birthday: trainer.birthday, email: trainer.email },
      "trainer",
      DEMO_TRAINER_PASSWORD,
    );
    for (const group of trainer.groups) {
      const { children, ticks } = await seedGroup(db, orgId, String(trainerId), group, today);
      lines.push(
        `${trainer.name} ${trainer.surname}, ${group.days.join("/")} ${group.from}–${group.to}: ${children} children, ${ticks} ticks`,
      );
    }
  }

  return [
    `Demo data added to org ${orgId} (season ${SEASON[0]} to ${SEASON.at(-1)}, attendance up to ${today}):`,
    ...lines,
    `Trainer logins: ${TRAINERS.map((trainer) => trainer.email).join(", ")}. Password: see DEMO_TRAINER_PASSWORD in src/cli/seed.ts.`,
  ].join("\n");
});
