// Simple in-memory cache for role permissions
// Reduces database queries for frequently checked permissions

interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

class SimpleCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private ttl: number; // Time to live in milliseconds

  constructor(ttlSeconds: number = 300) {
    // Default 5 minutes
    this.ttl = ttlSeconds * 1000;
  }

  set(key: string, value: T): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Invalidate all entries for a specific user (when their roles change)
  invalidateUser(userId: string): void {
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.startsWith(`roles:${userId}`) || key.startsWith(`perm:${userId}`)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key) => this.delete(key));
  }
}

// Export singleton cache instances
export const roleCache = new SimpleCache<string[]>(300); // 5 minutes for roles
export const permissionCache = new SimpleCache<boolean>(300); // 5 minutes for permissions

export default SimpleCache;
