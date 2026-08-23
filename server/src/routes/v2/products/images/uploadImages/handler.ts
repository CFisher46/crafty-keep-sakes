import express from 'express';
import multer from 'multer';
import path from 'path';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from '../../../../../ts-common/database';
import {
  INSERT_PRODUCT_IMAGE_V2_QUERY,
  SELECT_PRODUCT_IMAGE_MAX_SORT_QUERY,
} from './sql';
import { RESOLVE_PRODUCT_ID_QUERY } from '../../shared/sql';
import {
  verifyAuthToken,
  requireRole,
  getRequestUser,
} from '../../../../../ts-common/middleware';
import { getProductImagesDirectory } from '../../../../../ts-common/upload-images-directory';
import { insertAuditEvent } from '../../../audit-events';

const router = express.Router();

const imagesDirectory = getProductImagesDirectory();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, imagesDirectory);
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname);
    const basename = path
      .basename(file.originalname, extension)
      .replace(/[^a-zA-Z0-9-_]/g, '_');
    cb(null, `${Date.now()}-${basename}${extension}`);
  },
});

const upload = multer({ storage });

router.post(
  '/:id/images/upload',
  verifyAuthToken,
  requireRole('admin'),
  upload.array('images'),
  async (req, res) => {
    console.log(`POST /api/v2/products/${req.params.id}/images/upload`);

    const idOrSku = String(req.params.id || '').trim();
    const files = req.files as Express.Multer.File[] | undefined;

    if (!idOrSku) {
      res.status(400).json({ error: 'Missing product id' });
      return;
    }

    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No images were uploaded' });
      return;
    }

    const connection = await db.getConnection();

    try {
      const [productRows] = await connection.query<RowDataPacket[]>(
        RESOLVE_PRODUCT_ID_QUERY,
        [idOrSku, idOrSku]
      );

      const productId = productRows[0]?.id;
      if (!productId) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      const [sortRows] = await connection.query<RowDataPacket[]>(
        SELECT_PRODUCT_IMAGE_MAX_SORT_QUERY,
        [productId]
      );

      const maxSort = Number(sortRows[0]?.max_sort ?? -1);
      const imagePaths = files.map((file) => `/images/${file.filename}`);

      await Promise.all(
        imagePaths.map((imagePath, index) =>
          connection.query<ResultSetHeader>(
            INSERT_PRODUCT_IMAGE_V2_QUERY,
            [productId, imagePath, maxSort + index + 1, maxSort < 0 && index === 0 ? 1 : 0]
          )
        )
      );

      const actorUser = getRequestUser(req);
      const actorUserId =
        actorUser && typeof actorUser === 'object' && 'id' in actorUser
          ? Number(actorUser.id)
          : null;
      const actorRole =
        actorUser && typeof actorUser === 'object' && 'type' in actorUser
          ? String(actorUser.type)
          : null;

      await insertAuditEvent(connection, {
        actorUserId,
        actorRole,
        actionType: 'UPDATE',
        resourceType: 'products_v2',
        resourceId: productId,
        sourceEndpoint: `POST /api/v2/products/${idOrSku}/images/upload`,
        oldValuesJson: null,
        newValuesJson: {
          product_id: productId,
          uploaded_images: imagePaths,
        },
      });

      res.status(201).json({ message: 'Images uploaded', images: imagePaths });
    } catch (error) {
      console.error(`Error uploading v2 images for product ${idOrSku}:`, error);
      res.status(500).json({ error: 'Failed to upload product images' });
    } finally {
      connection.release();
    }
  }
);

export default router;