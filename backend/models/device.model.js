import supabase from '../services/supabase.service.js';

class Device {
    static async create({ device_id, secret_key, establishment_id, status, active = false, last_seen = null }) {
        const normalizedStatus = String(status || (active ? 'ACTIVE' : 'DISABLED')).toUpperCase();
        return await supabase.insert('devices', {
            device_id,
            secret_key,
            establishment_id,
            status: normalizedStatus,
            active,
            last_seen
        });
    }

    static async findByDeviceId(deviceId) {
        const rows = await supabase.findWhere('devices', { device_id: deviceId });
        return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    }

    static async findBySecretKey(secretKey) {
        const rows = await supabase.findWhere('devices', { secret_key: secretKey });
        return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    }

    static async activate(deviceId) {
        const existing = await this.findByDeviceId(deviceId);
        if (!existing) return null;

        return await supabase.update('devices', existing.id, {
            status: 'ACTIVE',
            active: true,
            activated_at: new Date().toISOString()
        });
    }

    static async touchLastSeen(deviceId) {
        const existing = await this.findByDeviceId(deviceId);
        if (!existing) return null;

        return await supabase.update('devices', existing.id, {
            last_seen: new Date().toISOString()
        });
    }

    static async recordHeartbeat(deviceId, payload = {}) {
        const existing = await this.findByDeviceId(deviceId);
        if (!existing) return null;

        const heartbeatCount = Number(existing.heartbeat_count || 0) + 1;
        return await supabase.update('devices', existing.id, {
            last_heartbeat_at: new Date().toISOString(),
            heartbeat_count: heartbeatCount,
            last_uptime_ms: payload.uptime_ms ?? null,
            last_fw_version: payload.fw_version ?? null,
            last_free_heap: payload.free_heap ?? null,
            last_status: payload.status ?? 'OK',
            last_ip: payload.ip ?? null
        });
    }
}

export default Device;
