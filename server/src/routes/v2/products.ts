import express from 'express';
import getProductsHandler from './products/get/handler';
import getFilteredProductsHandler from './products/get-filtered/handler';
import getProductByIdHandler from './products/get-by-id/handler';
import createRouter from '../products/create/handler';
import updateRouter from '../products/update/handler';
import uploadImagesRouter from '../products/images/uploadImages/handler';

const router = express.Router();

router.get('/', getProductsHandler);
router.get('/filter', getFilteredProductsHandler);
router.get('/:id', getProductByIdHandler);

// Stage 4 migrates reads only. Writes remain on existing handlers until Stage 5.
router.use('/', createRouter);
router.use('/', updateRouter);
router.use('/', uploadImagesRouter);

export default router;
