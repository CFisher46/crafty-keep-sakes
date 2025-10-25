import express from 'express';
import addNewLog from '../audit/post/handler';
import getAuditLogs from '../audit/get/handler';

const router = express.Router();

router.use('/', addNewLog);
router.use('/', getAuditLogs);

export default router;
