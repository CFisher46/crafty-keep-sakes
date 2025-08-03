import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../../../ts-common/database";
import { getUserByEmail } from "./sql"; // Your SQL query for user lookup
import { decrypt } from "../../../ts-common/helpers"; // Your decryption function

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "your-dev-secret";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
router.post("/login", async (req: any, res: any) => {
  const { email, password, rememberMe } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Missing email or password" });
  }

  try {
    const [rows] = await db.query(getUserByEmail(), [email]);
    const user = (rows as any)[0];

    user.first_name = decrypt(user.first_name);

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // if (!user.is_verified) {
    //   return res.status(403).json({ error: "Email not verified" });
    // }

    const payload = {
      id: user.id,
      first_name: user.first_name,
      email_address: user.email_address,
      type: user.type
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: rememberMe ? "30d" : "14d"
    });

    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: rememberMe ? 1000 * 60 * 60 * 24 * 30 : 1000 * 60 * 60 * 24 * 14
    });

    res.json({ message: "Login successful", user: payload });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
