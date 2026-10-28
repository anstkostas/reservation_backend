import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "@/docs/swagger.js";
import { REACT_CLIENT_URL, FLUTTER_CLIENT_URL, ENV } from "@/config/env.js";
import { registerRoutes } from "@/routes/index.js";
import { globalErrorHandler } from "@/middlewares/index.js";
import { NotFoundError } from "@/errors/index.js";

const app = express();

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

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 404 — route through globalErrorHandler for consistent error format
app.use((_req: Request, _res: Response, next: NextFunction) => {
  next(new NotFoundError("Route not found"));
});

app.use(globalErrorHandler);

export default app;
