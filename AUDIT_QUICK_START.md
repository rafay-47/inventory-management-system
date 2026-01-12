# Quick Start: Adding Audit Logging to Your APIs

## Step 1: Import the Audit Logger

At the top of your API file:

```typescript
import { auditCreate, auditUpdate, auditDelete, createAuditLog } from "@/utils/auditLogger";
```

## Step 2: Get User Information

Most APIs already have session/user info:

```typescript
const session = await getSessionServer(req, res);
const userInfo = {
  userId: session.id,
  userName: session.name,
  userEmail: session.email,
};
```

## Step 3: Add Audit Logging After Operations

### For CREATE Operations

```typescript
// After creating the entity
const createdProduct = await prisma.product.create({ data: {...} });

await auditCreate(
  "Product",           // Entity type
  createdProduct,      // The created entity (must have id and name)
  userInfo,           // User who created it
  req                 // Request object (for IP/User-Agent)
);
```

### For UPDATE Operations

```typescript
// Get old values first
const oldProduct = await prisma.product.findUnique({ where: { id } });

// Perform update
const updatedProduct = await prisma.product.update({
  where: { id },
  data: updates,
});

await auditUpdate(
  "Product",                    // Entity type
  updatedProduct.id,           // Entity ID
  updatedProduct.name,         // Entity name
  oldProduct,                  // Old values (before update)
  updatedProduct,              // New values (after update)
  userInfo,                    // User who updated it
  req                          // Request object
);
```

### For DELETE Operations

```typescript
// Get entity before deleting
const product = await prisma.product.findUnique({ where: { id } });

// Perform deletion
await prisma.product.delete({ where: { id } });

await auditDelete(
  "Product",           // Entity type
  product,            // The deleted entity
  userInfo,           // User who deleted it
  req                 // Request object
);
```

## Step 4: Handle Errors

Wrap audit logs in try-catch or let them fail silently (they won't break your API):

```typescript
try {
  const product = await prisma.product.create({ data });
  
  // Audit log won't break the operation if it fails
  await auditCreate("Product", product, userInfo, req);
  
  res.status(201).json(product);
} catch (error) {
  // Log the error with audit
  await createAuditLog({
    ...userInfo,
    action: "CREATE",
    entityType: "Product",
    status: "error",
    errorMessage: error.message,
  }, req);
  
  res.status(500).json({ error: error.message });
}
```

## Common Patterns

### Bulk Operations

```typescript
// After bulk create
await createAuditLog({
  ...userInfo,
  action: "BULK_CREATE",
  entityType: "Product",
  status: "success",
  metadata: { count: products.length },
}, req);
```

### View/Read Operations (Optional)

```typescript
// For sensitive data access
await createAuditLog({
  ...userInfo,
  action: "VIEW",
  entityType: "FinancialReport",
  entityId: reportId,
  entityName: report.name,
  status: "success",
}, req);
```

### Exports

```typescript
await createAuditLog({
  ...userInfo,
  action: "EXPORT",
  entityType: "Product",
  status: "success",
  metadata: {
    format: "CSV",
    recordCount: products.length,
    filters: req.query,
  },
}, req);
```

## Example: Complete API with Audit Logging

```typescript
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { getSessionServer } from "@/utils/auth";
import { auditCreate, auditUpdate, auditDelete } from "@/utils/auditLogger";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionServer(req, res);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userInfo = {
    userId: session.id,
    userName: session.name,
    userEmail: session.email,
  };

  switch (req.method) {
    case "POST":
      try {
        const category = await prisma.category.create({
          data: { ...req.body, userId: session.id },
        });
        
        await auditCreate("Category", category, userInfo, req);
        
        return res.status(201).json(category);
      } catch (error: any) {
        await createAuditLog({
          ...userInfo,
          action: "CREATE",
          entityType: "Category",
          status: "error",
          errorMessage: error.message,
        }, req);
        
        return res.status(500).json({ error: error.message });
      }

    case "PUT":
      try {
        const { id } = req.query;
        const oldCategory = await prisma.category.findUnique({ where: { id: id as string } });
        
        const updatedCategory = await prisma.category.update({
          where: { id: id as string },
          data: req.body,
        });
        
        await auditUpdate(
          "Category",
          updatedCategory.id,
          updatedCategory.name,
          oldCategory,
          updatedCategory,
          userInfo,
          req
        );
        
        return res.status(200).json(updatedCategory);
      } catch (error: any) {
        return res.status(500).json({ error: error.message });
      }

    case "DELETE":
      try {
        const { id } = req.query;
        const category = await prisma.category.findUnique({ where: { id: id as string } });
        
        await prisma.category.delete({ where: { id: id as string } });
        
        await auditDelete("Category", category, userInfo, req);
        
        return res.status(204).end();
      } catch (error: any) {
        return res.status(500).json({ error: error.message });
      }

    default:
      return res.status(405).json({ error: "Method not allowed" });
  }
}
```

## Tips

1. **Always pass the request object** - It captures IP and User-Agent automatically
2. **Log after successful operations** - Don't log before the operation completes
3. **Use appropriate action names** - Be consistent (CREATE, UPDATE, DELETE, LOGIN, etc.)
4. **Include meaningful metadata** - Help future debugging
5. **Don't log sensitive data** - Passwords, tokens, API keys should never be in audit logs
6. **Entity names help** - Store human-readable names for better audit trail readability

## Need Help?

- Full documentation: See `AUDIT_LOGGING.md`
- Utility functions: `utils/auditLogger.ts`
- Example implementation: `pages/api/products/index.ts`
- View audit logs: Navigate to `/audit-logs` (admin only)
