import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';

export class DashboardMetricsService {
  constructor(private prisma: PrismaClient) {}

  async calculateAndSaveDailyMetrics(storeId: string, date: Date): Promise<void> {
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const [orders, ads] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          storeId,
          createdAt: { gte: dayStart, lt: dayEnd },
          financialStatus: 'paid',
        },
      }),
      this.prisma.ad.findMany({ where: { storeId } }),
    ]);

    const revenue = orders.reduce((sum, o) => sum + o.totalPrice, 0);
    const adSpend = ads.reduce((sum, ad) => sum + ad.spent, 0) / 30; // Estimate daily spend
    const profit = revenue * 0.35 - adSpend;
    const roas = adSpend > 0 ? revenue / adSpend : 0;
    const visitors = orders.length * 10; // Estimate
    const conversionRate = visitors > 0 ? (orders.length / visitors) * 100 : 0;
    const avgOrderValue = orders.length > 0 ? revenue / orders.length : 0;

    await this.prisma.storeMetrics.upsert({
      where: { storeId_date: { storeId, date: dayStart } },
      create: {
        id: uuidv4(),
        storeId,
        date: dayStart,
        revenue,
        orders: orders.length,
        visitors,
        conversionRate: parseFloat(conversionRate.toFixed(2)),
        avgOrderValue: parseFloat(avgOrderValue.toFixed(2)),
        adSpend: parseFloat(adSpend.toFixed(2)),
        profit: parseFloat(profit.toFixed(2)),
        roas: parseFloat(roas.toFixed(2)),
      },
      update: {
        revenue,
        orders: orders.length,
        visitors,
        conversionRate: parseFloat(conversionRate.toFixed(2)),
        avgOrderValue: parseFloat(avgOrderValue.toFixed(2)),
        adSpend: parseFloat(adSpend.toFixed(2)),
        profit: parseFloat(profit.toFixed(2)),
        roas: parseFloat(roas.toFixed(2)),
      },
    });

    logger.info(`Daily metrics saved for store ${storeId} on ${dayStart.toISOString()}`);
  }

  async getRevenueChart(storeId: string, days: number): Promise<{
    labels: string[];
    revenue: number[];
    orders: number[];
    profit: number[];
  }> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const metrics = await this.prisma.storeMetrics.findMany({
      where: { storeId, date: { gte: since } },
      orderBy: { date: 'asc' },
    });

    return {
      labels: metrics.map((m) => m.date.toISOString().split('T')[0]),
      revenue: metrics.map((m) => m.revenue),
      orders: metrics.map((m) => m.orders),
      profit: metrics.map((m) => m.profit),
    };
  }

  async getAdPerformanceSummary(storeId: string): Promise<{
    totalSpend: number;
    totalRevenue: number;
    totalRoas: number;
    bestPerforming: {
      id: string;
      name: string;
      roas: number;
      platform: string;
    } | null;
    platformBreakdown: Array<{
      platform: string;
      spend: number;
      revenue: number;
      roas: number;
    }>;
  }> {
    const ads = await this.prisma.ad.findMany({ where: { storeId } });

    const totalSpend = ads.reduce((sum, ad) => sum + ad.spent, 0);
    const totalRevenue = ads.reduce((sum, ad) => sum + ad.revenue, 0);
    const totalRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

    const bestPerforming = ads.reduce<typeof ads[0] | null>((best, ad) => {
      if (!best || ad.roas > best.roas) return ad;
      return best;
    }, null);

    const platformMap = new Map<string, { spend: number; revenue: number }>();
    for (const ad of ads) {
      const existing = platformMap.get(ad.platform) || { spend: 0, revenue: 0 };
      platformMap.set(ad.platform, {
        spend: existing.spend + ad.spent,
        revenue: existing.revenue + ad.revenue,
      });
    }

    const platformBreakdown = Array.from(platformMap.entries()).map(([platform, data]) => ({
      platform,
      spend: data.spend,
      revenue: data.revenue,
      roas: data.spend > 0 ? parseFloat((data.revenue / data.spend).toFixed(2)) : 0,
    }));

    return {
      totalSpend,
      totalRevenue,
      totalRoas: parseFloat(totalRoas.toFixed(2)),
      bestPerforming: bestPerforming
        ? { id: bestPerforming.id, name: bestPerforming.name, roas: bestPerforming.roas, platform: bestPerforming.platform }
        : null,
      platformBreakdown,
    };
  }

  async generateAlerts(storeId: string): Promise<void> {
    const [lowStockProducts, highRoasAds] = await Promise.all([
      this.prisma.product.findMany({
        where: { storeId, status: 'active', inventory: { lte: 10, gt: 0 } },
      }),
      this.prisma.ad.findMany({
        where: { storeId, status: 'active', roas: { gte: 5 } },
      }),
    ]);

    const alertsToCreate = [];

    for (const product of lowStockProducts) {
      const exists = await this.prisma.alert.findFirst({
        where: {
          storeId,
          type: 'low_stock',
          metadata: { contains: product.id },
          isRead: false,
        },
      });
      if (!exists) {
        alertsToCreate.push({
          id: uuidv4(),
          type: 'low_stock',
          severity: 'warning',
          title: 'Estoque Baixo',
          message: `${product.title} está com apenas ${product.inventory} unidades`,
          metadata: JSON.stringify({ productId: product.id }),
          storeId,
        });
      }
    }

    if (alertsToCreate.length > 0) {
      await this.prisma.alert.createMany({ data: alertsToCreate });
      logger.info(`Generated ${alertsToCreate.length} alerts for store ${storeId}`);
    }
  }
}
