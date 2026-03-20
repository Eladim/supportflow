import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { loadEnv, parseCorsOrigins } from "./config/env.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { globalLimiter } from "./middlewares/rate-limit.js";
import { openApiDocument } from "./openapi/spec.js";
import { v1Router } from "./routes/v1/index.js";

export function createApp(): express.Express {
  const app = express();
  const env = loadEnv();

  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(
    cors({
      origin: parseCorsOrigins(env.CORS_ORIGIN),
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: "2mb" }));
  app.use(globalLimiter);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "supportflow-api" });
  });

  app.get("/openapi.json", (_req, res) => {
    res.json(openApiDocument);
  });
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, {
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        tryItOutEnabled: true,
        filter: true,
        // Send cookies (e.g. sf_refresh) with Try it out — same origin as API
        requestInterceptor: (request: { credentials?: string }) => {
          request.credentials = "include";
          return request;
        },
      },
    }),
  );

  app.use("/api/v1", v1Router);

  app.use(errorMiddleware);
  return app;
}
