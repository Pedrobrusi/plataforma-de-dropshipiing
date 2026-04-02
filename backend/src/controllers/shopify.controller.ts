import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/errorHandler.middleware';
import { ShopifyService } from '../services/shopify';
import { ProductImportService } from '../services/productImport';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getStoreOrThrow(storeId: string, userId: string) {
  const store = await prisma.store.findFirst({ where: { id: storeId, userId } });
  if (!store) throw new AppError('Loja não encontrada', 404);
  if (!store.accessToken) throw new AppError('Loja não conectada ao Shopify', 400);
  return store;
}

export async function testConnection(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const store = await getStoreOrThrow(req.params.storeId, req.user!.id);
    const shopify = new ShopifyService(store.domain, store.accessToken!);
    const shopInfo = await shopify.getShopInfo();

    res.json({
      success: true,
      data: {
        connected: true,
        shop: shopInfo,
      },
      message: 'Conexão com Shopify estabelecida',
    });
  } catch (error) {
    next(error);
  }
}

export async function syncProducts(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const store = await getStoreOrThrow(req.params.storeId, req.user!.id);
    const shopify = new ShopifyService(store.domain, store.accessToken!);
    const importer = new ProductImportService(prisma);

    const shopifyProducts = await shopify.getProducts();
    const result = await importer.importFromShopify(shopifyProducts, store.id);

    res.json({
      success: true,
      data: result,
      message: `${result.imported} produtos sincronizados`,
    });
  } catch (error) {
    next(error);
  }
}

export async function syncOrders(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const store = await getStoreOrThrow(req.params.storeId, req.user!.id);
    const shopify = new ShopifyService(store.domain, store.accessToken!);
    const orders = await shopify.getOrders();

    let created = 0;
    let updated = 0;

    for (const shopifyOrder of orders) {
      const existing = await prisma.order.findFirst({
        where: { shopifyId: String(shopifyOrder.id), storeId: store.id },
      });

      const orderData = {
        orderNumber: `#${shopifyOrder.order_number}`,
        status: shopifyOrder.fulfillment_status === 'fulfilled' ? 'completed' : 'processing',
        fulfillmentStatus: shopifyOrder.fulfillment_status || 'unfulfilled',
        financialStatus: shopifyOrder.financial_status,
        totalPrice: parseFloat(shopifyOrder.total_price),
        subtotalPrice: parseFloat(shopifyOrder.subtotal_price),
        totalTax: parseFloat(shopifyOrder.total_tax),
        customerEmail: shopifyOrder.email,
        shopifyId: String(shopifyOrder.id),
        storeId: store.id,
      };

      if (existing) {
        await prisma.order.update({ where: { id: existing.id }, data: orderData });
        updated++;
      } else {
        const { v4: uuidv4 } = await import('uuid');
        await prisma.order.create({ data: { id: uuidv4(), ...orderData } });
        created++;
      }
    }

    res.json({
      success: true,
      data: { created, updated, total: orders.length },
      message: `${created} pedidos criados, ${updated} atualizados`,
    });
  } catch (error) {
    next(error);
  }
}

export async function pushProduct(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const store = await getStoreOrThrow(req.params.storeId, req.user!.id);
    const product = await prisma.product.findFirst({
      where: { id: req.params.productId, storeId: store.id },
    });
    if (!product) throw new AppError('Produto não encontrado', 404);

    const shopify = new ShopifyService(store.domain, store.accessToken!);
    const shopifyProduct = await shopify.createProduct({
      title: product.title,
      body_html: product.description || '',
      variants: [{
        price: String(product.price),
        compare_at_price: product.comparePrice ? String(product.comparePrice) : undefined,
        sku: product.sku || undefined,
        inventory_quantity: product.inventory,
      }],
    });

    await prisma.product.update({
      where: { id: product.id },
      data: { shopifyId: String(shopifyProduct.id), status: 'active' },
    });

    res.json({
      success: true,
      data: shopifyProduct,
      message: 'Produto publicado no Shopify',
    });
  } catch (error) {
    next(error);
  }
}

export async function getShopifyOrders(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const store = await getStoreOrThrow(req.params.storeId, req.user!.id);
    const shopify = new ShopifyService(store.domain, store.accessToken!);
    const orders = await shopify.getOrders(Number(req.query.limit) || 50);

    res.json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
}
