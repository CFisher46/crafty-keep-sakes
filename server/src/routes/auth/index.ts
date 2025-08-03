import express from "express";
import loginHandler from "./post/handler";
import logoutHandler from "./post/logout";
import meHandler from "./get/handler";
// import registerHandler from "./post/register";
// import verifyHandler from "./get/verify";

const router = express.Router();

router.use("/", loginHandler);
router.use("/", logoutHandler);
router.use("/", meHandler);

// Optional additional routes
// router.use("/", registerHandler);
// router.use("/", verifyHandler);

export default router;
