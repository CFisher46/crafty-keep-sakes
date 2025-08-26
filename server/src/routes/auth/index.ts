import express from "express";
import loginHandler from "./post/handler";
import logoutHandler from "./post/logout";
import meHandler from "./get/handler";
import verifyPasswordHandler from "./post/handler";

const router = express.Router();

router.use("/", loginHandler);
router.use("/", logoutHandler);
router.use("/", meHandler);
router.use("/", verifyPasswordHandler);

export default router;
