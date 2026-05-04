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

interface RefreshAuthConfig {
  REFRESH_TOKEN_SECRET: string;
  REFRESH_TOKEN_EXPIRES_IN: string;
}

interface RefreshCookieConfig {
  NAME: string;
  HTTP_ONLY: boolean;
  SECURE: boolean;
  SAME_SITE: "none" | "lax";
  MAX_AGE: number;
}

export const SERVER: ServerConfig = {
  PORT: Number(process.env.PORT) || 22000,
};

export const REACT_CLIENT_URL: string = process.env.REACT_CLIENT_URL ?? "http://localhost:5173";
export const FLUTTER_CLIENT_URL: string = process.env.FLUTTER_CLIENT_URL ?? "http://localhost:22002";

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
  // Throws at module init if JWT_SECRET is not set — ESM imports are hoisted so this
  // runs before any route handler or server logic can be reached
  JWT_SECRET:
    process.env.JWT_SECRET ??
    (() => {
      throw new Error("JWT_SECRET is not configured — aborting");
    })(),
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

export const REFRESH_AUTH_CONFIG: RefreshAuthConfig = {
  REFRESH_TOKEN_SECRET:
    process.env.REFRESH_TOKEN_SECRET ??
    (() => {
      throw new Error("REFRESH_TOKEN_SECRET is not configured — aborting");
    })(),
  REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN ?? "7d",
};

export const REFRESH_COOKIE_CONFIG: RefreshCookieConfig = {
  NAME: process.env.REFRESH_COOKIE_NAME || "refreshToken",
  HTTP_ONLY: true,
  SECURE: ENV === "production",
  SAME_SITE: ENV === "production" ? "none" : "lax",
  MAX_AGE: Number(process.env.REFRESH_COOKIE_MAX_AGE) || ms("7d" as ms.StringValue),
};

export { ENV };
