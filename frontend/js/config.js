// ============================================
// CONFIG.JS - Configuration centralisée
// ============================================

/**
 * Configuration centrale pour l'application WaQtek
 * À modifier selon votre environnement
 */

const IS_BROWSER_HTTP = typeof window !== 'undefined'
    && window.location
    && (window.location.protocol === 'http:' || window.location.protocol === 'https:');
const DEFAULT_ORIGIN = IS_BROWSER_HTTP
    ? window.location.origin
    : 'http://localhost:5000';
const DEFAULT_WS_ORIGIN = IS_BROWSER_HTTP
    ? window.location.origin.replace(/^http/i, 'ws')
    : 'ws://localhost:5000';
const ENV_API_BASE = (typeof window !== 'undefined' && window.ENV && window.ENV.API_BASE_URL)
    ? window.ENV.API_BASE_URL
    : null;
const ENV_WS_URL = (typeof window !== 'undefined' && window.ENV && window.ENV.WS_URL)
    ? window.ENV.WS_URL
    : null;
const FALLBACK_API_BASE = `${DEFAULT_ORIGIN}/api`;
const FALLBACK_WS_URL = DEFAULT_WS_ORIGIN;
const CONFIG = {
    // API Configuration
    API: {
        BASE_URL: ENV_API_BASE || FALLBACK_API_BASE,  // À changer en production
        TIMEOUT: 10000,
        ENDPOINTS: {
            // Auth
            LOGIN: '/auth/login',
            LOGOUT: '/auth/logout',
            REGISTER: '/auth/register',
            
            // Queues
            QUEUES_LIST: '/queues',
            QUEUE_DETAIL: '/queues/:id',
            QUEUE_CREATE: '/queues',
            QUEUE_UPDATE: '/queues/:id',
            QUEUE_DELETE: '/queues/:id',
            QUEUE_WAITING: '/queues/:id/waiting',
            
            // Tickets
            TICKETS_LIST: '/tickets',
            TICKET_CREATE: '/tickets/public/create',
            TICKET_DETAIL: '/tickets/:id',
            TICKET_UPDATE_STATUS: '/tickets/:id/status',
            TICKET_CALL: '/tickets/:id/call',
            
            // Establishments
            ESTABLISHMENTS_LIST: '/establishments',
            ESTABLISHMENT_CREATE: '/establishments',
            ESTABLISHMENT_UPDATE: '/establishments/:id',
            ESTABLISHMENT_DELETE: '/establishments/:id',
            
            // Statistics
            STATS: '/stats',
            STATS_QUEUES: '/stats/queues',
            STATS_ESTABLISHMENTS: '/stats/establishments',
            
            // Users
            USERS_LIST: '/users',
            USER_PROFILE: '/users/profile',
            USER_UPDATE: '/users/profile',
        }
    },

    // WebSocket Configuration
    WEBSOCKET: {
        URL: ENV_WS_URL || FALLBACK_WS_URL,  // À changer en production
        RECONNECT_INTERVAL: 3000,
        MAX_RECONNECT_ATTEMPTS: 5,
    },

    // Storage Keys
    STORAGE: {
        TOKEN_KEY: 'waqtek_token',
        USER_KEY: 'waqtek_user',
        CLIENT_ID_KEY: 'waqtek_clientId',
    },

    // Supabase Configuration (optional)
    SUPABASE: {
        URL: '',  // À définir depuis l'ENV
        KEY: ''   // À définir depuis l'ENV
    },

    // UI Configuration
    UI: {
        TOAST_DURATION: 3000,
        ANIMATION_DURATION: 300,
        POLL_INTERVAL: 5000,
    },

    // Messages
    MESSAGES: {
        SUCCESS: {
            LOGIN: 'Connexion réussie!',
            TICKET_CREATED: 'Ticket créé avec succès!',
            QUEUE_CREATED: 'File créée avec succès!',
            QUEUE_UPDATED: 'File mise à jour avec succès!',
            QUEUE_DELETED: 'File supprimée avec succès!',
            ESTABLISHMENT_CREATED: 'Établissement créé avec succès!',
            ESTABLISHMENT_UPDATED: 'Établissement mis à jour avec succès!',
            ESTABLISHMENT_DELETED: 'Établissement supprimé avec succès!',
        },
        ERROR: {
            NETWORK: 'Erreur réseau. Vérifiez votre connexion.',
            UNAUTHORIZED: 'Non autorisé. Veuillez vous reconnecter.',
            NOT_FOUND: 'Ressource non trouvée.',
            SERVER_ERROR: 'Erreur serveur. Veuillez réessayer plus tard.',
            INVALID_DATA: 'Données invalides.',
            CAMERA_PERMISSION: 'Permission caméra refusée.',
            SCANNER_ERROR: 'Erreur du scanner QR. Veuillez réessayer.',
        }
    },

    // API Methods
    METHODS: {
        GET: 'GET',
        POST: 'POST',
        PUT: 'PUT',
        DELETE: 'DELETE',
        PATCH: 'PATCH',
    },

    // HTTP Status Codes
    HTTP_STATUS: {
        OK: 200,
        CREATED: 201,
        BAD_REQUEST: 400,
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        CONFLICT: 409,
        INTERNAL_SERVER_ERROR: 500,
    }
};

/**
 * Obtenir l'URL complète d'un endpoint
 */
function getEndpointUrl(endpointKey, params = {}) {
    let endpoint = CONFIG.API.ENDPOINTS[endpointKey];
    if (!endpoint) {
        console.error(`Endpoint non trouvé: ${endpointKey}`);
        return null;
    }

    // Remplacer les paramètres dynamiques
    Object.keys(params).forEach(key => {
        endpoint = endpoint.replace(`:${key}`, params[key]);
    });

    return CONFIG.API.BASE_URL + endpoint;
}

/**
 * Vérifier si l'utilisateur est authentifié
 */
function isAuthenticated() {
    return !!localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
}

/**
 * Obtenir le token d'authentification
 */
function getAuthToken() {
    return localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
}

/**
 * Obtenir les headers HTTP standards avec authentification
 */
function getHeaders(contentType = 'application/json') {
    const headers = {
        'Content-Type': contentType,
    };

    const token = getAuthToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
}

/**
 * Stocker l'utilisateur
 */
function setCurrentUser(user) {
    localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(user));
}

/**
 * Obtenir l'utilisateur courant
 */
function getCurrentUser() {
    const userStr = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
    return userStr ? JSON.parse(userStr) : null;
}

/**
 * Stocker le token
 */
function setAuthToken(token) {
    localStorage.setItem(CONFIG.STORAGE_KEYS.TOKEN, token);
}

/**
 * Effacer l'authentification
 */
function clearAuth() {
    localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
}

