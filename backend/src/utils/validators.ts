import { body, param, query } from 'express-validator';

export const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Senha deve ter no mínimo 6 caracteres'),
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres'),
];

export const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
  body('password').notEmpty().withMessage('Senha obrigatória'),
];

export const storeValidation = [
  body('name').trim().notEmpty().withMessage('Nome da loja obrigatório'),
  body('domain').trim().notEmpty().withMessage('Domínio obrigatório'),
  body('platform')
    .optional()
    .isIn(['shopify', 'woocommerce', 'nuvemshop'])
    .withMessage('Plataforma inválida'),
];

export const productValidation = [
  body('title').trim().notEmpty().withMessage('Título obrigatório'),
  body('price').isFloat({ min: 0 }).withMessage('Preço deve ser positivo'),
  body('storeId').notEmpty().withMessage('Store ID obrigatório'),
];

export const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Página inválida'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limite inválido'),
];

export const uuidParamValidation = [
  param('id').isUUID().withMessage('ID inválido'),
];
