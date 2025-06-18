import express from "express";
import getProductsHandler from "./get/handler";
import getProductByIdHandler from "./get-by-id/handler";
import createRouter from "./create/handler";
import updateRouter from "./update/handler";

const router = express.Router();

router.get("/", getProductsHandler);
router.get("/:id", getProductByIdHandler);
router.use("/", createRouter);
router.use("/", updateRouter);

export default router;
