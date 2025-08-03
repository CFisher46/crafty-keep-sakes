import express from "express";
import jwt from "jsonwebtoken";

const router = express.Router();

router.get("/me", async (req: any, res: any) => {
  const token = req.cookies.auth_token; // or req.headers.authorization

  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET!);
    res.json({ user, authenticated: true });
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
});

export default router;
