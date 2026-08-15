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
import basketRouter from "./routes/basket";
import v2AuthRoutes from "./routes/v2/auth";
import v2ProductsRouter from "./routes/v2/products";
import v2UsersRouter from "./routes/v2/users";
import v2AuditRouter from "./routes/v2/audit";
import v2BasketRouter from "./routes/v2/basket";
import { resolveApiRouteFlags } from "./config/api-route-flags";
// import other routers...

dotenv.config();

const app = express();
const routeFlags = resolveApiRouteFlags();

const selectedProductsRouter =
  routeFlags.products === "v2" ? v2ProductsRouter : productsRouter;
const selectedUsersRouter = routeFlags.users === "v2" ? v2UsersRouter : usersRouter;
const selectedAuthRouter = routeFlags.auth === "v2" ? v2AuthRoutes : authRoutes;
const selectedAuditRouter = routeFlags.audit === "v2" ? v2AuditRouter : auditRouter;
const selectedBasketRouter = routeFlags.basket === "v2" ? v2BasketRouter : basketRouter;

app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true
  })
);
app.use(express.json());

// Register all routes here
app.use("/api/products", selectedProductsRouter);
app.use("/api/v2/products", v2ProductsRouter);
app.use("/api/users", selectedUsersRouter);
app.use("/api/v2/users", v2UsersRouter);
app.use("/api/auth", selectedAuthRouter);
app.use("/api/auth/me", selectedAuthRouter);
app.use("/api/v2/auth", v2AuthRoutes);
app.use("/api/audit", selectedAuditRouter);
app.use("/api/v2/audit", v2AuditRouter);
app.use("/api/basket", selectedBasketRouter);
app.use("/api/v2/basket", v2BasketRouter);

app.use(
  "/images",
  express.static(path.join(__dirname, "../../client/public/images"))
);

export default app;
