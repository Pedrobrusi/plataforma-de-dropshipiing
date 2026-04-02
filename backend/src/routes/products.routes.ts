import { Router } from 'express';
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getSuppliers,
} from '../controllers/products.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { productValidation, uuidParamValidation, paginationValidation } from '../utils/validators';
import { validateRequest } from '../middleware/errorHandler.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', paginationValidation, validateRequest, getProducts);
router.get('/suppliers', getSuppliers);
router.get('/:id', uuidParamValidation, validateRequest, getProduct);
router.post('/', productValidation, validateRequest, createProduct);
router.put('/:id', uuidParamValidation, validateRequest, updateProduct);
router.delete('/:id', uuidParamValidation, validateRequest, deleteProduct);

export default router;
