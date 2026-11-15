import { createApiClient } from "@repo/shared/client";
import { env } from "../lib/env";

// The one API client of the app. Hooks in this folder pass it to the shared queries.
export const api = createApiClient(env.VITE_API_URL);
