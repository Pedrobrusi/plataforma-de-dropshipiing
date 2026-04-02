import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Limpar dados existentes
  await prisma.alert.deleteMany();
  await prisma.storeMetrics.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.ad.deleteMany();
  await prisma.product.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.store.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.user.deleteMany();

  // Criar usuário admin
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      id: uuidv4(),
      email: 'admin@dropshipping.com',
      password: hashedPassword,
      name: 'Admin',
      role: 'admin',
    },
  });

  // Criar usuário demo
  const demoPassword = await bcrypt.hash('demo123', 10);
  const demoUser = await prisma.user.create({
    data: {
      id: uuidv4(),
      email: 'demo@dropshipping.com',
      password: demoPassword,
      name: 'Demo User',
      role: 'user',
    },
  });

  console.log('✅ Usuários criados:', admin.email, demoUser.email);

  // Criar loja
  const store = await prisma.store.create({
    data: {
      id: uuidv4(),
      name: 'Minha Loja Dropshipping',
      domain: 'minha-loja.myshopify.com',
      platform: 'shopify',
      accessToken: 'shpat_demo_token_123',
      isActive: true,
      currency: 'BRL',
      userId: demoUser.id,
    },
  });

  console.log('✅ Loja criada:', store.name);

  // Criar fornecedores
  const supplier1 = await prisma.supplier.create({
    data: {
      id: uuidv4(),
      name: 'AliExpress Supplier A',
      website: 'https://aliexpress.com/store/123',
      email: 'supplier@aliexpress.com',
      country: 'CN',
      platform: 'aliexpress',
      rating: 4.8,
    },
  });

  const supplier2 = await prisma.supplier.create({
    data: {
      id: uuidv4(),
      name: 'CJDropshipping Pro',
      website: 'https://cjdropshipping.com',
      email: 'contact@cj.com',
      country: 'CN',
      platform: 'cjdropshipping',
      rating: 4.6,
    },
  });

  console.log('✅ Fornecedores criados');

  // Criar produtos
  const products = await Promise.all([
    prisma.product.create({
      data: {
        id: uuidv4(),
        title: 'Fone de Ouvido Bluetooth Premium',
        description: 'Fone sem fio com cancelamento de ruído ativo, 30h bateria',
        price: 189.90,
        comparePrice: 299.90,
        cost: 45.00,
        sku: 'FON-BT-001',
        status: 'active',
        images: JSON.stringify(['https://via.placeholder.com/400x400?text=Fone+Bluetooth']),
        tags: JSON.stringify(['eletrônicos', 'áudio', 'bluetooth']),
        supplierPrice: 45.00,
        profit: 144.90,
        profitMargin: 76.3,
        inventory: 150,
        storeId: store.id,
        supplierId: supplier1.id,
      },
    }),
    prisma.product.create({
      data: {
        id: uuidv4(),
        title: 'Smartwatch Fitness Tracker',
        description: 'Monitor cardíaco, GPS, resistente à água IP68',
        price: 249.90,
        comparePrice: 399.90,
        cost: 65.00,
        sku: 'SWT-FIT-002',
        status: 'active',
        images: JSON.stringify(['https://via.placeholder.com/400x400?text=Smartwatch']),
        tags: JSON.stringify(['smartwatch', 'fitness', 'saúde']),
        supplierPrice: 65.00,
        profit: 184.90,
        profitMargin: 74.0,
        inventory: 80,
        storeId: store.id,
        supplierId: supplier1.id,
      },
    }),
    prisma.product.create({
      data: {
        id: uuidv4(),
        title: 'Câmera de Segurança WiFi 4K',
        description: 'Câmera IP com visão noturna, detecção de movimento, armazenamento na nuvem',
        price: 159.90,
        comparePrice: 249.90,
        cost: 38.00,
        sku: 'CAM-SEC-003',
        status: 'active',
        images: JSON.stringify(['https://via.placeholder.com/400x400?text=Camera+4K']),
        tags: JSON.stringify(['segurança', 'câmera', 'wifi']),
        supplierPrice: 38.00,
        profit: 121.90,
        profitMargin: 76.2,
        inventory: 200,
        storeId: store.id,
        supplierId: supplier2.id,
      },
    }),
  ]);

  console.log('✅ Produtos criados:', products.length);

  // Criar pedidos
  const order1 = await prisma.order.create({
    data: {
      id: uuidv4(),
      orderNumber: '#1001',
      status: 'completed',
      fulfillmentStatus: 'fulfilled',
      financialStatus: 'paid',
      totalPrice: 439.80,
      subtotalPrice: 389.80,
      totalTax: 20.00,
      totalShipping: 30.00,
      currency: 'BRL',
      customerEmail: 'cliente1@email.com',
      customerName: 'João Silva',
      shippingAddress: JSON.stringify({
        street: 'Rua das Flores, 123',
        city: 'São Paulo',
        state: 'SP',
        zip: '01310-000',
        country: 'BR',
      }),
      processedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      storeId: store.id,
    },
  });

  await prisma.orderItem.create({
    data: {
      id: uuidv4(),
      quantity: 1,
      price: 189.90,
      totalPrice: 189.90,
      title: 'Fone de Ouvido Bluetooth Premium',
      sku: 'FON-BT-001',
      orderId: order1.id,
      productId: products[0].id,
    },
  });

  await prisma.orderItem.create({
    data: {
      id: uuidv4(),
      quantity: 1,
      price: 249.90,
      totalPrice: 249.90,
      title: 'Smartwatch Fitness Tracker',
      sku: 'SWT-FIT-002',
      orderId: order1.id,
      productId: products[1].id,
    },
  });

  const order2 = await prisma.order.create({
    data: {
      id: uuidv4(),
      orderNumber: '#1002',
      status: 'processing',
      fulfillmentStatus: 'unfulfilled',
      financialStatus: 'paid',
      totalPrice: 179.90,
      subtotalPrice: 159.90,
      totalTax: 8.00,
      totalShipping: 12.00,
      currency: 'BRL',
      customerEmail: 'cliente2@email.com',
      customerName: 'Maria Santos',
      processedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      storeId: store.id,
    },
  });

  await prisma.orderItem.create({
    data: {
      id: uuidv4(),
      quantity: 1,
      price: 159.90,
      totalPrice: 159.90,
      title: 'Câmera de Segurança WiFi 4K',
      sku: 'CAM-SEC-003',
      orderId: order2.id,
      productId: products[2].id,
    },
  });

  console.log('✅ Pedidos criados');

  // Criar anúncios
  await prisma.ad.createMany({
    data: [
      {
        id: uuidv4(),
        name: 'Campanha Fones - Facebook',
        platform: 'facebook',
        status: 'active',
        budget: 500.00,
        spent: 312.50,
        impressions: 45230,
        clicks: 1890,
        conversions: 23,
        revenue: 4367.70,
        roas: 13.97,
        cpc: 0.17,
        ctr: 4.18,
        storeId: store.id,
      },
      {
        id: uuidv4(),
        name: 'Smartwatch - Google Ads',
        platform: 'google',
        status: 'active',
        budget: 300.00,
        spent: 189.80,
        impressions: 28900,
        clicks: 1245,
        conversions: 15,
        revenue: 3748.50,
        roas: 19.75,
        cpc: 0.15,
        ctr: 4.31,
        storeId: store.id,
      },
      {
        id: uuidv4(),
        name: 'Câmeras - TikTok Ads',
        platform: 'tiktok',
        status: 'paused',
        budget: 200.00,
        spent: 200.00,
        impressions: 89500,
        clicks: 3420,
        conversions: 31,
        revenue: 4956.90,
        roas: 24.78,
        cpc: 0.06,
        ctr: 3.82,
        storeId: store.id,
      },
    ],
  });

  console.log('✅ Anúncios criados');

  // Criar alertas
  await prisma.alert.createMany({
    data: [
      {
        id: uuidv4(),
        type: 'low_stock',
        severity: 'warning',
        title: 'Estoque Baixo',
        message: 'Smartwatch Fitness Tracker está com apenas 80 unidades em estoque',
        storeId: store.id,
      },
      {
        id: uuidv4(),
        type: 'high_roas',
        severity: 'info',
        title: 'ROAS Excelente',
        message: 'Campanha TikTok atingiu ROAS de 24.78x esta semana',
        isRead: true,
        storeId: store.id,
      },
      {
        id: uuidv4(),
        type: 'new_order',
        severity: 'info',
        title: 'Novo Pedido',
        message: 'Pedido #1002 recebido - R$ 179,90',
        storeId: store.id,
      },
    ],
  });

  console.log('✅ Alertas criados');

  // Criar métricas dos últimos 30 dias
  const metricsData = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const baseRevenue = 800 + Math.random() * 1200;
    const orders = Math.floor(5 + Math.random() * 15);
    const adSpend = 50 + Math.random() * 150;

    metricsData.push({
      id: uuidv4(),
      date,
      revenue: parseFloat(baseRevenue.toFixed(2)),
      orders,
      visitors: Math.floor(orders * (8 + Math.random() * 12)),
      conversionRate: parseFloat((2 + Math.random() * 3).toFixed(2)),
      avgOrderValue: parseFloat((baseRevenue / orders).toFixed(2)),
      adSpend: parseFloat(adSpend.toFixed(2)),
      profit: parseFloat((baseRevenue * 0.35 - adSpend).toFixed(2)),
      roas: parseFloat((baseRevenue / adSpend).toFixed(2)),
      storeId: store.id,
    });
  }

  await prisma.storeMetrics.createMany({ data: metricsData });

  // API Key para admin
  await prisma.apiKey.create({
    data: {
      id: uuidv4(),
      name: 'Shopify Integration',
      key: 'ak_' + uuidv4().replace(/-/g, ''),
      service: 'shopify',
      userId: admin.id,
    },
  });

  console.log('✅ Métricas e API Keys criadas');
  console.log('\n🎉 Seed concluído com sucesso!');
  console.log('\n📋 Dados de acesso:');
  console.log('   Admin: admin@dropshipping.com / admin123');
  console.log('   Demo:  demo@dropshipping.com / demo123');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
