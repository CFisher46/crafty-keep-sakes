// src/app.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import productsRouter from "./routes/products";
import usersRouter from "./routes/users";
import authRoutes from "./routes/auth";
// import other routers...

dotenv.config();

const app = express();

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true
  })
);
app.use(express.json());

// Register all routes here
app.use("/api/products", productsRouter);
app.use("/api/users", usersRouter);
app.use("/api/auth", authRoutes);

app.use(
  "/images",
  express.static(path.join(__dirname, "../../client/public/images"))
);

export default app;
