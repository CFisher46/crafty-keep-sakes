import express from "express";

const router = express.Router();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
router.post("/logout", async (req: any, res: any) => {
  res.clearCookie("auth_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax"
  });

  return res.status(200).json({ message: "Logged out successfully" });
});

export default router;
