import dotenv from "dotenv";
import ms from "ms";

const ENV = process.env.NODE_ENV ?? "development";
dotenv.config({ path: `.env.${ENV}` });

interface ServerConfig {
  PORT: number;
}

// DB_CONFIG is a discriminated union — DB_URL takes priority (Render production)
interface DbConfigUrl {
  URL: string;
}

interface DbConfigCredentials {
  ENV: string;
  HOST: string;
  PORT: number;
  NAME: string;
  USER: string;
  PASSWORD: string | undefined;
}

type DbConfig = DbConfigUrl | DbConfigCredentials;

interface AuthConfig {
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
}

interface CookieConfig {
  NAME: string;
  HTTP_ONLY: boolean;
  SECURE: boolean;
  // "none" required for cross-site cookies in production (Render + Vercel); "lax" for local dev
  SAME_SITE: "none" | "lax";
  MAX_AGE: number;
}

export const SERVER: ServerConfig = {
  PORT: Number(process.env.PORT) || 22000,
};

export const FRONTEND_SERVER: string =
  process.env.FRONTEND_URL ?? "http://localhost:5173";

// DB_URL takes priority if present, otherwise use individual credentials (Render doesn't support env vars with multiple values, like DB_HOST, DB_PORT, etc.)
export const DB_CONFIG: DbConfig = process.env.DB_URL
  ? { URL: process.env.DB_URL }
  : {
      ENV,
      HOST: process.env.DB_HOST ?? "localhost",
      PORT: Number(process.env.DB_PORT) || 5432,
      NAME: process.env.DB_NAME ?? "reservation",
      USER: process.env.DB_USER ?? "postgres",
      PASSWORD: process.env.DB_PASSWORD,
    };

export const AUTH_CONFIG: AuthConfig = {
  // Cast is safe — server.ts validates JWT_SECRET is present before the app starts
  JWT_SECRET: process.env.JWT_SECRET as string,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? "2h",
};

export const COOKIE_CONFIG: CookieConfig = {
  NAME: process.env.COOKIE_NAME || "accessToken",
  HTTP_ONLY: true,
  SECURE: ENV === "production",
  SAME_SITE: ENV === "production" ? "none" : "lax",
  // cast needed — JWT_EXPIRES_IN comes from env (string), ms() expects branded StringValue
  MAX_AGE: ms(AUTH_CONFIG.JWT_EXPIRES_IN as ms.StringValue),
};

export { ENV };
