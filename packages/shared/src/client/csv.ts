const DELIMITERS = ["\t", ";", ","] as const;

const BOM = "﻿";

// Spreadsheets export with tabs, semicolons (Croatian Excel) or commas: the
// one the header line uses most wins.
export const detectDelimiter = (text: string): string => {
  const header = text.split(/\r\n|\n|\r/, 1)[0] ?? "";
  const counts = DELIMITERS.map((delimiter) => header.split(delimiter).length - 1);
  const best = Math.max(...counts);
  return best === 0 ? "," : (DELIMITERS[counts.indexOf(best)] ?? ",");
};

// RFC 4180 records: quoted fields may hold the delimiter, line breaks and "" for a quote.
export const parseCsv = (input: string, delimiter = detectDelimiter(input)): string[][] => {
  const text = input.startsWith(BOM) ? input.slice(BOM.length) : input;
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;
  let index = 0;

  const endField = (): void => {
    record.push(field);
    field = "";
  };
  const endRecord = (): void => {
    endField();
    records.push(record);
    record = [];
  };

  while (index < text.length) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 2;
        continue;
      }
      if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      index += 1;
      continue;
    }

    if (char === '"' && field === "") {
      quoted = true;
    } else if (char === delimiter) {
      endField();
    } else if (char === "\r" || char === "\n") {
      endRecord();
      if (char === "\r" && text[index + 1] === "\n") {
        index += 1;
      }
    } else {
      field += char;
    }
    index += 1;
  }

  // A file that ends with a line break has no record after it.
  if (field !== "" || record.length > 0) {
    endRecord();
  }
  return records;
};
