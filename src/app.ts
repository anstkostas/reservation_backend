import express, { type Request, type Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./docs/swagger.js";
import { FRONTEND_SERVER } from "./config/env.js";
import { registerRoutes } from "./routes/index.js";
import { globalErrorHandler } from "./middlewares/index.js";

const app = express();

app.use(cookieParser());
app.use(express.json());

// Enable trust proxy for secure cookies behind a reverse proxy (Heroku, Render, etc.)
// Where I deploy MUST set .env to "production".
// TODO To deploy switch to PostgreSQL and use Render.
app.set("trust proxy", 1);

app.use(
  cors({
    origin: FRONTEND_SERVER,
    credentials: true,
  })
);

registerRoutes(app);

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 404
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use(globalErrorHandler);

export default app;
