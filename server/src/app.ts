// src/app.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import productsRouter from "./routes/products";
// import other routers...

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Register all routes here
app.use("/api/products", productsRouter);

export default app;
