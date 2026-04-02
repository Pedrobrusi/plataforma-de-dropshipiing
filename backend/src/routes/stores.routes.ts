import { Router } from 'express';
import {
  getStores,
  getStore,
  createStore,
  updateStore,
  deleteStore,
  getStoreAlerts,
  markAlertRead,
} from '../controllers/stores.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { storeValidation, uuidParamValidation } from '../utils/validators';
import { validateRequest } from '../middleware/errorHandler.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', getStores);
router.get('/:id', uuidParamValidation, validateRequest, getStore);
router.post('/', storeValidation, validateRequest, createStore);
router.put('/:id', uuidParamValidation, validateRequest, updateStore);
router.delete('/:id', uuidParamValidation, validateRequest, deleteStore);

// Alerts
router.get('/:id/alerts', uuidParamValidation, validateRequest, getStoreAlerts);
router.patch('/:id/alerts/:alertId/read', markAlertRead);

export default router;
