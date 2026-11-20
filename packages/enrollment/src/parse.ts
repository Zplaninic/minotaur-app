export type EnrollmentField = "parentName" | "phone" | "email" | "childName" | "childAge";

// The labels each field may have in the email, matched ignoring case.
export type EnrollmentLabels = Record<EnrollmentField, readonly string[]>;

// The labels of the Minotaur club's web form.
export const DEFAULT_LABELS: EnrollmentLabels = {
  parentName: ["Ime Roditelja", "Ime i prezime roditelja", "Roditelj"],
  phone: ["Telefon", "Mobitel", "Broj telefona", "Kontakt telefon"],
  email: ["Email", "E-mail", "E-pošta", "Mail"],
  childName: ["Ime Djeteta", "Ime i prezime djeteta", "Dijete"],
  childAge: ["Dob Djeteta", "Dob", "Godine"],
};

export type ParsedChild = {
  name: string;
  // Years, at most one decimal. Null when the age is missing or unreadable.
  age: number | null;
};

export type ParsedEnrollment = {
  parent: { name: string; surname: string | null; phone: string | null; email: string | null };
  children: ParsedChild[];
};

export type ParseProblemCode = "missing" | "invalid_age" | "child_count_mismatch";

export type ParseProblem = { field: EnrollmentField; code: ParseProblemCode };

// Everything that could be read, plus what could not. A caller shows both and
// lets a person fix the rest.
export type ParseResult = { enrollment: ParsedEnrollment; problems: ParseProblem[] };

export const MAX_AGE = 99;

const FIELDS = Object.keys(DEFAULT_LABELS) as EnrollmentField[];

type LabelMatch = { field: EnrollmentField; rest: string };

// "Telefon: 091..." and "Telefon:" both match; "Telefonski broj: ..." does not.
const matchLabel = (line: string, labels: EnrollmentLabels): LabelMatch | undefined => {
  const trimmed = line.trim();
  const lower = trimmed.toLowerCase();
  for (const field of FIELDS) {
    for (const label of labels[field]) {
      if (!lower.startsWith(label.toLowerCase())) {
        continue;
      }
      const rest = trimmed.slice(label.length).trim();
      if (rest === "" || rest.startsWith(":")) {
        return { field, rest: rest.replace(/^:/, "").trim() };
      }
    }
  }
  return undefined;
};

// The value is on the label's line, or else on the next non-blank line that is not a label.
const readFields = (text: string, labels: EnrollmentLabels): Partial<Record<EnrollmentField, string>> => {
  const lines = text.split(/\r?\n/);
  const values: Partial<Record<EnrollmentField, string>> = {};
  lines.forEach((line, index) => {
    const match = matchLabel(line, labels);
    if (!match || values[match.field] !== undefined) {
      return;
    }
    if (match.rest !== "") {
      values[match.field] = match.rest;
      return;
    }
    const next = lines.slice(index + 1).find((candidate) => candidate.trim() !== "");
    if (next !== undefined && matchLabel(next, labels) === undefined) {
      values[match.field] = next.trim();
    }
  });
  return values;
};

// "marko" becomes "Marko", "ana-marija" becomes "Ana-Marija". The rest of
// each word is left as written.
export const capitalizeName = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .map((word) =>
      word
        .split("-")
        .map((part) => part.charAt(0).toLocaleUpperCase() + part.slice(1))
        .join("-"),
    )
    .join(" ");

const splitParentName = (text: string): { name: string; surname: string | null } => {
  const [name = "", ...surname] = capitalizeName(text).split(" ");
  return { name, surname: surname.length > 0 ? surname.join(" ") : null };
};

const splitNames = (text: string): string[] =>
  text
    .split(/\s*[,;/]\s*|\s+(?:i|and)\s+/i)
    .map(capitalizeName)
    .filter((name) => name !== "");

// A comma followed by a space separates ages; a comma between digits is a
// decimal comma, so "9, 7,5" is 9 and 7.5.
const splitAges = (text: string): string[] =>
  text
    .split(/\s*[;/]\s*|,\s+|\s+(?:i|and)\s+/i)
    .map((age) => age.trim())
    .filter((age) => age !== "");

// "4", "4.5", "4,5" and "4,5 godina" are read; anything else is null.
export const parseAge = (text: string): number | null => {
  const match = /^(\d{1,2})(?:[.,](\d))?(?:\s+\p{L}.*)?$/u.exec(text.trim());
  if (!match) {
    return null;
  }
  const age = Number(`${match[1]}.${match[2] ?? "0"}`);
  return age <= MAX_AGE ? age : null;
};

export const parseEnrollmentEmail = (text: string, labels: EnrollmentLabels = DEFAULT_LABELS): ParseResult => {
  const fields = readFields(text, labels);
  const problems: ParseProblem[] = [];
  const missing = (field: EnrollmentField): void => {
    problems.push({ field, code: "missing" });
  };

  if (fields.parentName === undefined) missing("parentName");
  if (fields.phone === undefined) missing("phone");
  if (fields.email === undefined) missing("email");
  if (fields.childName === undefined) missing("childName");
  if (fields.childAge === undefined) missing("childAge");

  const names = splitNames(fields.childName ?? "");
  const ageTexts = splitAges(fields.childAge ?? "");
  if (names.length > 0 && ageTexts.length > 0 && names.length !== ageTexts.length) {
    problems.push({ field: "childAge", code: "child_count_mismatch" });
  }

  const children = Array.from({ length: Math.max(names.length, ageTexts.length) }, (_, index): ParsedChild => {
    const ageText = ageTexts[index];
    return { name: names[index] ?? "", age: ageText === undefined ? null : parseAge(ageText) };
  });
  if (ageTexts.some((ageText) => parseAge(ageText) === null)) {
    problems.push({ field: "childAge", code: "invalid_age" });
  }

  return {
    enrollment: {
      parent: {
        ...splitParentName(fields.parentName ?? ""),
        phone: fields.phone ?? null,
        email: fields.email?.toLowerCase() ?? null,
      },
      children,
    },
    problems,
  };
};
