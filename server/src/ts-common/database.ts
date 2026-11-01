import mysql from "mysql2/promise";
import dotenv from "dotenv";

import { assertDbTargetAllowed, describeDbTarget } from "./db-target";

dotenv.config();
assertDbTargetAllowed();

if (process.env.NODE_ENV !== "test") {
  console.log(`Database target: ${describeDbTarget()}`);
}

export const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE
});
