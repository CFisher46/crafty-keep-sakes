import express from "express";
import addNewLog from "../audit/post/handler";
import getAuditLogs from "../audit/get/handler";

const router = express.Router();

router.use("/add", addNewLog);
router.use("/", getAuditLogs);

export default router;
