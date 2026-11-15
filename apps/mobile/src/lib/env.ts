import { z } from "zod";

const envSchema = z.object({
  EXPO_PUBLIC_API_URL: z.url(),
});

// Expo only inlines EXPO_PUBLIC_ variables that are read with this exact
// `process.env.NAME` form, so they are listed one by one.
export const env = envSchema.parse({
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
});
