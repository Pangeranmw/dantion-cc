import express from 'express';
import { authenticateToken } from './auth.js';

import {
	detectionAll,
	detectionAdd,
	detectionDetail,
	detectionUpdate,
	detectionDelete,
	getDetectionStatistic,
} from "../controllers/detections.js";

const router = express.Router();

router.get("/statistic", getDetectionStatistic);
router.get('/', authenticateToken, detectionAll);
router.get('/:id', authenticateToken, detectionDetail);
router.post('/', authenticateToken, detectionAdd);
router.patch('/', authenticateToken, detectionUpdate);
router.delete('/:id', authenticateToken, detectionDelete);

export default router;
