import axios, { AxiosInstance } from 'axios';
import logger from '../utils/logger';

export class ShopifyService {
  private client: AxiosInstance;
  private domain: string;

  constructor(domain: string, accessToken: string) {
    this.domain = domain;
    this.client = axios.create({
      baseURL: `https://${domain}/admin/api/2023-10`,
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        logger.error(`Shopify API error [${this.domain}]:`, error.response?.data || error.message);
        throw error;
      }
    );
  }

  async getShopInfo(): Promise<Record<string, unknown>> {
    const { data } = await this.client.get('/shop.json');
    return data.shop;
  }

  async getProducts(limit = 250): Promise<Record<string, unknown>[]> {
    const { data } = await this.client.get('/products.json', {
      params: { limit, status: 'active' },
    });
    return data.products;
  }

  async getProduct(productId: string): Promise<Record<string, unknown>> {
    const { data } = await this.client.get(`/products/${productId}.json`);
    return data.product;
  }

  async createProduct(product: {
    title: string;
    body_html: string;
    variants?: Array<{
      price: string;
      compare_at_price?: string;
      sku?: string;
      inventory_quantity?: number;
    }>;
    images?: Array<{ src: string }>;
  }): Promise<Record<string, unknown>> {
    const { data } = await this.client.post('/products.json', { product });
    return data.product;
  }

  async updateProduct(productId: string, updates: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { data } = await this.client.put(`/products/${productId}.json`, {
      product: updates,
    });
    return data.product;
  }

  async deleteProduct(productId: string): Promise<void> {
    await this.client.delete(`/products/${productId}.json`);
  }

  async getOrders(limit = 50, status = 'any'): Promise<Record<string, unknown>[]> {
    const { data } = await this.client.get('/orders.json', {
      params: { limit, status },
    });
    return data.orders;
  }

  async getOrder(orderId: string): Promise<Record<string, unknown>> {
    const { data } = await this.client.get(`/orders/${orderId}.json`);
    return data.order;
  }

  async fulfillOrder(orderId: string, trackingNumber?: string): Promise<Record<string, unknown>> {
    const fulfillment: Record<string, unknown> = { notify_customer: true };
    if (trackingNumber) {
      fulfillment.tracking_numbers = [trackingNumber];
    }
    const { data } = await this.client.post(`/orders/${orderId}/fulfillments.json`, { fulfillment });
    return data.fulfillment;
  }

  async getInventoryLevels(locationId: string): Promise<Record<string, unknown>[]> {
    const { data } = await this.client.get('/inventory_levels.json', {
      params: { location_ids: locationId },
    });
    return data.inventory_levels;
  }

  async updateInventory(inventoryItemId: string, locationId: string, available: number): Promise<void> {
    await this.client.post('/inventory_levels/set.json', {
      location_id: locationId,
      inventory_item_id: inventoryItemId,
      available,
    });
  }

  async getWebhooks(): Promise<Record<string, unknown>[]> {
    const { data } = await this.client.get('/webhooks.json');
    return data.webhooks;
  }

  async createWebhook(topic: string, address: string): Promise<Record<string, unknown>> {
    const { data } = await this.client.post('/webhooks.json', {
      webhook: { topic, address, format: 'json' },
    });
    return data.webhook;
  }
}
