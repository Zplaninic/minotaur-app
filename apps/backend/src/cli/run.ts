import { parseArgs, type ParseArgsOptionsConfig } from "node:util";
import { prisma, type Db } from "../db/client.js";
import { AppError } from "../errors.js";

export type Options = Record<string, string | undefined>;

// Shared frame for the backend commands: parses --options, runs the command,
// prints a readable error, and always closes the database connection.
export const runCommand = async (
  usage: string,
  options: ParseArgsOptionsConfig,
  command: (db: Db, values: Options) => Promise<string>,
): Promise<void> => {
  try {
    const { values } = parseArgs({ options, strict: true });
    console.log(await command(prisma, values as Options));
  } catch (error) {
    const message = error instanceof AppError || error instanceof Error ? error.message : String(error);
    console.error(`${message}\n\nUsage: ${usage}`);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
};

export const required = (values: Options, name: string): string => {
  const value = values[name];
  if (!value) {
    throw new Error(`--${name} is required`);
  }
  return value;
};

export const requiredId = (values: Options, name: string): number => {
  const value = Number(required(values, name));
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`--${name} must be a positive whole number`);
  }
  return value;
};
