# Audit Logging and Monitoring System

## Overview

A comprehensive audit logging system has been implemented to track all user activities and system events. This system provides complete visibility into who did what, when, and from where - essential for security, compliance, and debugging.

## Features

### 🔍 What Gets Logged

The audit system tracks:
- **User Authentication**: Login attempts (success/failed), logouts
- **Data Operations**: Create, Update, Delete operations on all entities
- **View Operations**: Record viewing and data access
- **Export Operations**: Data exports and reports
- **System Events**: Configuration changes, errors, and failures

### 📊 Captured Information

Each audit log entry includes:
- User information (ID, name, email)
- Action type (CREATE, UPDATE, DELETE, LOGIN, LOGOUT, VIEW, EXPORT)
- Entity details (type, ID, name)
- Before/after states (for updates and deletes)
- IP address and User Agent
- Status (success, failed, error)
- Error messages (if applicable)
- Custom metadata
- Timestamp

## Database Schema

### AuditLog Model

```prisma
model AuditLog {
  id          String   @id @default(uuid())
  userId      String?
  userName    String?
  userEmail   String?
  action      String   // CREATE, UPDATE, DELETE, LOGIN, LOGOUT, VIEW, EXPORT
  entityType  String?  // Product, Category, Supplier, Order, etc.
  entityId    String?
  entityName  String?  // Human-readable name
  oldValues   Json?    // Previous state
  newValues   Json?    // New state
  ipAddress   String?
  userAgent   String?
  status      String   @default("success") // success, failed, error
  errorMessage String?
  metadata    Json?
  createdAt   DateTime @default(now())
  user        User?    @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([action])
  @@index([entityType])
  @@index([createdAt])
  @@index([status])
}
```

## Usage

### Basic Audit Logging

```typescript
import { auditCreate, auditUpdate, auditDelete, auditLogin, auditLogout } from "@/utils/auditLogger";

// Log entity creation
await auditCreate(
  "Product",
  product,
  { userId: user.id, userName: user.name, userEmail: user.email },
  req
);

// Log entity update
await auditUpdate(
  "Product",
  productId,
  productName,
  oldProduct,
  updatedProduct,
  { userId: user.id, userName: user.name, userEmail: user.email },
  req
);

// Log entity deletion
await auditDelete(
  "Product",
  product,
  { userId: user.id, userName: user.name, userEmail: user.email },
  req
);

// Log login attempts
await auditLogin(
  { userId: user.id, userName: user.name, userEmail: user.email },
  "success", // or "failed"
  undefined, // error message if failed
  req
);

// Log logout
await auditLogout(
  { userId: user.id, userName: user.name, userEmail: user.email },
  req
);
```

### Custom Audit Logs

```typescript
import { createAuditLog } from "@/utils/auditLogger";

await createAuditLog(
  {
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    action: "EXPORT",
    entityType: "Report",
    status: "success",
    metadata: { 
      reportType: "sales",
      recordCount: 150,
      format: "PDF"
    },
  },
  req
);
```

## API Endpoints

### Get Audit Logs
**GET** `/api/audit-logs`

Query Parameters:
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 50)
- `action` (string): Filter by action type
- `entityType` (string): Filter by entity type
- `userId` (string): Filter by user
- `status` (string): Filter by status
- `startDate` (ISO date): Filter from date
- `endDate` (ISO date): Filter to date
- `search` (string): Search in user names, emails, entity names

**Access**: Admin only

Response:
```json
{
  "logs": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1500,
    "totalPages": 30
  },
  "summary": {
    "totalLogs": 1500,
    "actionBreakdown": [
      { "action": "LOGIN", "count": 450 },
      { "action": "CREATE", "count": 320 }
    ]
  }
}
```

### Get Audit Statistics
**GET** `/api/audit-logs/stats`

Query Parameters:
- `period` (string): Time period (24h, 7d, 30d, 90d)

**Access**: Admin only

Response:
```json
{
  "period": "7d",
  "totalLogs": 1500,
  "logsByAction": [...],
  "logsByEntity": [...],
  "logsByStatus": [...],
  "mostActiveUsers": [...],
  "recentFailures": [...],
  "dailyActivity": [...]
}
```

## UI Features

### Audit Logs Dashboard (`/audit-logs`)

**Access**: Admin only

Features:
1. **Statistics Cards**
   - Total logs count
   - Most common action
   - Active users count
   - Failed actions count

2. **Advanced Filtering**
   - Search by user, email, or entity name
   - Filter by action type
   - Filter by entity type
   - Filter by status
   - Date range filtering

3. **Audit Trail Table**
   - Timestamp
   - User information
   - Action with color-coded badges
   - Entity details
   - Status with icons
   - IP address
   - Detail view button

4. **Detail Modal**
   - Complete log information
   - Before/after values comparison
   - Error messages
   - User agent and IP details
   - Metadata display

5. **Pagination**
   - Navigate through large log sets
   - Configurable page size

## Integration Points

### Currently Integrated

✅ **Authentication**
- Login attempts (success/failed)
- Logout events

✅ **Products**
- Product creation

### To Be Integrated

Add audit logging to remaining APIs:
- Product updates and deletions
- Category operations
- Supplier operations
- Purchase order operations
- Sales operations
- User management operations
- Inventory adjustments
- Warehouse operations

## Best Practices

1. **Always Log Critical Operations**
   - User authentication
   - Data modifications
   - Permission changes
   - Deletions

2. **Include Context**
   - Always pass the request object for IP/User-Agent capture
   - Include relevant metadata
   - Store before/after states for updates

3. **Error Handling**
   - Audit logging failures won't break main operations
   - Errors are logged to console
   - Consider separate error monitoring

4. **Performance**
   - Audit logs are created asynchronously
   - Indexed fields for fast queries
   - Consider archiving old logs

5. **Privacy & Compliance**
   - Avoid logging sensitive data (passwords, tokens)
   - Implement data retention policies
   - Consider GDPR/compliance requirements

## Extending the System

### Adding New Action Types

```typescript
// In utils/auditLogger.ts
export async function auditImport(
  entityType: string,
  recordCount: number,
  user: { userId?: string; userName?: string; userEmail?: string },
  req?: NextApiRequest
) {
  await createAuditLog({
    ...user,
    action: "IMPORT",
    entityType,
    status: "success",
    metadata: { recordCount },
  }, req);
}
```

### Adding to Existing APIs

```typescript
// In your API handler
import { auditUpdate } from "@/utils/auditLogger";

// After successful update
await auditUpdate(
  "YourEntity",
  entity.id,
  entity.name,
  oldValues,
  newValues,
  { userId: session.id, userName: session.name, userEmail: session.email },
  req
);
```

## Maintenance

### Database Migration

Run the migration to create the AuditLog table:

```bash
npx prisma migrate dev --name add_audit_log
```

### Viewing Recent Logs

```bash
# In Prisma Studio
npx prisma studio
```

### Querying Logs

```sql
-- Recent failed logins
SELECT * FROM "AuditLog" 
WHERE action = 'LOGIN' AND status = 'failed' 
ORDER BY created_at DESC LIMIT 50;

-- User activity summary
SELECT user_name, action, COUNT(*) as count
FROM "AuditLog"
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY user_name, action
ORDER BY count DESC;

-- Failed operations
SELECT * FROM "AuditLog"
WHERE status IN ('failed', 'error')
ORDER BY created_at DESC;
```

## Security Considerations

1. **Access Control**: Only admins can view audit logs
2. **Immutability**: Audit logs should never be modified or deleted
3. **Backup**: Regular backups of audit data
4. **Monitoring**: Alert on suspicious patterns
5. **Encryption**: Consider encrypting sensitive audit data at rest

## Future Enhancements

- [ ] Real-time audit log streaming
- [ ] Advanced analytics and reporting
- [ ] Anomaly detection and alerts
- [ ] Export audit logs to external SIEM systems
- [ ] Data retention and archival policies
- [ ] Compliance reports (SOC2, HIPAA, GDPR)
- [ ] Audit log integrity verification
- [ ] User activity heatmaps
- [ ] Automated incident response

## Support

For issues or questions about the audit logging system, refer to:
- Database schema: `prisma/schema.prisma`
- Utility functions: `utils/auditLogger.ts`
- API endpoints: `pages/api/audit-logs/`
- UI component: `app/audit-logs/page.tsx`
