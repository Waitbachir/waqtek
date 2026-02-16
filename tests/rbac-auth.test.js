import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import express from 'express';

process.env.NODE_ENV = 'test';
process.env.USE_FAKE_SUPABASE = 'true';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

const User = (await import('../backend/models/user.model.js')).default;
const Establishment = (await import('../backend/models/establishment.model.js')).default;
const { requireAuth } = await import('../backend/middlewares/auth.middleware.js');
const { requireRole } = await import('../backend/middlewares/role.middleware.js');
const { requirePermission } = await import('../backend/middlewares/permissions.middleware.js');
const { getAuthProfileByUserId } = await import('../backend/services/auth.service.js');
const authRoutes = (await import('../backend/routes/auth.routes.js')).default;
const adminRoutes = (await import('../backend/routes/admin.routes.js')).default;

function createMockRes() {
    return {
        statusCode: 200,
        payload: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(body) {
            this.payload = body;
            return this;
        }
    };
}

test('requireAuth loads role from DB (not from JWT payload claim)', async () => {
    const user = await User.create({
        email: 'rbac-manager@example.com',
        password: 'secret123',
        role: 'manager'
    });

    const forgedToken = jwt.sign(
        { id: user.id, email: user.email, role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '2h' }
    );

    const req = {
        headers: { authorization: `Bearer ${forgedToken}` }
    };
    const res = createMockRes();

    let nextCalled = false;
    await requireAuth(req, res, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(req.user.role, 'manager');
    assert.equal(req.user.normalizedRole, 'MANAGER');
    assert.equal(Array.isArray(req.permissions), true);
    assert.equal(req.permissions.includes('dashboard:manager:read'), true);
    assert.equal(req.permissions.includes('admin:users:read'), false);
});

test('requireRole accepts normalized role aliases', () => {
    const middleware = requireRole('admin');
    const req = {
        user: { role: 'ADMIN', normalizedRole: 'ADMIN' }
    };
    const res = createMockRes();

    let nextCalled = false;
    middleware(req, res, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(res.statusCode, 200);
});

test('requirePermission blocks missing permission', () => {
    const middleware = requirePermission('admin:users:role:update');
    const req = {
        user: { role: 'manager' },
        permissions: ['tickets:read', 'tickets:update']
    };
    const res = createMockRes();

    let nextCalled = false;
    middleware(req, res, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 403);
    assert.equal(res.payload.error, 'FORBIDDEN');
});

test('getAuthProfileByUserId returns normalized role and permissions for /auth/me', async () => {
    const user = await User.create({
        email: 'rbac-waqtek@example.com',
        password: 'secret123',
        role: 'WAQTEK_TEAM'
    });

    const profile = await getAuthProfileByUserId(user.id);
    assert.ok(profile);
    assert.equal(profile.user.email, 'rbac-waqtek@example.com');
    assert.equal(profile.user.normalizedRole, 'WAQTEK_TEAM');
    assert.equal(profile.permissions.includes('waqtek:backoffice:read'), true);
});

test('GET /auth/me returns DB-backed role and permissions', async () => {
    const user = await User.create({
        email: 'rbac-route@example.com',
        password: 'secret123',
        role: 'manager'
    });

    const token = jwt.sign(
        { id: user.id, email: user.email, role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '2h' }
    );

    const app = express();
    app.use(express.json());
    app.use('/auth', authRoutes);

    const server = app.listen(0);
    try {
        const address = server.address();
        const port = typeof address === 'object' && address ? address.port : 0;
        const res = await fetch(`http://127.0.0.1:${port}/auth/me`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        const payload = await res.json();

        assert.equal(res.status, 200);
        assert.equal(payload.user.role, 'manager');
        assert.equal(payload.user.normalizedRole, 'MANAGER');
        assert.equal(payload.permissions.includes('dashboard:manager:read'), true);
        assert.equal(payload.permissions.includes('admin:users:read'), false);
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }
});

test('GET /admin/users denies manager and allows admin', async () => {
    const manager = await User.create({
        email: 'rbac-admin-manager@example.com',
        password: 'secret123',
        role: 'manager'
    });
    const admin = await User.create({
        email: 'rbac-admin-owner@example.com',
        password: 'secret123',
        role: 'admin'
    });

    const managerToken = jwt.sign(
        { id: manager.id, email: manager.email, role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '2h' }
    );
    const adminToken = jwt.sign(
        { id: admin.id, email: admin.email, role: 'manager' },
        process.env.JWT_SECRET,
        { expiresIn: '2h' }
    );

    const app = express();
    app.use(express.json());
    app.use('/admin', adminRoutes);
    const server = app.listen(0);

    try {
        const address = server.address();
        const port = typeof address === 'object' && address ? address.port : 0;

        const deniedRes = await fetch(`http://127.0.0.1:${port}/admin/users`, {
            headers: { Authorization: `Bearer ${managerToken}` }
        });
        assert.equal(deniedRes.status, 403);

        const allowedRes = await fetch(`http://127.0.0.1:${port}/admin/users`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        assert.equal(allowedRes.status, 200);
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }
});

test('POST /auth/register/waqtekteam creates waqtek_team user with hashed password', async () => {
    const app = express();
    app.use(express.json());
    app.use('/auth', authRoutes);
    const server = app.listen(0);

    try {
        const address = server.address();
        const port = typeof address === 'object' && address ? address.port : 0;
        const email = `waqtekteam-${Date.now()}@example.com`;

        const res = await fetch(`http://127.0.0.1:${port}/auth/register/waqtekteam`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                full_name: 'Team User',
                email,
                password: 'secret123'
            })
        });

        const payload = await res.json();
        assert.equal(res.status, 201);
        assert.equal(payload.user.role, 'waqtek_team');
        assert.ok(payload.user.id);

        const stored = await User.findByEmail(email);
        assert.ok(stored);
        assert.equal(stored.role, 'waqtek_team');
        assert.equal(typeof stored.password_hash, 'string');
        assert.equal(stored.password_hash === 'secret123', false);
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }
});

test('POST /auth/register/admin creates admin user', async () => {
    const app = express();
    app.use(express.json());
    app.use('/auth', authRoutes);
    const server = app.listen(0);

    try {
        const address = server.address();
        const port = typeof address === 'object' && address ? address.port : 0;
        const email = `admin-${Date.now()}@example.com`;

        const res = await fetch(`http://127.0.0.1:${port}/auth/register/admin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                full_name: 'Admin User',
                email,
                password: 'secret123'
            })
        });

        const payload = await res.json();
        assert.equal(res.status, 201);
        assert.equal(payload.user.role, 'admin');

        const stored = await User.findByEmail(email);
        assert.ok(stored);
        assert.equal(stored.role, 'admin');
        assert.equal(typeof stored.password_hash, 'string');
        assert.equal(stored.password_hash === 'secret123', false);
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }
});

test('POST /auth/register/manager validates payload server-side', async () => {
    const app = express();
    app.use(express.json());
    app.use('/auth', authRoutes);
    const server = app.listen(0);

    try {
        const address = server.address();
        const port = typeof address === 'object' && address ? address.port : 0;

        const res = await fetch(`http://127.0.0.1:${port}/auth/register/manager`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                full_name: 'M',
                email: 'invalid',
                password: '123',
                establishment_id: ''
            })
        });

        const payload = await res.json();
        assert.equal(res.status, 400);
        assert.equal(payload.error, 'VALIDATION_ERROR');
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }
});

test('POST /auth/register/manager creates user and links establishment manager_id', async () => {
    const app = express();
    app.use(express.json());
    app.use('/auth', authRoutes);
    const server = app.listen(0);

    try {
        const est = await Establishment.create({
            name: `Manager Link Est ${Date.now()}`,
            manager_id: null
        });

        const address = server.address();
        const port = typeof address === 'object' && address ? address.port : 0;
        const email = `manager-link-${Date.now()}@example.com`;

        const res = await fetch(`http://127.0.0.1:${port}/auth/register/manager`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                full_name: 'Manager Linked',
                email,
                password: 'secret123',
                establishment_id: String(est.id)
            })
        });

        const payload = await res.json();
        assert.equal(res.status, 201);
        assert.equal(payload.user.role, 'manager');
        assert.ok(payload.user.id);

        const storedUser = await User.findByEmail(email);
        assert.ok(storedUser);
        assert.equal(storedUser.role, 'manager');

        const linkedEst = await Establishment.findById(est.id);
        assert.ok(linkedEst);
        assert.equal(String(linkedEst.manager_id), String(storedUser.id));
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }
});
