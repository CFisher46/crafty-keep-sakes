import express from "express";
import jwt from "jsonwebtoken";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "your-dev-secret";

type AuthenticatedTokenUser = jwt.JwtPayload & {
  type?: string;
};

router.get("/me", async (req: express.Request, res: express.Response) => {
  const token = req.cookies.auth_token;

  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const user = jwt.verify(token, JWT_SECRET) as AuthenticatedTokenUser;
    res.json({
      user: {
        ...(user as object),
        type: user.type,
      },
      authenticated: true,
    });
  } catch (err) {
    console.error("Token verification error:", err);
    res.status(401).json({ message: "Invalid token" });
  }
});

export default router;
