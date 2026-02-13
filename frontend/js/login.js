// ============================================
// LOGIN.JS - Authentification intégrée
// ============================================

/**
 * Initialiser la page de connexion
 */
function initLoginPage() {
    // Vérifier si déjà connecté
    if (isAuthenticated()) {
        window.location.href = 'operations-dashboard.html';
        return;
    }

    // Setup form listeners
    setupLoginFormListeners();
    
    // Restaurer email si "Remember me" était coché
    restoreRememberedEmail();

    console.log('✅ Page de connexion initialisée');
}

/**
 * Setup des listeners du formulaire de connexion
 */
function setupLoginFormListeners() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    form.addEventListener('submit', handleLoginSubmit);

    // Clear error on input
    const inputs = form.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            clearError();
        });
    });
}

/**
 * Gérer la soumission du formulaire de connexion
 */
async function handleLoginSubmit(e) {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const rememberMe = document.getElementById('rememberMe').checked;
    const errorAlert = document.getElementById('errorAlert');
    const loginBtn = document.getElementById('loginBtn');

    // Validation
    if (!email || !password) {
        showLoginError('Veuillez remplir tous les champs');
        return;
    }

    if (!isValidEmail(email)) {
        showLoginError('Adresse email invalide');
        return;
    }

    if (password.length < 6) {
        showLoginError('Le mot de passe doit contenir au moins 6 caractères');
        return;
    }

    // Disable button and show loading
    loginBtn.disabled = true;
    const originalText = loginBtn.innerHTML;
    loginBtn.innerHTML = '<span class="spinner"></span> Connexion en cours...';

    try {
        // Call API
        const response = await apiClient.login(email, password);

        if (!response.token || !response.user) {
            throw new Error('Réponse API invalide');
        }

        // Store authentication data
        saveAuth(response.token, response.user);

        // Remember email if checked
        if (rememberMe) {
            localStorage.setItem('waqtek_remembered_email', email);
        } else {
            localStorage.removeItem('waqtek_remembered_email');
        }

        // Show success message
        showLoginSuccess('Connexion réussie! Redirection...');

        // Redirect to dashboard after short delay
        setTimeout(() => {
            window.location.href = '/enterprise/operations-dashboard.html'
';
        }, 800);

    } catch (error) {
        console.error('❌ Erreur connexion:', error);

        // Handle specific errors
        if (error.status === 401) {
            showLoginError('Email ou mot de passe incorrect');
        } else if (error.status === 400) {
            showLoginError(error.message || 'Erreur de validation');
        } else if (error.status === 429) {
            showLoginError('Trop de tentatives. Veuillez réessayer plus tard');
        } else if (error.message === 'Timeout') {
            showLoginError('Délai d\'attente dépassé. Vérifiez votre connexion');
        } else {
            showLoginError(error.message || 'Erreur de connexion. Veuillez réessayer');
        }

        // Re-enable button
        loginBtn.disabled = false;
        loginBtn.innerHTML = originalText;

    }
}

/**
 * Afficher une erreur de connexion
 */
function showLoginError(message) {
    const errorAlert = document.getElementById('errorAlert');
    const successAlert = document.getElementById('successAlert');

    if (successAlert) successAlert.classList.remove('show');
    if (errorAlert) {
        errorAlert.textContent = message;
        errorAlert.classList.add('show');
    }

    showToast(message, 'error');
}

/**
 * Afficher un message de succès
 */
function showLoginSuccess(message) {
    const successAlert = document.getElementById('successAlert');
    const errorAlert = document.getElementById('errorAlert');

    if (errorAlert) errorAlert.classList.remove('show');
    if (successAlert) {
        successAlert.textContent = message;
        successAlert.classList.add('show');
    }

    showToast(message, 'success');
}

/**
 * Effacer les messages d'erreur
 */
function clearError() {
    const errorAlert = document.getElementById('errorAlert');
    if (errorAlert) {
        errorAlert.classList.remove('show');
    }
}

/**
 * Restaurer l'email mémorisé
 */
function restoreRememberedEmail() {
    const rememberedEmail = localStorage.getItem('waqtek_remembered_email');
    const emailInput = document.getElementById('email');
    const rememberMeCheckbox = document.getElementById('rememberMe');

    if (rememberedEmail && emailInput) {
        emailInput.value = rememberedEmail;
        if (rememberMeCheckbox) {
            rememberMeCheckbox.checked = true;
        }
        // Focus password field
        document.getElementById('password')?.focus();
    }
}

/**
 * Sauvegarder les données d'authentification
 */
function saveAuth(token, user) {
    localStorage.setItem('waqtek_token', token);
    localStorage.setItem('waqtek_user', JSON.stringify(user));
    localStorage.setItem('waqtek_auth_time', new Date().toISOString());
}

/**
 * Vérifier si l'utilisateur est authentifié
 */
function isAuthenticated() {
    const token = localStorage.getItem('waqtek_token');
    const user = localStorage.getItem('waqtek_user');

    return token && user;
}

/**
 * Token & helpers d'authentification centralisés dans `config.js` / `utils.js`.
 * Utilisez `getAuthToken()`, `getCurrentUser()` et `clearAuth()` depuis ces modules.
 */

/**
 * Effectuer une déconnexion
 */
async function logout() {
    try {
        // Attempt to notify backend
        await apiClient.logout().catch(() => {
            // Ignore logout errors, still clear local auth
        });
    } finally {
        // Clear local auth
        clearAuth();
        // Redirect to login
        window.location.href = 'sign-in-modern.html';
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initLoginPage);
