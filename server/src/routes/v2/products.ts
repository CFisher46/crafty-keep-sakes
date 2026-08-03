import express from 'express';
import productsRouter from '../products';

const router = express.Router();

router.use('/', productsRouter);

export default router;
