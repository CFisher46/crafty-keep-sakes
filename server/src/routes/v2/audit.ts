import express from 'express';
import auditRouter from '../audit';

const router = express.Router();

router.use('/', auditRouter);

export default router;
