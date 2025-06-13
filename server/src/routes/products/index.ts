import express from "express";
import getProductsHandler from "./get/handler";

const router = express.Router();

router.get("/", getProductsHandler);

export default router;
