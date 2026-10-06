import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import v2AuthRoutes from "./routes/v2/auth";
import v2ProductsRouter from "./routes/v2/products";
import v2UsersRouter from "./routes/v2/users";
import v2AuditRouter from "./routes/v2/audit";
import v2BasketRouter from "./routes/v2/basket";
import v2BlogRouter from "./routes/v2/blog";

dotenv.config();

export function createApp() {
  const app = express();

  // Behind the Cloudflare tunnel, trust one proxy hop so req.ip is the client
  app.set("trust proxy", 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cookieParser());
  app.use(
    cors({
      origin: (process.env.CORS_ORIGIN || "http://localhost:3000").split(","),
      credentials: true
    })
  );
  app.use(express.json({ limit: "100kb" }));

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === "test",
    message: { error: "Too many attempts, please try again later" }
  });
  app.use("/api/auth/login", authLimiter);
  app.use("/api/v2/auth/login", authLimiter);
  app.use("/api/auth/verify-password", authLimiter);
  app.use("/api/v2/auth/verify-password", authLimiter);

  app.use("/api/products", v2ProductsRouter);
  app.use("/api/v2/products", v2ProductsRouter);
  app.use("/api/users", v2UsersRouter);
  app.use("/api/v2/users", v2UsersRouter);
  app.use("/api/auth", v2AuthRoutes);
  app.use("/api/v2/auth", v2AuthRoutes);
  app.use("/api/audit", v2AuditRouter);
  app.use("/api/v2/audit", v2AuditRouter);
  app.use("/api/basket", v2BasketRouter);
  app.use("/api/v2/basket", v2BasketRouter);
  app.use("/api/blog", v2BlogRouter);
  app.use("/api/v2/blog", v2BlogRouter);

  app.use(
    "/images",
    express.static(path.join(__dirname, "../../client/public/images"))
  );

  return app;
}

const app = createApp();

export default app;
