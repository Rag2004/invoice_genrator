/**
 * API Cache Module
 * 
 * Provides client-side caching for API responses to prevent redundant
 * network requests when navigating between pages.
 * 
 * Features:
 * - TTL (time-to-live) support for automatic expiration
 * - Pattern-based cache invalidation
 * - In-flight request deduplication (prevents race conditions)
 */

// In-memory cache store
const cache = new Map();

// In-flight requests (prevents duplicate parallel calls)
const inFlightRequests = new Map();

// Default TTL: 5 minutes
const DEFAULT_TTL = 5 * 60 * 1000;

/**
 * Execute a function with deduplication.
 * If the same key is already being fetched, returns the existing Promise.
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Async function to execute
 * @param {number} ttlMs - TTL for the result
 * @returns {Promise<any>}
 */
export async function dedupedFetch(key, fetchFn, ttlMs = DEFAULT_TTL) {
    // 1. Check cache first
    const cached = getCache(key);
    if (cached) {
        return cached;
    }

    // 2. Check if request is already in-flight
    if (inFlightRequests.has(key)) {
        return inFlightRequests.get(key);
    }

    // 3. Make the request and track it
    const promise = fetchFn()
        .then((result) => {
            // Cache successful results
            if (result) {
                setCache(key, result, ttlMs);
            }
            return result;
        })
        .finally(() => {
            // Remove from in-flight tracking
            inFlightRequests.delete(key);
        });

    inFlightRequests.set(key, promise);
    return promise;
}

/**
 * Store data in cache with TTL
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} ttlMs - Time to live in milliseconds (default: 5 min)
 */

export function setCache(key, data, ttlMs = DEFAULT_TTL) {
    if (!key || data === undefined) return;

    cache.set(key, {
        data,
        expiresAt: Date.now() + ttlMs,
        cachedAt: Date.now()
    });
}

/**
 * Get cached data if not expired
 * @param {string} key - Cache key
 * @returns {any|null} - Cached data or null if missing/expired
 */
export function getCache(key) {
    if (!key) return null;

    const entry = cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() > entry.expiresAt) {
        cache.delete(key);
        return null;
    }

    return entry.data;
}

/**
 * Check if cache entry exists and is valid
 * @param {string} key - Cache key
 * @returns {boolean}
 */
export function hasCache(key) {
    return getCache(key) !== null;
}

/**
 * Invalidate specific cache entry
 * @param {string} key - Cache key to invalidate
 */
export function invalidateCache(key) {
    if (!key) return;
    cache.delete(key);
}

/**
 * Invalidate all cache entries matching a pattern
 * @param {string} pattern - Pattern to match (e.g., 'invoices:' matches 'invoices:123')
 */
export function invalidateCachePattern(pattern) {
    if (!pattern) return;

    for (const key of cache.keys()) {
        if (key.startsWith(pattern)) {
            cache.delete(key);
        }
    }
}

/**
 * Clear all cached data
 */
export function clearAllCache() {
    cache.clear();
}

/**
 * Get cache statistics (for debugging)
 * @returns {Object} Cache stats
 */
export function getCacheStats() {
    const stats = {
        size: cache.size,
        keys: [],
        totalBytes: 0
    };

    for (const [key, entry] of cache.entries()) {
        const isExpired = Date.now() > entry.expiresAt;
        const ttlRemaining = Math.max(0, entry.expiresAt - Date.now());

        stats.keys.push({
            key,
            isExpired,
            ttlRemaining: Math.round(ttlRemaining / 1000) + 's',
            cachedAt: new Date(entry.cachedAt).toISOString()
        });
    }

    return stats;
}

// Cache key constants for consistency
export const CACHE_KEYS = {
    TEAM: 'team',
    INVOICES: (consultantId) => `invoices:${consultantId}`,
    INVOICE_SETUP: (projectCode) => `setup:${projectCode}`,
};

// TTL constants
export const CACHE_TTL = {
    TEAM: 5 * 60 * 1000,        // 5 minutes (rarely changes)
    INVOICES: 2 * 60 * 1000,    // 2 minutes (changes more often)
    INVOICE_SETUP: 5 * 60 * 1000 // 5 minutes (project data)
};
