import { Router } from 'express';
import { getDashboard, getMetrics, getTopProducts } from '../controllers/dashboard.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', getDashboard);
router.get('/metrics', getMetrics);
router.get('/top-products', getTopProducts);

export default router;
