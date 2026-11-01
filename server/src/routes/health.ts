import { Router } from "express";
import { db } from "../ts-common/database";

const DB_CHECK_TIMEOUT_MS = 3000;

const router = Router();

// Unauthenticated and mounted before the rate limiters so platform health checks always get through.
// Reports only ok/unavailable, never DB details.
router.get("/", async (_req, res) => {
  res.set("Cache-Control", "no-store");

  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      db.query("SELECT 1"),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("DB health check timed out")), DB_CHECK_TIMEOUT_MS);
      }),
    ]);
    res.status(200).json({ status: "ok" });
  } catch (err) {
    console.error("Health check failed:", err instanceof Error ? err.message : err);
    res.status(503).json({ status: "unavailable" });
  } finally {
    if (timer) clearTimeout(timer);
  }
});

export default router;
