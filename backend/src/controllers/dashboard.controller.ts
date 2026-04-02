import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/errorHandler.middleware';

const prisma = new PrismaClient();

export async function getDashboard(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { storeId } = req.query;

    const storeFilter = storeId
      ? { id: String(storeId), userId: req.user!.id }
      : { userId: req.user!.id };

    const stores = await prisma.store.findMany({ where: storeFilter, select: { id: true } });
    if (!stores.length) throw new AppError('Nenhuma loja encontrada', 404);

    const storeIds = stores.map((s) => s.id);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayOrders, weekOrders, monthOrders, pendingOrders] = await Promise.all([
      prisma.order.findMany({ where: { storeId: { in: storeIds }, createdAt: { gte: todayStart } } }),
      prisma.order.findMany({ where: { storeId: { in: storeIds }, createdAt: { gte: weekStart } } }),
      prisma.order.findMany({ where: { storeId: { in: storeIds }, createdAt: { gte: monthStart } } }),
      prisma.order.count({ where: { storeId: { in: storeIds }, status: 'pending' } }),
    ]);

    const sumRevenue = (orders: { totalPrice: number }[]) =>
      orders.reduce((acc, o) => acc + o.totalPrice, 0);

    const todayRevenue = sumRevenue(todayOrders);
    const weekRevenue = sumRevenue(weekOrders);
    const monthRevenue = sumRevenue(monthOrders);

    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevWeekOrders = await prisma.order.findMany({
      where: { storeId: { in: storeIds }, createdAt: { gte: prevWeekStart, lt: weekStart } },
    });
    const prevWeekRevenue = sumRevenue(prevWeekOrders);
    const revenueTrend = prevWeekRevenue > 0
      ? ((weekRevenue - prevWeekRevenue) / prevWeekRevenue) * 100
      : 0;

    const [totalProducts, activeProducts, ads] = await Promise.all([
      prisma.product.count({ where: { storeId: { in: storeIds } } }),
      prisma.product.count({ where: { storeId: { in: storeIds }, status: 'active' } }),
      prisma.ad.findMany({ where: { storeId: { in: storeIds } } }),
    ]);

    const outOfStock = await prisma.product.count({
      where: { storeId: { in: storeIds }, inventory: { lte: 0 } },
    });

    const totalAdSpend = ads.reduce((acc, ad) => acc + ad.spent, 0);
    const totalAdRevenue = ads.reduce((acc, ad) => acc + ad.revenue, 0);
    const avgRoas = totalAdSpend > 0 ? totalAdRevenue / totalAdSpend : 0;
    const activeCampaigns = ads.filter((ad) => ad.status === 'active').length;

    res.json({
      success: true,
      data: {
        revenue: {
          today: todayRevenue,
          week: weekRevenue,
          month: monthRevenue,
          trend: parseFloat(revenueTrend.toFixed(2)),
        },
        orders: {
          today: todayOrders.length,
          week: weekOrders.length,
          month: monthOrders.length,
          pending: pendingOrders,
          trend: weekOrders.length - prevWeekOrders.length,
        },
        products: {
          total: totalProducts,
          active: activeProducts,
          outOfStock,
        },
        ads: {
          totalSpend: totalAdSpend,
          totalRevenue: totalAdRevenue,
          avgRoas: parseFloat(avgRoas.toFixed(2)),
          activeCampaigns,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getMetrics(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { storeId, days = '30' } = req.query;

    const store = await prisma.store.findFirst({
      where: { id: String(storeId), userId: req.user!.id },
    });
    if (!store) throw new AppError('Loja não encontrada', 404);

    const since = new Date();
    since.setDate(since.getDate() - Number(days));

    const metrics = await prisma.storeMetrics.findMany({
      where: { storeId: String(storeId), date: { gte: since } },
      orderBy: { date: 'asc' },
    });

    res.json({ success: true, data: metrics });
  } catch (error) {
    next(error);
  }
}

export async function getTopProducts(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { storeId, limit = '10' } = req.query;

    const storeFilter = storeId
      ? { id: String(storeId), userId: req.user!.id }
      : { userId: req.user!.id };

    const stores = await prisma.store.findMany({ where: storeFilter, select: { id: true } });
    const storeIds = stores.map((s) => s.id);

    const topItems = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: { order: { storeId: { in: storeIds } }, productId: { not: null } },
      _sum: { totalPrice: true, quantity: true },
      _count: { id: true },
      orderBy: { _sum: { totalPrice: 'desc' } },
      take: Number(limit),
    });

    const productIds = topItems.map((i) => i.productId).filter(Boolean) as string[];
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });

    const result = topItems.map((item) => ({
      product: products.find((p) => p.id === item.productId),
      totalRevenue: item._sum.totalPrice || 0,
      totalQuantity: item._sum.quantity || 0,
      orderCount: item._count.id,
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
