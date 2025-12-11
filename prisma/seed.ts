import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Create a default user
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