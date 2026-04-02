import { Router } from 'express';
import {
  testConnection,
  syncProducts,
  syncOrders,
  pushProduct,
  getShopifyOrders,
} from '../controllers/shopify.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/stores/:storeId/test', testConnection);
router.post('/stores/:storeId/sync-products', syncProducts);
router.post('/stores/:storeId/sync-orders', syncOrders);
router.get('/stores/:storeId/orders', getShopifyOrders);
router.post('/stores/:storeId/products/:productId/push', pushProduct);

export default router;
