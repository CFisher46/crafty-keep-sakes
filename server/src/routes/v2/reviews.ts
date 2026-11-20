import express from 'express';
import readReviews from './reviews/read/handler';
import createReview from './reviews/create/handler';
import updateReview from './reviews/update/handler';
import deleteReview from './reviews/delete/handler';
import productReviews from './reviews/products/handler';

const router = express.Router();

router.use('/products', productReviews);
router.use('/', readReviews);
router.use('/', createReview);
router.use('/', updateReview);
router.use('/', deleteReview);

export default router;
