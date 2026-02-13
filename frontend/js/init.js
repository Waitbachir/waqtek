/**
 * init.js - Initialisation globale de l'application WaQtek
 * À charger en premier dans toutes les pages HTML
 */

console.log('🚀 WAQTEK FRONTEND - INITIALIZATION');

/**
 * Initialiser l'application
 */
async function initializeApp() {
    console.group('⚙️ INITIALISATION');

    try {
        // 1. Vérifier la config
        console.log('✅ Config chargée:', CONFIG.API.BASE_URL);

        // 2. Initialiser StateManager
        console.log('✅ StateManager créé');

        // 3. Initialiser les clients API
        console.log('✅ ApiClient créé');
        console.log('✅ WebSocketClient créé');

        // 4. Connecter WebSocket si authentifié
        if (stateManager.isAuthenticated()) {
            console.log('🔌 Connexion WebSocket...');
            RealtimeService.connectWebSocket();
        }

        // 5. Vérifier la navigation (redirection si non authentifié)
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const protectedPages = [
            'operations-dashboard.html',
            'establishments-management.html',
            'queue-management.html',
            'manage-tickets.html',
            'analytics-dashboard.html'
        ];

        if (protectedPages.includes(currentPage) && !stateManager.isAuthenticated()) {
            console.warn('⚠️ Accès non autorisé, redirection...');
            window.location.href = 'sign-in.html';
            return;
        }

        console.log('✅ Initialisation complète');

    } catch (error) {
        console.error('❌ Erreur initialisation:', error);
        showToast('Erreur initialisation: ' + error.message, 'error');
    }

    console.groupEnd();
}

/**
 * Attendre que le DOM soit chargé
 */
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

/**
 * Fonction utilitaire: Afficher un toast
 * (si utils.js n'est pas encore chargé)
 */
function showToast(message, type = 'info') {
    // Si la fonction est définie dans utils.js, l'utiliser
    if (typeof window.showToast === 'function') {
        window.showToast(message, type);
        return;
    }

    // Sinon, créer un toast simple
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

/**
 * Gestion des erreurs globales
 */
window.addEventListener('error', (event) => {
    console.error('❌ Erreur globale:', event.error);
    showToast('Une erreur est survenue', 'error');
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Promise rejetée:', event.reason);
    showToast('Erreur: ' + event.reason?.message || 'Erreur inconnue', 'error');
});

/**
 * Gestion de la visibilité du document
 */
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('⚠️ Page cachée');
    } else {
        console.log('✅ Page visible');
        // Reconnecter WebSocket si nécessaire
        if (!wsClient.isConnected() && stateManager.isAuthenticated()) {
            wsClient.connect();
        }
    }
});

/**
 * Déconnexion automatique si le token est expiré
 */
setInterval(() => {
    const token = stateManager.getToken();
    if (token) {
        // Vérifier si le token est expiré (JWT)
        try {
            const parts = token.split('.');
            if (parts.length === 3) {
                const payload = JSON.parse(atob(parts[1]));
                const expiryTime = payload.exp * 1000; // Convertir en ms
                const now = Date.now();

                if (now > expiryTime) {
                    console.log('⚠️ Token expiré, déconnexion');
                    AuthService.logout();
                    window.location.href = 'sign-in.html';
                }
            }
        } catch (error) {
            console.warn('⚠️ Impossible de vérifier token:', error);
        }
    }
}, 60000); // Vérifier toutes les minutes

console.log('✅ Init.js chargé');
