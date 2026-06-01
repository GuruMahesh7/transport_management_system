import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import path from "path";
import fs from "fs";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Serve static frontend assets in production if they exist
const staticPath = process.env.STATIC_ASSETS_PATH || path.resolve(process.cwd(), "artifacts/tms/dist/public");
if (fs.existsSync(staticPath)) {
  logger.info({ staticPath }, "Serving static frontend assets");
  app.use(express.static(staticPath));
  
  // Catch-all route to serve index.html for client-side routing (wouter SPA)
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    res.sendFile(path.resolve(staticPath, "index.html"));
  });
} else {
  logger.warn({ staticPath }, "Static assets directory not found. Frontend not served from backend.");
}

export default app;
