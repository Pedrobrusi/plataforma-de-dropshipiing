import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/errorHandler.middleware';

const prisma = new PrismaClient();

export async function getProducts(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { storeId, status, page = '1', limit = '20', search } = req.query;

    const store = storeId
      ? await prisma.store.findFirst({ where: { id: String(storeId), userId: req.user!.id } })
      : null;

    if (storeId && !store) throw new AppError('Loja não encontrada', 404);

    const where: Record<string, unknown> = {
      store: { userId: req.user!.id },
    };
    if (storeId) where.storeId = String(storeId);
    if (status) where.status = String(status);
    if (search) {
      where.OR = [
        { title: { contains: String(search) } },
        { sku: { contains: String(search) } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { supplier: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      success: true,
      data: products,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getProduct(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = await prisma.product.findFirst({
      where: { id: req.params.id, store: { userId: req.user!.id } },
      include: {
        supplier: true,
        store: { select: { id: true, name: true, domain: true } },
      },
    });

    if (!product) throw new AppError('Produto não encontrado', 404);

    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
}

export async function createProduct(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      storeId, title, description, price, comparePrice, cost,
      sku, images, tags, supplierId, supplierUrl, supplierPrice, inventory,
    } = req.body;

    const store = await prisma.store.findFirst({ where: { id: storeId, userId: req.user!.id } });
    if (!store) throw new AppError('Loja não encontrada', 404);

    const profit = cost ? price - cost : undefined;
    const profitMargin = profit && price > 0 ? (profit / price) * 100 : undefined;

    const product = await prisma.product.create({
      data: {
        id: uuidv4(),
        title,
        description,
        price,
        comparePrice,
        cost,
        sku,
        images: JSON.stringify(images || []),
        tags: JSON.stringify(tags || []),
        supplierId,
        supplierUrl,
        supplierPrice,
        profit,
        profitMargin,
        inventory: inventory || 0,
        storeId,
      },
    });

    res.status(201).json({ success: true, data: product, message: 'Produto criado' });
  } catch (error) {
    next(error);
  }
}

export async function updateProduct(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = await prisma.product.findFirst({
      where: { id: req.params.id, store: { userId: req.user!.id } },
    });
    if (!product) throw new AppError('Produto não encontrado', 404);

    const { title, description, price, comparePrice, cost, status, inventory, images, tags } = req.body;

    const profit = cost !== undefined && price !== undefined ? price - cost : undefined;
    const profitMargin = profit !== undefined && price > 0 ? (profit / price) * 100 : undefined;

    const updated = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        title,
        description,
        price,
        comparePrice,
        cost,
        status,
        inventory,
        images: images ? JSON.stringify(images) : undefined,
        tags: tags ? JSON.stringify(tags) : undefined,
        ...(profit !== undefined && { profit, profitMargin }),
      },
    });

    res.json({ success: true, data: updated, message: 'Produto atualizado' });
  } catch (error) {
    next(error);
  }
}

export async function deleteProduct(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = await prisma.product.findFirst({
      where: { id: req.params.id, store: { userId: req.user!.id } },
    });
    if (!product) throw new AppError('Produto não encontrado', 404);

    await prisma.product.delete({ where: { id: req.params.id } });

    res.json({ success: true, message: 'Produto removido' });
  } catch (error) {
    next(error);
  }
}

export async function getSuppliers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const suppliers = await prisma.supplier.findMany({
      where: { isActive: true },
      orderBy: { rating: 'desc' },
    });

    res.json({ success: true, data: suppliers });
  } catch (error) {
    next(error);
  }
}
