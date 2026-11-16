// Server configuration from the process environment (Cloud Run env vars / Secret Manager, .env.local in dev).
export const env = process.env as {
  DATABASE_URL?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  SESSION_SECRET?: string;
  ADMIN_EMAILS?: string;
};
