import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Create roles first
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      name: 'admin',
      description: 'Administrator with full access to all features',
      isSystem: true,
    },
  })
  console.log('✅ Created role:', adminRole.name)

  const salespersonRole = await prisma.role.upsert({
    where: { name: 'salesperson' },
    update: {},
    create: {
      name: 'salesperson',
      description: 'Salesperson with access to products, sales, and customers',
      isSystem: true,
    },
  })
  console.log('✅ Created role:', salespersonRole.name)

  // Create a default admin user
  const hashedPassword = await bcrypt.hash('password123', 10)
  const user = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      username: 'admin',
      password: hashedPassword,
    },
  })
  console.log('✅ Created user:', user.name)

  // Assign admin role to the admin user
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: user.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      roleId: adminRole.id,
    },
  })
  console.log('✅ Assigned admin role to:', user.name)

  // Create a salesperson user
  const salesPassword = await bcrypt.hash('password123', 10)
  const salesUser = await prisma.user.upsert({
    where: { email: 'sales@example.com' },
    update: {},
    create: {
      email: 'sales@example.com',
      name: 'Sales Person',
      username: 'salesperson',
      password: salesPassword,
    },
  })
  console.log('✅ Created user:', salesUser.name)

  // Assign salesperson role
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: salesUser.id,
        roleId: salespersonRole.id,
      },
    },
    update: {},
    create: {
      userId: salesUser.id,
      roleId: salespersonRole.id,
    },
  })
  console.log('✅ Assigned salesperson role to:', salesUser.name)

  // Create categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { id: 'electronics-cat' },
      update: {},
      create: {
        id: 'electronics-cat',
        name: 'Electronics',
        userId: user.id,
      },
    }),
    prisma.category.upsert({
      where: { id: 'clothing-cat' },
      update: {},
      create: {
        id: 'clothing-cat',
        name: 'Clothing',
        userId: user.id,
      },
    }),
    prisma.category.upsert({
      where: { id: 'books-cat' },
      update: {},
      create: {
        id: 'books-cat',
        name: 'Books',
        userId: user.id,
      },
    }),
    prisma.category.upsert({
      where: { id: 'home-garden-cat' },
      update: {},
      create: {
        id: 'home-garden-cat',
        name: 'Home & Garden',
        userId: user.id,
      },
    }),
  ])
  console.log('✅ Created categories:', categories.map((c: any) => c.name))

  // Create suppliers
  const suppliers = await Promise.all([
    prisma.supplier.upsert({
      where: { id: 'supplier-1' },
      update: {},
      create: {
        id: 'supplier-1',
        name: 'TechCorp Supplies',
        contactName: 'John Smith',
        contactEmail: 'john@techcorp.com',
        contactPhone: '+1-555-0101',
        address: '123 Tech Street, Silicon Valley, CA 94000',
        userId: user.id,
      },
    }),
    prisma.supplier.upsert({
      where: { id: 'supplier-2' },
      update: {},
      create: {
        id: 'supplier-2',
        name: 'Fashion Wholesale',
        contactName: 'Sarah Johnson',
        contactEmail: 'sarah@fashionwholesale.com',
        contactPhone: '+1-555-0102',
        address: '456 Fashion Ave, New York, NY 10001',
        userId: user.id,
      },
    }),
    prisma.supplier.upsert({
      where: { id: 'supplier-3' },
      update: {},
      create: {
        id: 'supplier-3',
        name: 'Book Distributors Inc',
        contactName: 'Mike Wilson',
        contactEmail: 'mike@bookdist.com',
        contactPhone: '+1-555-0103',
        address: '789 Reading Lane, Boston, MA 02101',
        userId: user.id,
      },
    }),
  ])
  console.log('✅ Created suppliers:', suppliers.map((s: any) => s.name))

  // Create warehouses
  const warehouses = await Promise.all([
    prisma.warehouse.upsert({
      where: { id: 'warehouse-1' },
      update: {},
      create: {
        id: 'warehouse-1',
        name: 'Main Warehouse',
        code: 'MAIN',
        address: '100 Main St, Anytown, ST 12345',
        userId: user.id,
      },
    }),
    prisma.warehouse.upsert({
      where: { id: 'warehouse-2' },
      update: {},
      create: {
        id: 'warehouse-2',
        name: 'Secondary Warehouse',
        code: 'SEC',
        address: '200 Secondary Ave, Othertown, ST 67890',
        userId: user.id,
      },
    }),
  ])
  console.log('✅ Created warehouses:', warehouses.map((w: any) => w.name))

  // Create customers
  const customers = await Promise.all([
    prisma.customer.upsert({
      where: { id: 'customer-1' },
      update: {},
      create: {
        id: 'customer-1',
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1-555-0201',
        company: 'Doe Enterprises',
        address: '123 Customer St',
        city: 'Customerville',
        state: 'CS',
        country: 'USA',
        postalCode: '12345',
        userId: user.id,
      },
    }),
    prisma.customer.upsert({
      where: { id: 'customer-2' },
      update: {},
      create: {
        id: 'customer-2',
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        phone: '+1-555-0202',
        address: '456 Buyer Ave',
        city: 'Buyertown',
        state: 'BY',
        country: 'USA',
        postalCode: '67890',
        userId: user.id,
      },
    }),
  ])
  console.log('✅ Created customers:', customers.map((c: any) => c.name))

  // Create products
  const products = await Promise.all([
    prisma.product.upsert({
      where: { sku: 'LAPTOP-001' },
      update: {},
      create: {
        name: 'Gaming Laptop',
        sku: 'LAPTOP-001',
        status: 'Available',
        categoryId: categories[0].id, // Electronics
        userId: user.id,
        defaultWarehouseId: warehouses[0].id,
        minStock: 10,
        maxStock: 100,
        reorderPoint: 20,
        reorderQuantity: 25,
        description: 'High-performance gaming laptop with RGB keyboard',
        hasVariants: true,
      },
    }),
    prisma.product.upsert({
      where: { sku: 'TSHIRT-001' },
      update: {},
      create: {
        name: 'Cotton T-Shirt',
        sku: 'TSHIRT-001',
        status: 'Available',
        categoryId: categories[1].id, // Clothing
        userId: user.id,
        defaultWarehouseId: warehouses[0].id,
        minStock: 50,
        maxStock: 500,
        reorderPoint: 75,
        reorderQuantity: 100,
        description: 'Comfortable 100% cotton t-shirt',
        hasVariants: true,
      },
    }),
    prisma.product.upsert({
      where: { sku: 'BOOK-001' },
      update: {},
      create: {
        name: 'JavaScript Guide',
        sku: 'BOOK-001',
        status: 'Available',
        categoryId: categories[2].id, // Books
        userId: user.id,
        defaultWarehouseId: warehouses[1].id,
        minStock: 20,
        maxStock: 200,
        reorderPoint: 30,
        reorderQuantity: 50,
        description: 'Comprehensive guide to modern JavaScript development',
        hasVariants: false,
      },
    }),
    prisma.product.upsert({
      where: { sku: 'CHAIR-001' },
      update: {},
      create: {
        name: 'Office Chair',
        sku: 'CHAIR-001',
        status: 'Available',
        categoryId: categories[3].id, // Home & Garden
        userId: user.id,
        defaultWarehouseId: warehouses[0].id,
        minStock: 5,
        maxStock: 50,
        reorderPoint: 10,
        reorderQuantity: 15,
        description: 'Ergonomic office chair with lumbar support',
        hasVariants: false,
      },
    }),
  ])
  console.log('✅ Created products:', products.map((p: any) => p.name))

  // Create product variants
  const variants = await Promise.all([
    // Laptop variants
    prisma.productVariant.upsert({
      where: { sku: 'LAPTOP-001-16GB' },
      update: {},
      create: {
        productId: products[0].id,
        name: 'Gaming Laptop - 16GB RAM',
        sku: 'LAPTOP-001-16GB',
        price: 1299.99,
        costPrice: 899.99,
        quantity: 30,
        minStock: 5,
        maxStock: 50,
        reorderPoint: 10,
        size: '15.6"',
        color: 'Black',
        material: 'Plastic/Metal',
        weight: '2.5kg',
        dimensions: '35x25x2cm',
        isActive: true,
      },
    }),
    prisma.productVariant.upsert({
      where: { sku: 'LAPTOP-001-32GB' },
      update: {},
      create: {
        productId: products[0].id,
        name: 'Gaming Laptop - 32GB RAM',
        sku: 'LAPTOP-001-32GB',
        price: 1499.99,
        costPrice: 1099.99,
        quantity: 20,
        minStock: 3,
        maxStock: 30,
        reorderPoint: 8,
        size: '15.6"',
        color: 'Black',
        material: 'Plastic/Metal',
        weight: '2.5kg',
        dimensions: '35x25x2cm',
        isActive: true,
      },
    }),
    // T-Shirt variants
    prisma.productVariant.upsert({
      where: { sku: 'TSHIRT-001-S' },
      update: {},
      create: {
        productId: products[1].id,
        name: 'Cotton T-Shirt - Small',
        sku: 'TSHIRT-001-S',
        price: 19.99,
        costPrice: 8.99,
        quantity: 50,
        minStock: 15,
        maxStock: 100,
        reorderPoint: 20,
        size: 'S',
        color: 'White',
        material: 'Cotton',
        isActive: true,
      },
    }),
    prisma.productVariant.upsert({
      where: { sku: 'TSHIRT-001-M' },
      update: {},
      create: {
        productId: products[1].id,
        name: 'Cotton T-Shirt - Medium',
        sku: 'TSHIRT-001-M',
        price: 19.99,
        costPrice: 8.99,
        quantity: 75,
        minStock: 20,
        maxStock: 150,
        reorderPoint: 25,
        size: 'M',
        color: 'White',
        material: 'Cotton',
        isActive: true,
      },
    }),
    prisma.productVariant.upsert({
      where: { sku: 'TSHIRT-001-L' },
      update: {},
      create: {
        productId: products[1].id,
        name: 'Cotton T-Shirt - Large',
        sku: 'TSHIRT-001-L',
        price: 19.99,
        costPrice: 8.99,
        quantity: 75,
        minStock: 20,
        maxStock: 150,
        reorderPoint: 25,
        size: 'L',
        color: 'White',
        material: 'Cotton',
        isActive: true,
      },
    }),
  ])
  console.log('✅ Created product variants:', variants.map((v: any) => v.name))

  // Create stock levels
  const stockLevels = await Promise.all([
    // Main warehouse stock for products
    prisma.stockLevel.create({
      data: {
        warehouseId: warehouses[0].id,
        productId: products[0].id,
        quantity: 50,
        safetyStock: 10,
      },
    }),
    prisma.stockLevel.create({
      data: {
        warehouseId: warehouses[0].id,
        productId: products[1].id,
        quantity: 200,
        safetyStock: 50,
      },
    }),
    prisma.stockLevel.create({
      data: {
        warehouseId: warehouses[0].id,
        productId: products[3].id,
        quantity: 25,
        safetyStock: 5,
      },
    }),
    // Secondary warehouse stock
    prisma.stockLevel.create({
      data: {
        warehouseId: warehouses[1].id,
        productId: products[2].id,
        quantity: 75,
        safetyStock: 20,
      },
    }),
    // Variant stock levels
    prisma.stockLevel.create({
      data: {
        warehouseId: warehouses[0].id,
        productVariantId: variants[0].id,
        quantity: 30,
        safetyStock: 5,
      },
    }),
    prisma.stockLevel.create({
      data: {
        warehouseId: warehouses[0].id,
        productVariantId: variants[1].id,
        quantity: 20,
        safetyStock: 3,
      },
    }),
  ])
  console.log('✅ Created stock levels for', stockLevels.length, 'items')

  // Create some stock alerts
  const stockAlerts = await Promise.all([
    prisma.stockAlert.upsert({
      where: { id: 'alert-1' },
      update: {},
      create: {
        id: 'alert-1',
        productId: products[3].id, // Office Chair - low stock
        warehouseId: warehouses[0].id,
        threshold: 10,
        alertType: 'low_stock',
        isActive: true,
        notes: 'Office chair stock is below reorder point',
      },
    }),
  ])
  console.log('✅ Created stock alerts:', stockAlerts.length)

  // Create purchase orders
  const purchaseOrders = await Promise.all([
    prisma.purchaseOrder.upsert({
      where: { poNumber: 'PO-2024-001' },
      update: {},
      create: {
        poNumber: 'PO-2024-001',
        supplierId: suppliers[0].id, // TechCorp Supplies
        userId: user.id,
        status: 'completed',
        orderedAt: new Date('2024-01-15'),
        expectedAt: new Date('2024-01-25'),
        receivedAt: new Date('2024-01-23'),
        totalCost: 54999.50,
        currency: 'USD',
        notes: 'Initial gaming laptop stock order',
      },
    }),
    prisma.purchaseOrder.upsert({
      where: { poNumber: 'PO-2024-002' },
      update: {},
      create: {
        poNumber: 'PO-2024-002',
        supplierId: suppliers[1].id, // Fashion Wholesale
        userId: user.id,
        status: 'completed',
        orderedAt: new Date('2024-02-01'),
        expectedAt: new Date('2024-02-10'),
        receivedAt: new Date('2024-02-09'),
        totalCost: 1798.00,
        currency: 'USD',
        notes: 'T-shirt bulk order for spring collection',
      },
    }),
    prisma.purchaseOrder.upsert({
      where: { poNumber: 'PO-2024-003' },
      update: {},
      create: {
        poNumber: 'PO-2024-003',
        supplierId: suppliers[2].id, // Book Distributors Inc
        userId: user.id,
        status: 'pending',
        orderedAt: new Date('2024-12-10'),
        expectedAt: new Date('2024-12-20'),
        totalCost: 2250.00,
        currency: 'USD',
        notes: 'JavaScript programming books - pending delivery',
      },
    }),
  ])
  console.log('✅ Created purchase orders:', purchaseOrders.map((po: any) => po.poNumber))

  // Create purchase order items
  const purchaseOrderItems = await Promise.all([
    // PO-2024-001 items (Laptops)
    prisma.purchaseOrderItem.create({
      data: {
        purchaseOrderId: purchaseOrders[0].id,
        productVariantId: variants[0].id, // 16GB Laptop
        orderedQuantity: 30,
        receivedQuantity: 30,
        costPerUnit: 899.99,
        lineTotal: 26999.70,
      },
    }),
    prisma.purchaseOrderItem.create({
      data: {
        purchaseOrderId: purchaseOrders[0].id,
        productVariantId: variants[1].id, // 32GB Laptop
        orderedQuantity: 25,
        receivedQuantity: 25,
        costPerUnit: 1099.99,
        lineTotal: 27499.75,
      },
    }),
    // PO-2024-002 items (T-Shirts)
    prisma.purchaseOrderItem.create({
      data: {
        purchaseOrderId: purchaseOrders[1].id,
        productVariantId: variants[2].id, // Small T-Shirt
        orderedQuantity: 50,
        receivedQuantity: 50,
        costPerUnit: 8.99,
        lineTotal: 449.50,
      },
    }),
    prisma.purchaseOrderItem.create({
      data: {
        purchaseOrderId: purchaseOrders[1].id,
        productVariantId: variants[3].id, // Medium T-Shirt
        orderedQuantity: 75,
        receivedQuantity: 75,
        costPerUnit: 8.99,
        lineTotal: 674.25,
      },
    }),
    prisma.purchaseOrderItem.create({
      data: {
        purchaseOrderId: purchaseOrders[1].id,
        productVariantId: variants[4].id, // Large T-Shirt
        orderedQuantity: 75,
        receivedQuantity: 75,
        costPerUnit: 8.99,
        lineTotal: 674.25,
      },
    }),
    // PO-2024-003 items (Books)
    prisma.purchaseOrderItem.create({
      data: {
        purchaseOrderId: purchaseOrders[2].id,
        productId: products[2].id, // JavaScript Guide
        orderedQuantity: 150,
        receivedQuantity: 0,
        costPerUnit: 15.00,
        lineTotal: 2250.00,
      },
    }),
  ])
  console.log('✅ Created purchase order items:', purchaseOrderItems.length)

  // Create sales orders
  const salesOrders = await Promise.all([
    prisma.order.upsert({
      where: { orderNumber: 'SO-2024-001' },
      update: {},
      create: {
        orderNumber: 'SO-2024-001',
        customerId: customers[0].id, // John Doe
        status: 'fulfilled',
        orderedAt: new Date('2024-03-01'),
        fulfilledAt: new Date('2024-03-03'),
        totalAmount: 2619.97,
        notes: 'Corporate laptop order for Doe Enterprises',
        source: 'website',
      },
    }),
    prisma.order.upsert({
      where: { orderNumber: 'SO-2024-002' },
      update: {},
      create: {
        orderNumber: 'SO-2024-002',
        customerId: customers[1].id, // Jane Smith
        status: 'fulfilled',
        orderedAt: new Date('2024-03-15'),
        fulfilledAt: new Date('2024-03-16'),
        totalAmount: 59.97,
        notes: 'T-shirt order - various sizes',
        source: 'online',
      },
    }),
    prisma.order.upsert({
      where: { orderNumber: 'SO-2024-003' },
      update: {},
      create: {
        orderNumber: 'SO-2024-003',
        customerId: customers[0].id, // John Doe
        status: 'processing',
        orderedAt: new Date('2024-12-15'),
        totalAmount: 1499.99,
        notes: 'High-end laptop order - awaiting fulfillment',
        source: 'phone',
      },
    }),
  ])
  console.log('✅ Created sales orders:', salesOrders.map((so: any) => so.orderNumber))

  // Create order items
  const orderItems = await Promise.all([
    // SO-2024-001 items
    prisma.orderItem.create({
      data: {
        orderId: salesOrders[0].id,
        productVariantId: variants[0].id, // 16GB Laptop
        quantity: 2,
        unitPrice: 1299.99,
        discount: 40.01,
        subtotal: 2559.98,
      },
    }),
    prisma.orderItem.create({
      data: {
        orderId: salesOrders[0].id,
        productId: products[3].id, // Office Chair
        quantity: 1,
        unitPrice: 199.99,
        discount: 140.00,
        subtotal: 59.99,
      },
    }),
    // SO-2024-002 items
    prisma.orderItem.create({
      data: {
        orderId: salesOrders[1].id,
        productVariantId: variants[2].id, // Small T-Shirt
        quantity: 1,
        unitPrice: 19.99,
        subtotal: 19.99,
      },
    }),
    prisma.orderItem.create({
      data: {
        orderId: salesOrders[1].id,
        productVariantId: variants[3].id, // Medium T-Shirt
        quantity: 2,
        unitPrice: 19.99,
        subtotal: 39.98,
      },
    }),
    // SO-2024-003 items
    prisma.orderItem.create({
      data: {
        orderId: salesOrders[2].id,
        productVariantId: variants[1].id, // 32GB Laptop
        quantity: 1,
        unitPrice: 1499.99,
        subtotal: 1499.99,
      },
    }),
  ])
  console.log('✅ Created order items:', orderItems.length)

  // Create inventory transactions for completed orders
  const inventoryTransactions = await Promise.all([
    // Purchase transactions (PO-2024-001)
    prisma.inventoryTransaction.create({
      data: {
        transactionType: 'PURCHASE',
        productVariantId: variants[0].id,
        warehouseId: warehouses[0].id,
        userId: user.id,
        purchaseOrderId: purchaseOrders[0].id,
        quantity: 30,
        referenceCode: 'PO-2024-001',
        notes: 'Received 16GB laptops from TechCorp',
        createdAt: new Date('2024-01-23'),
      },
    }),
    prisma.inventoryTransaction.create({
      data: {
        transactionType: 'PURCHASE',
        productVariantId: variants[1].id,
        warehouseId: warehouses[0].id,
        userId: user.id,
        purchaseOrderId: purchaseOrders[0].id,
        quantity: 25,
        referenceCode: 'PO-2024-001',
        notes: 'Received 32GB laptops from TechCorp',
        createdAt: new Date('2024-01-23'),
      },
    }),
    // Purchase transactions (PO-2024-002)
    prisma.inventoryTransaction.create({
      data: {
        transactionType: 'PURCHASE',
        productVariantId: variants[2].id,
        warehouseId: warehouses[0].id,
        userId: user.id,
        purchaseOrderId: purchaseOrders[1].id,
        quantity: 50,
        referenceCode: 'PO-2024-002',
        notes: 'Received Small T-shirts from Fashion Wholesale',
        createdAt: new Date('2024-02-09'),
      },
    }),
    prisma.inventoryTransaction.create({
      data: {
        transactionType: 'PURCHASE',
        productVariantId: variants[3].id,
        warehouseId: warehouses[0].id,
        userId: user.id,
        purchaseOrderId: purchaseOrders[1].id,
        quantity: 75,
        referenceCode: 'PO-2024-002',
        notes: 'Received Medium T-shirts from Fashion Wholesale',
        createdAt: new Date('2024-02-09'),
      },
    }),
    prisma.inventoryTransaction.create({
      data: {
        transactionType: 'PURCHASE',
        productVariantId: variants[4].id,
        warehouseId: warehouses[0].id,
        userId: user.id,
        purchaseOrderId: purchaseOrders[1].id,
        quantity: 75,
        referenceCode: 'PO-2024-002',
        notes: 'Received Large T-shirts from Fashion Wholesale',
        createdAt: new Date('2024-02-09'),
      },
    }),
    // Sales transactions (SO-2024-001)
    prisma.inventoryTransaction.create({
      data: {
        transactionType: 'SALE',
        productVariantId: variants[0].id,
        warehouseId: warehouses[0].id,
        userId: user.id,
        orderId: salesOrders[0].id,
        quantity: -2,
        referenceCode: 'SO-2024-001',
        notes: 'Sold 2x 16GB laptops to Doe Enterprises',
        createdAt: new Date('2024-03-03'),
      },
    }),
    prisma.inventoryTransaction.create({
      data: {
        transactionType: 'SALE',
        productId: products[3].id,
        warehouseId: warehouses[0].id,
        userId: user.id,
        orderId: salesOrders[0].id,
        quantity: -1,
        referenceCode: 'SO-2024-001',
        notes: 'Sold 1x Office Chair to Doe Enterprises',
        createdAt: new Date('2024-03-03'),
      },
    }),
    // Sales transactions (SO-2024-002)
    prisma.inventoryTransaction.create({
      data: {
        transactionType: 'SALE',
        productVariantId: variants[2].id,
        warehouseId: warehouses[0].id,
        userId: user.id,
        orderId: salesOrders[1].id,
        quantity: -1,
        referenceCode: 'SO-2024-002',
        notes: 'Sold 1x Small T-shirt',
        createdAt: new Date('2024-03-16'),
      },
    }),
    prisma.inventoryTransaction.create({
      data: {
        transactionType: 'SALE',
        productVariantId: variants[3].id,
        warehouseId: warehouses[0].id,
        userId: user.id,
        orderId: salesOrders[1].id,
        quantity: -2,
        referenceCode: 'SO-2024-002',
        notes: 'Sold 2x Medium T-shirts',
        createdAt: new Date('2024-03-16'),
      },
    }),
  ])
  console.log('✅ Created inventory transactions:', inventoryTransactions.length)

  console.log('🎉 Database seeding completed successfully!')
  console.log('\n📊 Summary:')
  console.log(`   Users: 1`)
  console.log(`   Categories: ${categories.length}`)
  console.log(`   Suppliers: ${suppliers.length}`)
  console.log(`   Warehouses: ${warehouses.length}`)
  console.log(`   Customers: ${customers.length}`)
  console.log(`   Products: ${products.length}`)
  console.log(`   Product Variants: ${variants.length}`)
  console.log(`   Stock Levels: ${stockLevels.length}`)
  console.log(`   Stock Alerts: ${stockAlerts.length}`)
  console.log(`   Purchase Orders: ${purchaseOrders.length}`)
  console.log(`   Purchase Order Items: ${purchaseOrderItems.length}`)
  console.log(`   Sales Orders: ${salesOrders.length}`)
  console.log(`   Order Items: ${orderItems.length}`)
  console.log(`   Inventory Transactions: ${inventoryTransactions.length}`)
  console.log('\n🔐 Default login credentials:')
  console.log('   Email: admin@example.com')
  console.log('   Password: password123')
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })