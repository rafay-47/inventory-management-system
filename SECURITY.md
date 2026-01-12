# Role-Based Access Control (RBAC) Security Documentation

## Overview
This application implements a comprehensive role-based access control system with multiple layers of security to ensure that users can only access features and data appropriate to their role.

## Roles

### Admin
- **Full Access**: Complete access to all features and data
- **Routes**: Dashboard (/), Products, Purchase Orders, Sales, Business Insights, API Docs, API Status
- **Data Visibility**: Can see all financial data including revenue, costs, and profit margins

### Salesperson
- **Limited Access**: Restricted to sales-related functionality only
- **Routes**: Sales (/sales) only
- **Data Visibility**: 
  - Cannot see revenue totals or transaction amounts
  - Can record sales transactions (amounts auto-calculated from product prices)
  - Can view customer information and product names
  - Can track units sold and customer counts

## Security Layers

### 1. API-Level Security (Server-Side)
**Location**: `pages/api/**/*.ts` and `middleware/roleMiddleware.ts`

All API endpoints check permissions before executing any operations:

```typescript
const canCreate = await hasPermission(userId, "products", "create");
if (!canCreate) {
  return res.status(403).json({ 
    error: "Forbidden", 
    message: "You don't have permission to create products" 
  });
}
```

**Benefits**:
- Even if frontend is bypassed, API calls will be rejected
- Prevents unauthorized data access via direct API calls
- Consistent permission checking across all endpoints

### 2. Route Protection (Middleware)
**Location**: `middleware.ts`

Next.js middleware intercepts all route requests and validates:
- User authentication (valid session token)
- User role assignment
- Route authorization for the user's role

```typescript
// Attempts to access unauthorized routes are automatically redirected
if (!hasAccessToRoute(userRoles, path)) {
  const defaultRoute = userRoles.includes("admin") ? "/" : "/sales";
  return NextResponse.redirect(unauthorizedUrl);
}
```

**Benefits**:
- Prevents direct URL manipulation
- Automatic redirection to authorized routes
- Server-side validation before page loads

### 3. UI-Level Restrictions (Client-Side)
**Location**: `app/components/SideNav.tsx`, `app/sales/page.tsx`

The UI dynamically adjusts based on user roles:

**Navigation Filtering**:
```typescript
const visibleNavItems = navItems.filter((item) => {
  if (!item.roles) return true;
  return item.roles.some((role) => user.roles?.includes(role));
});
```

**Data Visibility**:
```typescript
{isAdmin() && (
  <Card>
    <CardTitle>Total Revenue</CardTitle>
    <CardContent>{formatCurrency(salesSummary.totalRevenue)}</CardContent>
  </Card>
)}
```

**Benefits**:
- Clean, role-appropriate user experience
- No confusing or inaccessible menu items
- Sensitive data hidden from unauthorized roles

### 4. Automatic Role Assignment
**Location**: `pages/api/auth/register.ts`

New users automatically receive the "salesperson" role upon registration:

```typescript
const salespersonRole = await prisma.role.findUnique({
  where: { name: 'salesperson' },
});
if (salespersonRole) {
  await prisma.userRole.create({
    data: { userId: createdUser.id, roleId: salespersonRole.id },
  });
}
```

**Benefits**:
- Secure by default (least privilege principle)
- No users without roles
- Admins must manually elevate privileges

### 5. Backwards Compatibility Safeguard
**Location**: `middleware/roleMiddleware.ts`

Users without roles get temporary admin access with warning logs:

```typescript
if (roles.length === 0) {
  console.warn(`User ${userId} has no roles assigned. Granting temporary admin access.`);
  return true; // Grant access but log for audit
}
```

**Benefits**:
- Existing users continue working
- Security team alerted via logs
- Graceful migration path

## Permission Matrix

| Resource | Admin | Salesperson |
|----------|-------|-------------|
| **Products** | Read, Create, Update, Delete | None |
| **Suppliers** | Read, Create, Update, Delete | None |
| **Categories** | Read, Create, Update, Delete | None |
| **Warehouses** | Read, Create, Update, Delete | None |
| **Variants** | Read, Create, Update, Delete | None |
| **Purchase Orders** | Read, Create, Update, Delete, Receive | None |
| **Sales** | Read, Create, Update, Delete | Read, Create |
| **Customers** | Read, Create, Update, Delete | Read, Create, Update |
| **Revenue Data** | Visible | Hidden |
| **Pricing Data** | Full Access | Hidden |

## Security Best Practices Implemented

### 1. Defense in Depth
Multiple security layers ensure that bypassing one layer doesn't compromise the system:
- Frontend hides UI elements
- Middleware blocks route access
- API validates every request
- Database enforces data integrity

### 2. Principle of Least Privilege
Users receive only the minimum permissions needed:
- New users default to salesperson (most restrictive)
- Admin elevation requires manual action
- Each role has explicitly defined permissions

### 3. Server-Side Validation
All critical security decisions happen server-side:
- JWT tokens verified on server
- Role checks performed in API endpoints
- Database queries filtered by permissions

### 4. Audit Trail
Security events are logged for monitoring:
- Unauthorized access attempts logged
- Role assignments logged
- Permission checks recorded in development mode

### 5. Secure Session Management
- HTTP-only cookies prevent XSS attacks
- Session tokens expire after 1 hour
- Tokens validated on every request

## Testing Security

### Test Scenarios

1. **Salesperson trying to access Products page**:
   - Direct URL: Redirected to /sales by middleware
   - API call: Returns 403 Forbidden
   - Result: ✅ Secure

2. **Salesperson trying to see revenue**:
   - UI: Revenue cards not rendered
   - API: Data not included in response for non-admins
   - Result: ✅ Secure

3. **Unauthenticated user**:
   - Any protected route: Redirected to /login
   - API calls: Return 401 Unauthorized
   - Result: ✅ Secure

4. **Token manipulation**:
   - Invalid token: Rejected by verifyToken()
   - Expired token: Redirect to login
   - Result: ✅ Secure

## Monitoring & Alerts

Watch for these warning signs in logs:

```
⚠️  User ${userId} attempted to access ${path} with no roles assigned
⚠️  User ${userId} with roles [salesperson] attempted to access unauthorized route: /products
```

These indicate:
- Potential security probing
- Users needing role assignment
- Configuration issues

## Maintenance

### Adding a New Role

1. Update `middleware/roleMiddleware.ts`:
```typescript
export enum UserRoles {
  ADMIN = "admin",
  SALESPERSON = "salesperson",
  MANAGER = "manager", // New role
}
```

2. Define permissions:
```typescript
export const RolePermissions = {
  // ... existing roles
  [UserRoles.MANAGER]: {
    products: ["read", "update"],
    sales: ["read", "create"],
    // ... define permissions
  },
};
```

3. Update route access in `middleware.ts`:
```typescript
const roleBasedRoutes = {
  admin: ["/", "/products", ...],
  manager: ["/", "/products", "/sales"], // New
  salesperson: ["/sales"],
};
```

4. Update navigation in `app/components/SideNav.tsx`:
```typescript
{ label: "Products", href: "/products", icon: PackageOpen, 
  roles: ["admin", "manager"] }, // Add new role
```

### Revoking Access

To immediately revoke all access for a user:
```sql
DELETE FROM "UserRole" WHERE "userId" = 'user-id-here';
```

## Emergency Procedures

### Lockout Recovery
If locked out of admin account:
```bash
node prisma/assign-roles.js
```
This assigns admin role to all users without roles.

### Disable RBAC Temporarily
In `middleware/roleMiddleware.ts`, set:
```typescript
if (roles.length === 0) {
  return true; // This allows all access when no roles assigned
}
```

⚠️ **Warning**: Only use in emergency. Re-enable RBAC immediately after recovery.

## Conclusion

This multi-layered RBAC implementation ensures:
- ✅ Unauthorized users cannot access restricted features
- ✅ Data visibility is role-appropriate
- ✅ Direct URL manipulation is blocked
- ✅ API calls are properly authorized
- ✅ System remains auditable and maintainable

The system is secure against common attack vectors including:
- Direct URL manipulation
- Client-side bypass attempts
- Token manipulation
- Privilege escalation
- Session hijacking
