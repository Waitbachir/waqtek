let redisLib = null;
try {
    redisLib = await import('redis');
} catch (_) {
    redisLib = null;
}

class CacheService {
    constructor() {
        this.client = null;
        this.enabled = false;
        this.memory = new Map();
        this.memoryTimers = new Map();
    }

    async init() {
        const redisUrl = String(process.env.REDIS_URL || '').trim();
        if (!redisUrl || !redisLib?.createClient || process.env.NODE_ENV === 'test') {
            this.enabled = false;
            return;
        }

        try {
            this.client = redisLib.createClient({ url: redisUrl });
            this.client.on('error', () => {
                this.enabled = false;
            });
            await this.client.connect();
            this.enabled = true;
        } catch (_) {
            this.enabled = false;
            this.client = null;
        }
    }

    async get(key) {
        if (!key) return null;
        if (this.enabled && this.client) {
            return await this.client.get(key);
        }
        return this.memory.get(key) ?? null;
    }

    async set(key, value, ttlSeconds = 300) {
        if (!key) return;
        if (this.enabled && this.client) {
            await this.client.set(key, value, { EX: ttlSeconds });
            return;
        }

        this.memory.set(key, value);
        const oldTimer = this.memoryTimers.get(key);
        if (oldTimer) clearTimeout(oldTimer);
        const timer = setTimeout(() => {
            this.memory.delete(key);
            this.memoryTimers.delete(key);
        }, ttlSeconds * 1000);
        this.memoryTimers.set(key, timer);
    }

    async del(key) {
        if (!key) return;
        if (this.enabled && this.client) {
            await this.client.del(key);
            return;
        }
        this.memory.delete(key);
        const timer = this.memoryTimers.get(key);
        if (timer) clearTimeout(timer);
        this.memoryTimers.delete(key);
    }

    async delByPrefix(prefix) {
        if (!prefix) return;
        if (this.enabled && this.client) {
            const keys = await this.client.keys(`${prefix}*`);
            if (Array.isArray(keys) && keys.length > 0) {
                await this.client.del(keys);
            }
            return;
        }

        for (const key of this.memory.keys()) {
            if (key.startsWith(prefix)) {
                await this.del(key);
            }
        }
    }
}

export default new CacheService();

