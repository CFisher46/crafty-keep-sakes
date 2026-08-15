import express from 'express';

const router = express.Router();

router.get('/', (_req, res) => {
  res.json({ source: 'legacy-basket' });
});

export default router;
