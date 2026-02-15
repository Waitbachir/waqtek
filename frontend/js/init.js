/**
 * init.js - Global bootstrap and route guard.
 */

console.log('[WAQTEK] FRONTEND INITIALIZATION');

const ROUTE_GUARD_PUBLIC_PAGES = new Set([
    'sign-in.html',
    'sign-in-modern.html',
    'sign-up.html',
    'payment-pending.html',
    'remote-tracking.html'
]);

const ROUTE_GUARD_PROTECTED_PAGES = {
    'operations-dashboard.html': ['ADMIN', 'MANAGER', 'WAQTEK_TEAM'],
    'analytics-dashboard.html': ['ADMIN', 'WAQTEK_TEAM'],
    'establishments-management.html': ['ADMIN', 'WAQTEK_TEAM'],
    'queue-overview.html': ['ADMIN', 'WAQTEK_TEAM', 'MANAGER'],
    'subscription-management.html': ['ADMIN', 'WAQTEK_TEAM'],
    'ticket-management.html': ['ADMIN', 'MANAGER'],
    'pos-ticket.html': ['ADMIN', 'MANAGER'],
    'take-ticket.html': ['ADMIN', 'MANAGER'],
    'queue-display.html': ['ADMIN', 'MANAGER'],
    'queue-display-setup.html': ['ADMIN', 'MANAGER'],
    'queue-display-control.html': ['ADMIN', 'MANAGER']
};

function getCurrentPageName() {
    return window.location.pathname.split('/').pop() || 'index.html';
}

function isEnterprisePagePath() {
    return window.location.pathname.includes('/enterprise/');
}

function getSignInUrl() {
    if (window.location.pathname.includes('/enterprise/')) return 'sign-in.html';
    if (window.location.pathname.includes('/client/')) return '../enterprise/sign-in.html';
    return './enterprise/sign-in.html';
}

function normalizeRole(role) {
    const raw = String(role || '').trim().toUpperCase();
    if (!raw) return 'PUBLIC';
    if (raw === 'ENTERPRISE') return 'MANAGER';
    return raw;
}

function getDefaultHomeForRole(role) {
    const normalized = normalizeRole(role);
    if (normalized === 'WAQTEK_TEAM') return 'queue-overview.html';
    return 'operations-dashboard.html';
}

function buildRedirectParam() {
    return `${window.location.pathname}${window.location.search || ''}`;
}

function clearAuthState() {
    try {
        stateManager.reset();
    } catch (_) {
        localStorage.removeItem(CONFIG.STORAGE.TOKEN_KEY);
        localStorage.removeItem(CONFIG.STORAGE.USER_KEY);
    }
}

function redirectToSignIn() {
    const signInUrl = getSignInUrl();
    const redirect = encodeURIComponent(buildRedirectParam());
    window.location.href = `${signInUrl}?redirect=${redirect}`;
}

function isProtectedPage(pageName) {
    if (ROUTE_GUARD_PROTECTED_PAGES[pageName]) return true;
    if (isEnterprisePagePath() && !ROUTE_GUARD_PUBLIC_PAGES.has(pageName)) return true;
    return false;
}

function getAllowedRolesForPage(pageName) {
    if (ROUTE_GUARD_PROTECTED_PAGES[pageName]) {
        return ROUTE_GUARD_PROTECTED_PAGES[pageName];
    }
    if (isEnterprisePagePath() && !ROUTE_GUARD_PUBLIC_PAGES.has(pageName)) {
        return ['ADMIN', 'MANAGER', 'WAQTEK_TEAM'];
    }
    return [];
}

async function enforceRouteGuard() {
    const pageName = getCurrentPageName();
    if (!isProtectedPage(pageName)) return true;

    if (!stateManager.isAuthenticated()) {
        redirectToSignIn();
        return false;
    }

    try {
        const profile = await apiClient.getAuthMe();
        const role = normalizeRole(profile?.user?.normalizedRole || profile?.user?.role);
        const allowedRoles = getAllowedRolesForPage(pageName);

        if (profile?.user) {
            stateManager.setUser(profile.user);
        }

        if (allowedRoles.length && !allowedRoles.includes(role)) {
            window.location.href = getDefaultHomeForRole(role);
            return false;
        }

        return true;
    } catch (error) {
        if (error?.status === 401 || error?.status === 403) {
            clearAuthState();
            redirectToSignIn();
            return false;
        }

        console.error('[WAQTEK] Route guard error:', error);
        showToast(error.message || 'Permission check failed', 'error');
        return false;
    }
}

async function initializeApp() {
    console.group('[WAQTEK] INIT');

    try {
        console.log('[WAQTEK] Config loaded:', CONFIG.API.BASE_URL);
        console.log('[WAQTEK] StateManager ready');
        console.log('[WAQTEK] ApiClient ready');
        console.log('[WAQTEK] WebSocketClient ready');

        const canAccessPage = await enforceRouteGuard();
        if (!canAccessPage) {
            console.log('[WAQTEK] Route guard blocked navigation');
            console.groupEnd();
            return;
        }

        if (stateManager.isAuthenticated()) {
            console.log('[WAQTEK] Connecting WebSocket...');
            RealtimeService.connectWebSocket();
        }

        console.log('[WAQTEK] Initialization completed');
    } catch (error) {
        console.error('[WAQTEK] Initialization error:', error);
        showToast('Initialization error: ' + error.message, 'error');
    }

    console.groupEnd();
}

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function showToast(message, type = 'info') {
    if (typeof window.showToast === 'function' && window.showToast !== showToast) {
        window.showToast(message, type);
        return;
    }

    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'error' ? '#dc2626' : '#16a34a'};
        color: white;
        border-radius: 4px;
        z-index: 9999;
        font-family: Arial, sans-serif;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

window.addEventListener('error', (event) => {
    console.error('[WAQTEK] Global error:', event.error);
    showToast('An error occurred', 'error');
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('[WAQTEK] Unhandled rejection:', event.reason);
    showToast('Error: ' + event.reason?.message || 'Unknown error', 'error');
});

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('[WAQTEK] Page hidden');
    } else {
        console.log('[WAQTEK] Page visible');
        if (!wsClient.isConnected() && stateManager.isAuthenticated()) {
            wsClient.connect();
        }
    }
});

setInterval(() => {
    const token = stateManager.getToken();
    if (!token) return;

    try {
        const parts = token.split('.');
        if (parts.length !== 3) return;

        const payload = JSON.parse(atob(parts[1]));
        const expiryTime = payload.exp * 1000;
        const now = Date.now();

        if (now > expiryTime) {
            console.log('[WAQTEK] Token expired, logout');
            AuthService.logout();
            window.location.href = getSignInUrl();
        }
    } catch (error) {
        console.warn('[WAQTEK] Token check failed:', error);
    }
}, 60000);

console.log('[WAQTEK] init.js loaded');
