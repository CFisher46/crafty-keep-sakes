import express from "express";
import getInvoicesHandler from "./get/handler";
import createInvoiceHandler from "./put/handler";

const router = express.Router();

router.use("/", getInvoicesHandler);
router.use("/", createInvoiceHandler);

export default router;