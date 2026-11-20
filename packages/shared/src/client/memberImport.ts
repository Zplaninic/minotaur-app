import {
  importMemberRow,
  importMembersResponse,
  MAX_IMPORT_ROWS,
  type ImportMemberRow,
  type ImportMembersBody,
  type ImportMembersResponse,
} from "../types/memberImport.js";
import type { ApiClient } from "./apiClient.js";
import { attendanceKeys } from "./attendance.js";
import { parseCsv } from "./csv.js";
import { guardianKeys } from "./guardians.js";
import { memberKeys } from "./members.js";
import { subscriptionKeys } from "./subscriptions.js";

export type ImportField = keyof ImportMemberRow;

export const IMPORT_FIELDS: readonly ImportField[] = [
  "name",
  "surname",
  "birthday",
  "guardianName",
  "guardianEmail",
  "subscription",
];

const REQUIRED_FIELDS: readonly ImportField[] = ["name", "surname"];

// Header names as written in the club's spreadsheet, lowercase without spaces.
const HEADERS: Record<ImportField, readonly string[]> = {
  name: ["name"],
  surname: ["surname"],
  birthday: ["birthday"],
  guardianName: ["nameguardian", "guardianname"],
  guardianEmail: ["guardianemail", "emailguardian"],
  subscription: ["subscription", "supscription"],
};

const normalizeHeader = (header: string): string => header.toLowerCase().replace(/[^\p{L}]/gu, "");

// Apps turn these codes into their own messages.
export type ImportFileError = "empty" | "missingColumns" | "tooManyRows";

export type ImportLine = {
  // The row in the spreadsheet; the header is row 1.
  row: number;
  // The text of each field as written in the file, for the preview.
  cells: Record<ImportField, string>;
  // Fields whose text is not valid. The row is only set when there are none.
  errors: ImportField[];
  member: ImportMemberRow | undefined;
};

export type ImportFile =
  | { ok: true; lines: ImportLine[] }
  | { ok: false; error: ImportFileError; missing: ImportField[] };

// "1.5.2015.", "01.05.2015" and "2015-05-01" all become 2015-05-01. Anything
// else is passed on unchanged and fails validation.
export const toIsoBirthday = (text: string): string => {
  const croatian = /^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})\.?$/.exec(text.trim());
  if (!croatian) {
    return text.trim();
  }
  const [, day = "", month = "", year = ""] = croatian;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

const optional = (value: string): string | undefined => (value.trim() === "" ? undefined : value);

const toLine = (row: number, cells: Record<ImportField, string>): ImportLine => {
  const result = importMemberRow.safeParse({
    name: cells.name,
    surname: cells.surname,
    birthday: optional(cells.birthday) && toIsoBirthday(cells.birthday),
    guardianName: optional(cells.guardianName),
    guardianEmail: optional(cells.guardianEmail),
    subscription: optional(cells.subscription),
  });
  if (result.success) {
    return { row, cells, errors: [], member: result.data };
  }
  const errors = IMPORT_FIELDS.filter((field) => result.error.issues.some((issue) => issue.path[0] === field));
  return { row, cells, errors, member: undefined };
};

// Reads a CSV export of the members spreadsheet. Unknown columns are ignored,
// and so are blank rows.
export const readImportFile = (text: string): ImportFile => {
  const [header, ...records] = parseCsv(text);
  if (header === undefined) {
    return { ok: false, error: "empty", missing: [] };
  }

  const headers = header.map(normalizeHeader);
  const columns = new Map<ImportField, number>();
  for (const field of IMPORT_FIELDS) {
    const index = headers.findIndex((name) => HEADERS[field].includes(name));
    if (index !== -1) {
      columns.set(field, index);
    }
  }
  const missing = REQUIRED_FIELDS.filter((field) => !columns.has(field));
  if (missing.length > 0) {
    return { ok: false, error: "missingColumns", missing };
  }

  const lines = records.flatMap((record, index) => {
    if (record.every((cell) => cell.trim() === "")) {
      return [];
    }
    const cell = (field: ImportField): string => {
      const column = columns.get(field);
      return column === undefined ? "" : (record[column] ?? "").trim();
    };
    const cells: Record<ImportField, string> = {
      name: cell("name"),
      surname: cell("surname"),
      birthday: cell("birthday"),
      guardianName: cell("guardianName"),
      guardianEmail: cell("guardianEmail"),
      subscription: cell("subscription"),
    };
    return [toLine(index + 2, cells)];
  });

  if (lines.length === 0) {
    return { ok: false, error: "empty", missing: [] };
  }
  if (lines.length > MAX_IMPORT_ROWS) {
    return { ok: false, error: "tooManyRows", missing: [] };
  }
  return { ok: true, lines };
};

// The members of the lines without field errors, in file order.
export const importableMembers = (lines: readonly ImportLine[]): ImportMemberRow[] =>
  lines.flatMap((line) => (line.member ? [line.member] : []));

export const importMembers = (api: ApiClient, body: ImportMembersBody): Promise<ImportMembersResponse> =>
  api.fetch("/members/import", importMembersResponse, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

// New members, new guardians, and this month's subscriptions on the sheets and in the summary.
export const keysToInvalidateAfterImportMembers = [
  memberKeys.all,
  guardianKeys.all,
  attendanceKeys.all,
  subscriptionKeys.all,
] as const;
