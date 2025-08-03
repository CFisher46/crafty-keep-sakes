import express from "express";
import loginHandler from "./post/handler";
import logoutHandler from "./post/logout";
// import registerHandler from "./post/register";
// import verifyHandler from "./get/verify";

const router = express.Router();

// POST /api/auth/login
router.use("/", loginHandler);

// POST /api/auth/logout
router.use("/", logoutHandler);

// Optional additional routes
// router.use("/", registerHandler);
// router.use("/", verifyHandler);

export default router;
