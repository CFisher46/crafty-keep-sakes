import { Router } from "express";
import { db } from "../ts-common/database";

const DB_CHECK_TIMEOUT_MS = 3000;

const router = Router();

// Unauthenticated and mounted before the rate limiters so platform health checks always get through.
// Reports only ok/unavailable, never DB details.
router.get("/", async (_req, res) => {
  res.set("Cache-Control", "no-store");

  let timer: NodeJS.Timeout | undefined;
  const timeoutError = new Error("DB health check timed out");
  try {
    await Promise.race([
      db.query("SELECT 1"),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(timeoutError), DB_CHECK_TIMEOUT_MS);
      }),
    ]);
    res.status(200).json({ status: "ok" });
  } catch (err) {
    console.error(err === timeoutError ? "HEALTH_DB_TIMEOUT" : "HEALTH_DB_UNAVAILABLE");
    res.status(503).json({ status: "unavailable" });
  } finally {
    if (timer) clearTimeout(timer);
  }
});

export default router;
