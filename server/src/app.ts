// src/app.ts
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import productsRouter from "./routes/products";
import usersRouter from "./routes/users";
import authRoutes from "./routes/auth";
import auditRouter from "./routes/audit";
import v2AuthRoutes from "./routes/v2/auth";
import v2ProductsRouter from "./routes/v2/products";
import v2UsersRouter from "./routes/v2/users";
import v2AuditRouter from "./routes/v2/audit";
// import other routers...

dotenv.config();

const app = express();

app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true
  })
);
app.use(express.json());

// Register all routes here
app.use("/api/products", productsRouter);
app.use("/api/v2/products", v2ProductsRouter);
app.use("/api/users", usersRouter);
app.use("/api/v2/users", v2UsersRouter);
app.use("/api/auth", authRoutes);
app.use("/api/auth/me", authRoutes);
app.use("/api/v2/auth", v2AuthRoutes);
app.use("/api/audit", auditRouter);
app.use("/api/v2/audit", v2AuditRouter);

app.use(
  "/images",
  express.static(path.join(__dirname, "../../client/public/images"))
);

export default app;
