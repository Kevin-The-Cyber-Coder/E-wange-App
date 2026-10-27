import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";

import env from "./config/env.js";
import routes from "./routes/index.js";
import { apiLimiter } from "./middleware/rateLimiter.js";
import { notFoundHandler } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

// Behind a proxy (Render, Railway, Nginx) so rate limiting works per client.
app.set("trust proxy", 1);

app.use(helmet());
app.use(
  cors({
    origin: env.clientOrigin,
    credentials: true,
  }),
);
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(env.isProd ? "combined" : "dev"));

app.use("/api", apiLimiter, routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
