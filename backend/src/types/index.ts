import { Request } from 'express';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

export interface ShopifyProduct {
  id: string;
  title: string;
  body_html: string;
  vendor: string;
  product_type: string;
  status: string;
  variants: ShopifyVariant[];
  images: ShopifyImage[];
  tags: string;
}

export interface ShopifyVariant {
  id: string;
  title: string;
  price: string;
  compare_at_price: string;
  sku: string;
  inventory_quantity: number;
  weight: number;
  weight_unit: string;
}

export interface ShopifyImage {
  id: string;
  src: string;
  alt: string;
}

export interface ShopifyOrder {
  id: string;
  order_number: number;
  financial_status: string;
  fulfillment_status: string;
  total_price: string;
  subtotal_price: string;
  total_tax: string;
  currency: string;
  email: string;
  line_items: ShopifyLineItem[];
  shipping_address: ShopifyAddress;
}

export interface ShopifyLineItem {
  id: string;
  title: string;
  quantity: number;
  price: string;
  sku: string;
  product_id: string;
  variant_id: string;
}

export interface ShopifyAddress {
  first_name: string;
  last_name: string;
  address1: string;
  city: string;
  province: string;
  country: string;
  zip: string;
}

export interface DashboardMetrics {
  revenue: {
    today: number;
    week: number;
    month: number;
    trend: number;
  };
  orders: {
    today: number;
    week: number;
    month: number;
    pending: number;
    trend: number;
  };
  products: {
    total: number;
    active: number;
    outOfStock: number;
  };
  ads: {
    totalSpend: number;
    totalRevenue: number;
    avgRoas: number;
    activeCampaigns: number;
  };
}
