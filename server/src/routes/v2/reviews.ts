import express from "express";
import createReview from './reviews/create/handler';
import updateReview from './reviews/update/handler';
import deleteReview from './reviews/delete/handler';

const router = express.Router();

router.post("/create", createReview);
router.put("/update", updateReview);
router.delete("/delete", deleteReview);

export default router;