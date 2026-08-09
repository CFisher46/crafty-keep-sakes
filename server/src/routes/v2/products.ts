import express from 'express';
import getProductsHandler from './products/get/handler';
import getFilteredProductsHandler from './products/get-filtered/handler';
import getProductByIdHandler from './products/get-by-id/handler';
import createRouter from './products/create/handler';
import updateRouter from './products/update/handler';
import uploadImagesRouter from './products/images/uploadImages/handler';

const router = express.Router();

router.get('/', getProductsHandler);
router.get('/filter', getFilteredProductsHandler);
router.get('/:id', getProductByIdHandler);

// Stage 5 migrates product writes to v2 tables.
router.use('/', createRouter);
router.use('/', updateRouter);
router.use('/', uploadImagesRouter);

export default router;
