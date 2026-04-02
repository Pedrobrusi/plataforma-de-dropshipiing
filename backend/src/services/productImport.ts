import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import logger from '../utils/logger';

interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
}

interface AliExpressProduct {
  productId: string;
  title: string;
  salePrice: number;
  originalPrice: number;
  imageUrl: string;
  productUrl: string;
  rating: number;
  orders: number;
}

export class ProductImportService {
  constructor(private prisma: PrismaClient) {}

  async importFromShopify(
    shopifyProducts: Record<string, unknown>[],
    storeId: string
  ): Promise<ImportResult> {
    const result: ImportResult = { imported: 0, updated: 0, skipped: 0, errors: [] };

    for (const sp of shopifyProducts) {
      try {
        const existing = await this.prisma.product.findFirst({
          where: { shopifyId: String(sp.id), storeId },
        });

        const firstVariant = (sp.variants as Record<string, unknown>[])?.[0];
        const images = (sp.images as Record<string, unknown>[])?.map((img) => img.src) || [];

        const productData = {
          title: String(sp.title),
          description: String(sp.body_html || ''),
          price: parseFloat(String(firstVariant?.price || 0)),
          comparePrice: firstVariant?.compare_at_price
            ? parseFloat(String(firstVariant.compare_at_price))
            : null,
          sku: String(firstVariant?.sku || ''),
          inventory: Number(firstVariant?.inventory_quantity || 0),
          images: JSON.stringify(images),
          tags: JSON.stringify(String(sp.tags || '').split(',')),
          shopifyId: String(sp.id),
          status: sp.status === 'active' ? 'active' : 'draft',
          storeId,
        };

        if (existing) {
          await this.prisma.product.update({ where: { id: existing.id }, data: productData });
          result.updated++;
        } else {
          await this.prisma.product.create({ data: { id: uuidv4(), ...productData } });
          result.imported++;
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Product ${sp.id}: ${msg}`);
        logger.error(`Failed to import product ${sp.id}:`, error);
      }
    }

    return result;
  }

  async importFromUrl(url: string, storeId: string): Promise<{
    product: Record<string, unknown>;
    suggested: {
      price: number;
      comparePrice: number;
      profitMargin: number;
    };
  }> {
    // Simulação de scraping - em produção usaria um scraper real
    logger.info(`Importing product from URL: ${url}`);

    const mockProduct = {
      title: 'Produto Importado via URL',
      description: 'Descrição do produto importado',
      price: 0,
      images: [],
      supplierUrl: url,
      supplierPrice: 0,
    };

    const suggestedPrice = mockProduct.supplierPrice * 3;
    const suggestedCompare = suggestedPrice * 1.5;

    return {
      product: mockProduct,
      suggested: {
        price: suggestedPrice,
        comparePrice: suggestedCompare,
        profitMargin: 66.7,
      },
    };
  }

  async searchAliExpress(keyword: string, page = 1): Promise<AliExpressProduct[]> {
    // Em produção, integrar com AliExpress API ou scraper
    logger.info(`Searching AliExpress for: ${keyword}`);

    // Mock data para demonstração
    return Array.from({ length: 10 }, (_, i) => ({
      productId: `ae_${Date.now()}_${i}`,
      title: `${keyword} - Produto ${i + 1}`,
      salePrice: 15 + Math.random() * 50,
      originalPrice: 30 + Math.random() * 80,
      imageUrl: `https://via.placeholder.com/300x300?text=${encodeURIComponent(keyword)}+${i + 1}`,
      productUrl: `https://aliexpress.com/item/${1000000 + i}.html`,
      rating: 4 + Math.random() * 0.9,
      orders: Math.floor(100 + Math.random() * 5000),
    }));
  }

  async bulkImport(productIds: string[], storeId: string): Promise<ImportResult> {
    const result: ImportResult = { imported: 0, updated: 0, skipped: 0, errors: [] };

    for (const productId of productIds) {
      try {
        const existing = await this.prisma.product.findFirst({
          where: { storeId, sku: productId },
        });

        if (existing) {
          result.skipped++;
          continue;
        }

        await this.prisma.product.create({
          data: {
            id: uuidv4(),
            title: `Produto ${productId}`,
            price: 0,
            storeId,
            status: 'draft',
          },
        });
        result.imported++;
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`${productId}: ${msg}`);
      }
    }

    return result;
  }

  calculatePricing(cost: number, targetMargin = 0.65): {
    price: number;
    comparePrice: number;
    profit: number;
    profitMargin: number;
  } {
    const price = cost / (1 - targetMargin);
    const comparePrice = price * 1.3;
    const profit = price - cost;
    const profitMargin = (profit / price) * 100;

    return {
      price: parseFloat(price.toFixed(2)),
      comparePrice: parseFloat(comparePrice.toFixed(2)),
      profit: parseFloat(profit.toFixed(2)),
      profitMargin: parseFloat(profitMargin.toFixed(2)),
    };
  }
}
