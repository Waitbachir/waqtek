// ============================================
// UTILS.JS - Fonctions utilitaires
// ============================================

/**
 * Afficher une notification toast
 */
function showToast(message, type = 'info', duration = CONFIG.UI.TOAST_DURATION) {
    // Créer l'élément toast
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <span class="toast-icon">${getToastIcon(type)}</span>
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;

    // Ajouter les styles si nécessaire
    ensureToastStyles();

    // Ajouter au DOM
    document.body.appendChild(toast);

    // Auto-retrait après durée
    setTimeout(() => {
        toast.classList.add('toast-fade-out');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/**
 * Obtenir l'icône pour un type de toast
 */
function getToastIcon(type) {
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };
    return icons[type] || icons.info;
}

/**
 * Ajouter les styles des toasts
 */
function ensureToastStyles() {
    if (document.getElementById('toast-styles')) return;

    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
        .toast {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            animation: slideInRight 0.3s ease;
            max-width: 400px;
        }

        @keyframes slideInRight {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }

        .toast-fade-out {
            animation: slideOutRight 0.3s ease;
        }

        @keyframes slideOutRight {
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }

        .toast-content {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            background: white;
            font-weight: 500;
        }

        .toast-icon {
            font-size: 20px;
            font-weight: bold;
        }

        .toast-message {
            flex: 1;
        }

        .toast-close {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            opacity: 0.5;
            padding: 0;
            width: 24px;
            height: 24px;
        }

        .toast-close:hover {
            opacity: 1;
        }

        .toast-success .toast-icon {
            color: #16a34a;
        }

        .toast-success {
            border-left: 4px solid #16a34a;
        }

        .toast-error .toast-icon {
            color: #dc2626;
        }

        .toast-error {
            border-left: 4px solid #dc2626;
        }

        .toast-warning .toast-icon {
            color: #ea580c;
        }

        .toast-warning {
            border-left: 4px solid #ea580c;
        }

        .toast-info .toast-icon {
            color: #0ea5e9;
        }

        .toast-info {
            border-left: 4px solid #0ea5e9;
        }
    `;

    document.head.appendChild(style);
}

/**
 * Afficher une modale de confirmation
 */
function showConfirm(message, title = 'Confirmation', onConfirm, onCancel) {
    const modal = document.createElement('div');
    modal.className = 'confirm-modal-backdrop';
    modal.innerHTML = `
        <div class="confirm-modal">
            <div class="confirm-modal-header">
                <h3>${title}</h3>
                <button class="confirm-modal-close" onclick="this.closest('.confirm-modal-backdrop').remove()">×</button>
            </div>
            <div class="confirm-modal-body">
                <p>${message}</p>
            </div>
            <div class="confirm-modal-footer">
                <button class="btn btn-secondary" onclick="onConfirmCancel()">Annuler</button>
                <button class="btn btn-danger" onclick="onConfirmOk()">Confirmer</button>
            </div>
        </div>
    `;

    ensureConfirmStyles();
    document.body.appendChild(modal);

    // Fonctions globales temporaires
    window.onConfirmOk = () => {
        modal.remove();
        if (onConfirm) onConfirm();
    };

    window.onConfirmCancel = () => {
        modal.remove();
        if (onCancel) onCancel();
    };
}

/**
 * Ajouter les styles des modales de confirmation
 */
function ensureConfirmStyles() {
    if (document.getElementById('confirm-styles')) return;

    const style = document.createElement('style');
    style.id = 'confirm-styles';
    style.textContent = `
        .confirm-modal-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.3s ease;
        }

        .confirm-modal {
            background: white;
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
            max-width: 400px;
            width: 90%;
            animation: slideIn 0.3s ease;
        }

        .confirm-modal-header {
            padding: 20px;
            border-bottom: 1px solid #e5e7eb;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .confirm-modal-header h3 {
            margin: 0;
            font-size: 18px;
        }

        .confirm-modal-close {
            background: none;
            border: none;
            font-size: 28px;
            cursor: pointer;
            opacity: 0.5;
        }

        .confirm-modal-close:hover {
            opacity: 1;
        }

        .confirm-modal-body {
            padding: 20px;
        }

        .confirm-modal-body p {
            margin: 0;
            color: #374151;
        }

        .confirm-modal-footer {
            padding: 20px;
            border-top: 1px solid #e5e7eb;
            display: flex;
            gap: 10px;
            justify-content: flex-end;
        }

        .confirm-modal-footer button {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.2s;
        }

        .confirm-modal-footer .btn-secondary {
            background: #e5e7eb;
            color: #374151;
        }

        .confirm-modal-footer .btn-secondary:hover {
            background: #d1d5db;
        }

        .confirm-modal-footer .btn-danger {
            background: #dc2626;
            color: white;
        }

        .confirm-modal-footer .btn-danger:hover {
            background: #b91c1c;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes slideIn {
            from {
                transform: translateY(-50px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }
    `;

    document.head.appendChild(style);
}

/**
 * Formater une date
 */
function formatDate(date, format = 'short') {
    if (!date) return '--';
    
    const d = new Date(date);
    
    if (format === 'short') {
        return d.toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    } else if (format === 'long') {
        return d.toLocaleDateString('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } else if (format === 'time') {
        return d.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    } else if (format === 'datetime') {
        return d.toLocaleString('fr-FR');
    }
}

/**
 * Formater un nombre
 */
function formatNumber(num) {
    if (!num) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * Vérifier si un email est valide
 */
function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * Vérifier si un téléphone est valide
 */
function isValidPhone(phone) {
    const regex = /^[0-9+\s\-()]{7,}$/;
    return regex.test(phone);
}

/**
 * Créer une UUID
 */
function generateUUID() {
    return crypto.randomUUID();
}

/**
 * Copier du texte dans le presse-papiers
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Copié!', 'success', 1500);
    } catch (error) {
        showToast('Erreur lors de la copie', 'error');
    }
}

/**
 * Convertir un UUID lisible
 */
function formatUUID(uuid) {
    if (!uuid) return '--';
    return uuid.substring(0, 8).toUpperCase();
}

/**
 * Vérifier la connexion internet
 */
function isOnline() {
    return navigator.onLine;
}

/**
 * Attendre (async/await friendly)
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retrier un objet
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Limiter la fréquence d'exécution
 */
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Obtenir les paramètres URL
 */
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const result = {};
    for (let [key, value] of params.entries()) {
        result[key] = value;
    }
    return result;
}

/**
 * Ajouter un paramètre à l'URL
 */
function setUrlParam(key, value) {
    const params = new URLSearchParams(window.location.search);
    params.set(key, value);
    window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
}

/**
 * Supprimer un paramètre de l'URL
 */
function removeUrlParam(key) {
    const params = new URLSearchParams(window.location.search);
    params.delete(key);
    window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
}
