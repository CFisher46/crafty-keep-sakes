import express from "express";
import getProductsHandler from "./get/handler";
import getProductByIdHandler from "./get-by-id/handler";

const router = express.Router();

router.get("/", getProductsHandler);
router.get("/:id", getProductByIdHandler);

export default router;
