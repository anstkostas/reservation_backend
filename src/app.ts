import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "@/docs/swagger.js";
import { REACT_CLIENT_URL, FLUTTER_CLIENT_URL, ENV } from "@/config/env.js";
import { registerRoutes } from "@/routes/index.js";
import { globalErrorHandler } from "@/middlewares/index.js";
import { NotFoundError } from "@/errors/index.js";

const app = express();

// Security headers (CSP, X-Frame-Options, X-Powered-By removal, X-Content-Type-Options, etc.)
// Swagger UI (/api/docs) needs inline scripts/styles to render, so it gets a relaxed CSP that
// still defines every directive explicitly — frame-ancestors and form-action never fall back
// to default-src, so omitting them (or disabling CSP outright) trips "missing directive" scans
// even when the policy is otherwise strict. Every other route gets helmet's strict default.
// Only one helmet() instance runs per request — stacking two would leave the first one's CSP
// header in place, since a later middleware can't remove a header an earlier one already set.
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith("/api/docs")) {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:"],
          frameAncestors: ["'self'"],
          formAction: ["'self'"],
        },
      },
    })(req, res, next);
  }
  return helmet()(req, res, next);
});

app.use(cookieParser());
app.use(express.json());

// Dev-phase request logger — logs all requests including 2xx on response finish
app.use((req: Request, res: Response, next) => {
  res.on("finish", () => {
    console.log(`[LOG] ${req.method} ${req.url} → ${res.statusCode}`);
  });
  next();
});

// Enable trust proxy for secure cookies behind a reverse proxy (Heroku, Render, etc.)
// Where I deploy MUST set .env to "production".
app.set("trust proxy", 1);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server requests and tools like Postman
      if (!origin) return callback(null, true);
      // Allow configured client origins — exact match matters in non-local environments
      if (origin === REACT_CLIENT_URL || origin === FLUTTER_CLIENT_URL) {
        return callback(null, true);
      }
      // Allow any localhost port outside production — covers multiple dev instances without listing each port
      if (ENV !== "production" && /^http:\/\/localhost(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      // Reject by omitting CORS headers — the browser blocks the request. Passing an Error here
      // would reach the global error handler and log a 500 for every blocked origin.
      callback(null, false);
    },
    credentials: true,
  })
);

registerRoutes(app);

// Swagger UI is dev/documentation tooling only — never expose it in production. Keeps it off
// the public attack surface entirely (its bundled vendor JS has had real CVEs — e.g. DOMPurify
// shipped inside swagger-ui-bundle.js), rather than trying to harden a route nobody should reach.
if (ENV !== "production") {
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

// 404 — route through globalErrorHandler for consistent error format
app.use((_req: Request, _res: Response, next: NextFunction) => {
  next(new NotFoundError("Route not found"));
});

app.use(globalErrorHandler);

export default app;
