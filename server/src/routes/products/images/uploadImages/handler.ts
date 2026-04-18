import express from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { db } from '../../../../ts-common/database';
import { ADD_IMAGE_TO_PRODUCT_QUERY } from './sql';

const router = express.Router();

const imagesDirectory = path.join(__dirname, '../../../../../../client/public/images');

if (!fs.existsSync(imagesDirectory)) {
  fs.mkdirSync(imagesDirectory, { recursive: true });
}

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

router.post('/:id/images/upload', upload.array('images'), async (req, res) => {
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

    res.status(201).json({ message: 'Images uploaded', images: imagePaths });
  } catch (error) {
    console.error(`Error uploading images for product ${id}:`, error);
    res.status(500).json({ error: 'Failed to upload product images' });
  }
});

export default router;
