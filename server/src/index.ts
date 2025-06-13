import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import productsRouter from "./routes/products";
import usersRouter from "./routes/users";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use("/api/users", usersRouter);
app.use("/api/products", productsRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
