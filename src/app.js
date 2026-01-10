const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { FRONTEND_SERVER } = require("./config/env.js");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./docs/swagger");
const { registerRoutes } = require("./routes");
const { globalErrorHandler } = require("./utils/");

const app = express();

app.use(cookieParser());
app.use(express.json());

// Enable trust proxy for secure cookies behind a reverse proxy (Heroku, Render, etc.)
// Where I deploy MUST set .env to "production"
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
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use(globalErrorHandler);

module.exports = app;
