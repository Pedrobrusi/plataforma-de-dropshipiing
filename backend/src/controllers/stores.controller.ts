import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/errorHandler.middleware';

const prisma = new PrismaClient();

export async function getStores(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const stores = await prisma.store.findMany({
      where: { userId: req.user!.id },
      include: {
        _count: {
          select: { products: true, orders: true, alerts: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: stores });
  } catch (error) {
    next(error);
  }
}

export async function getStore(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const store = await prisma.store.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: {
        _count: {
          select: { products: true, orders: true, ads: true, alerts: true },
        },
      },
    });

    if (!store) throw new AppError('Loja não encontrada', 404);

    res.json({ success: true, data: store });
  } catch (error) {
    next(error);
  }
}

export async function createStore(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, domain, platform, accessToken, currency, timezone } = req.body;

    const existing = await prisma.store.findUnique({ where: { domain } });
    if (existing) throw new AppError('Domínio já cadastrado', 409);

    const store = await prisma.store.create({
      data: {
        id: uuidv4(),
        name,
        domain,
        platform: platform || 'shopify',
        accessToken,
        currency: currency || 'BRL',
        timezone: timezone || 'America/Sao_Paulo',
        userId: req.user!.id,
      },
    });

    res.status(201).json({ success: true, data: store, message: 'Loja criada com sucesso' });
  } catch (error) {
    next(error);
  }
}

export async function updateStore(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const store = await prisma.store.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!store) throw new AppError('Loja não encontrada', 404);

    const { name, accessToken, currency, timezone, isActive } = req.body;

    const updated = await prisma.store.update({
      where: { id: req.params.id },
      data: { name, accessToken, currency, timezone, isActive },
    });

    res.json({ success: true, data: updated, message: 'Loja atualizada' });
  } catch (error) {
    next(error);
  }
}

export async function deleteStore(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const store = await prisma.store.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!store) throw new AppError('Loja não encontrada', 404);

    await prisma.store.delete({ where: { id: req.params.id } });

    res.json({ success: true, message: 'Loja removida com sucesso' });
  } catch (error) {
    next(error);
  }
}

export async function getStoreAlerts(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const store = await prisma.store.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!store) throw new AppError('Loja não encontrada', 404);

    const alerts = await prisma.alert.findMany({
      where: { storeId: req.params.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ success: true, data: alerts });
  } catch (error) {
    next(error);
  }
}

export async function markAlertRead(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const alert = await prisma.alert.findFirst({
      where: { id: req.params.alertId, store: { userId: req.user!.id } },
    });
    if (!alert) throw new AppError('Alerta não encontrado', 404);

    await prisma.alert.update({
      where: { id: req.params.alertId },
      data: { isRead: true },
    });

    res.json({ success: true, message: 'Alerta marcado como lido' });
  } catch (error) {
    next(error);
  }
}
