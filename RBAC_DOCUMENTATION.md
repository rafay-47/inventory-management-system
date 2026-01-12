# Role-Based Access Control (RBAC) Documentation

## Overview
The system now includes role-based access control with two primary roles: **Admin** and **Salesperson**.

## Roles

### 1. Admin
Full access to all system features including:
- ✅ View, create, update, delete products
- ✅ View, create, update, delete suppliers
- ✅ View, create, update, delete categories
- ✅ View, create, update, delete warehouses
- ✅ View, create, update, delete product variants
- ✅ View, create, update, delete, receive purchase orders
- ✅ View, create, update, delete sales
- ✅ View, create, update, delete customers

### 2. Salesperson
Limited access focused on sales operations:
- ✅ View products (read-only)
- ✅ View suppliers (read-only)
- ✅ View categories (read-only)
- ✅ View warehouses (read-only)
- ✅ View product variants (read-only)
- ❌ No access to purchase orders
- ✅ View and create sales
- ✅ View, create, and update customers

## Default Users

After running the seed script, two users are available:

**Admin User:**
- Email: `admin@example.com`
- Password: `password123`
- Role: Admin

**Salesperson User:**
- Email: `sales@example.com`
- Password: `password123`
- Role: Salesperson

## Technical Implementation

### File Structure
```
middleware/
  roleMiddleware.ts          # Role checking and permission functions
  
pages/api/
  auth/
    me.ts                    # Get current user with roles
  products/index.ts          # Products with role checks
  suppliers/index.ts         # Suppliers with role checks
  categories/index.ts        # Categories with role checks
  warehouses/index.ts        # Warehouses with role checks
  variants/index.ts          # Variants with role checks
  sales/index.ts             # Sales with role checks
  purchase-orders/index.ts   # Purchase orders with role checks
```

### Database Schema
The role system uses three main models:
- `Role` - Stores role definitions
- `UserRole` - Maps users to roles (many-to-many)
- `RolePermission` - Stores granular permissions (extensible for future use)

### Middleware Functions

#### `hasPermission(userId, resource, action)`
Checks if a user has permission to perform an action on a resource.

```typescript
const canCreate = await hasPermission(userId, "products", "create");
if (!canCreate) {
  return res.status(403).json({ error: "Forbidden" });
}
```

#### `getUserRoles(userId)`
Returns an array of role names for a user.

```typescript
const roles = await getUserRoles(userId);
// Returns: ["admin"] or ["salesperson"]
```

#### `hasRole(userId, roleName)`
Checks if a user has a specific role.

```typescript
const isAdmin = await hasRole(userId, "admin");
```

### API Endpoint Protection

All API endpoints now check permissions before executing operations:

```typescript
case "POST":
  try {
    const canCreate = await hasPermission(userId, "products", "create");
    if (!canCreate) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You don't have permission to create products"
      });
    }
    // ... rest of the code
  }
```

### Permission Matrix

| Resource | Admin Permissions | Salesperson Permissions |
|----------|------------------|------------------------|
| Products | read, create, update, delete | read |
| Suppliers | read, create, update, delete | read |
| Categories | read, create, update, delete | read |
| Warehouses | read, create, update, delete | read |
| Variants | read, create, update, delete | read |
| Purchase Orders | read, create, update, delete, receive | none |
| Sales | read, create, update, delete | read, create |
| Customers | read, create, update, delete | read, create, update |

## Usage

### Running the Seed Script

To set up roles and default users:

```bash
npx prisma db seed
```

Or if you need to reset the database:

```bash
npx prisma migrate reset
```

### Getting User Roles in Frontend

Call the `/api/auth/me` endpoint:

```typescript
const response = await fetch('/api/auth/me');
const userData = await response.json();
// userData.roles = ["admin"] or ["salesperson"]
```

### Testing Role-Based Access

1. Login as admin:
   - Email: `admin@example.com`
   - Password: `password123`
   - Should have full access to all features

2. Login as salesperson:
   - Email: `sales@example.com`
   - Password: `password123`
   - Should only be able to view products and create sales

## Error Responses

When a user attempts an action without permission:

```json
{
  "error": "Forbidden",
  "message": "You don't have permission to create products"
}
```

## Future Enhancements

Potential improvements to the role system:
- Add more granular roles (Manager, Warehouse Staff, etc.)
- Implement custom role creation in the UI
- Add permission management interface
- Create role-based UI component visibility
- Add audit logging for permission checks
- Implement field-level permissions
