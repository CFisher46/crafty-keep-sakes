import express from 'express';
import multer from 'multer';
import path from 'path';
import { db } from '../../../../ts-common/database';
import { ADD_IMAGE_TO_PRODUCT_QUERY } from './sql';
import { verifyAuthToken, requireRole } from '../../../../ts-common/middleware';
import { getProductImagesDirectory } from '../../../../ts-common/upload-images-directory';
import { insertAuditEvent } from '../../../v2/audit-events';

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
    const { id } = req.params;
    const files = req.files as Express.Multer.File[] | undefined;

    if (!id) {
      res.status(400).json({ error: 'Missing product id' });
      return;
    }

    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No images were uploaded' });
      return;
    }

    try {
      const imagePaths = files.map((file) => `/images/${file.filename}`);

      await Promise.all(
        imagePaths.map((imagePath) =>
          db.query(ADD_IMAGE_TO_PRODUCT_QUERY, [id, imagePath])
        )
      );

      const actorUser = (req as any).user;
      const actorUserId =
        actorUser && typeof actorUser === 'object' && 'id' in actorUser
          ? Number(actorUser.id)
          : null;
      const actorRole =
        actorUser && typeof actorUser === 'object' && 'type' in actorUser
          ? String(actorUser.type)
          : null;

      await insertAuditEvent(null, {
        actorUserId,
        actorRole,
        actionType: 'UPDATE',
        resourceType: 'products_legacy',
        resourceId: id,
        sourceEndpoint: `POST /api/products/${id}/images/upload`,
        oldValuesJson: null,
        newValuesJson: {
          product_id: id,
          uploaded_images: imagePaths,
        },
      });

      res.status(201).json({ message: 'Images uploaded', images: imagePaths });
    } catch (error) {
      console.error(`Error uploading images for product ${id}:`, error);
      res.status(500).json({ error: 'Failed to upload product images' });
    }
  }
);

export default router;
