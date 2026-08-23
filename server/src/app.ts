// src/app.ts
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import v2AuthRoutes from "./routes/v2/auth";
import v2ProductsRouter from "./routes/v2/products";
import v2UsersRouter from "./routes/v2/users";
import v2AuditRouter from "./routes/v2/audit";
import v2BasketRouter from "./routes/v2/basket";

dotenv.config();

export function createApp() {
  const app = express();

  app.use(cookieParser());
  app.use(
    cors({
      origin: "http://localhost:3000",
      credentials: true
    })
  );
  app.use(express.json());

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

  app.use(
    "/images",
    express.static(path.join(__dirname, "../../client/public/images"))
  );

  return app;
}

const app = createApp();

export default app;
