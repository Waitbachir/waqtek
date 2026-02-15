/**
 * 🔐 ENTERPRISE LOGIN PAGE
 * 
 * Handles:
 * - User authentication via AuthService
 * - Form validation
 * - Error/Success messages
 * - Redirect on success
 */

function getRedirectTarget() {
    const params = new URLSearchParams(window.location.search);
    return params.get('redirect');
}

function normalizeRole(role) {
    const raw = String(role || '').trim().toUpperCase();
    if (!raw) return 'PUBLIC';
    if (raw === 'ENTERPRISE') return 'MANAGER';
    return raw;
}

function getDefaultHomeForRole(role) {
    const normalized = normalizeRole(role);
    if (normalized === 'ADMIN') return 'admin-dashboard.html';
    if (normalized === 'MANAGER') return 'manager-dashboard.html';
    if (normalized === 'WAQTEK_TEAM') return 'queue-overview.html';
    return 'operations-dashboard.html';
}

function getAllowedRolesForPage(pageName) {
    const rules = {
        'admin-dashboard.html': ['ADMIN'],
        'manager-dashboard.html': ['MANAGER'],
        'operations-dashboard.html': ['ADMIN', 'MANAGER', 'WAQTEK_TEAM'],
        'analytics-dashboard.html': ['ADMIN', 'WAQTEK_TEAM'],
        'establishments-management.html': ['ADMIN', 'WAQTEK_TEAM'],
        'queue-overview.html': ['ADMIN', 'MANAGER', 'WAQTEK_TEAM'],
        'subscription-management.html': ['ADMIN', 'WAQTEK_TEAM'],
        'ticket-management.html': ['ADMIN', 'MANAGER'],
        'pos-ticket.html': ['ADMIN', 'MANAGER'],
        'take-ticket.html': ['ADMIN', 'MANAGER'],
        'queue-display.html': ['ADMIN', 'MANAGER'],
        'queue-display-setup.html': ['ADMIN', 'MANAGER'],
        'queue-display-control.html': ['ADMIN', 'MANAGER']
    };
    return rules[pageName] || [];
}

function extractPageNameFromRedirect(redirectTarget) {
    if (!redirectTarget) return null;
    try {
        const resolved = new URL(redirectTarget, window.location.origin);
        if (resolved.origin !== window.location.origin) return null;
        return resolved.pathname.split('/').pop() || null;
    } catch (_) {
        return null;
    }
}

function resolveRedirectTargetForRole(role) {
    const redirectTarget = getRedirectTarget();
    const pageName = extractPageNameFromRedirect(redirectTarget);
    const normalizedRole = normalizeRole(role);

    if (!redirectTarget || !pageName) {
        return getDefaultHomeForRole(normalizedRole);
    }

    const allowedRoles = getAllowedRolesForPage(pageName);
    if (!allowedRoles.length || allowedRoles.includes(normalizedRole)) {
        return redirectTarget;
    }

    return getDefaultHomeForRole(normalizedRole);
}

// ===== FORM HANDLING =====
async function handleLoginSubmit(event) {
    event.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('loginBtn');
    const rememberMe = document.getElementById('rememberMe').checked;

    // Validation
    if (!email || !password) {
        showErrorAlert('Veuillez remplir tous les champs');
        return;
    }

    if (password.length < 6) {
        showErrorAlert('Le mot de passe doit contenir au moins 6 caractères');
        return;
    }

    // Disable button during login
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span class="loading-spinner"></span>Connexion...';

    try {
        // Call AuthService
        const result = await AuthService.login(email, password);
        const profile = await AuthService.getMe();
        const role = profile?.user?.normalizedRole || profile?.user?.role || result?.user?.normalizedRole || result?.user?.role;
        const redirectTarget = resolveRedirectTargetForRole(role);

        if (state.getToken() || (result && result.token)) {
            // Store "remember me" preference
            if (rememberMe) {
                localStorage.setItem('waqtek_remember_email', email);
            }

            // Show success message
            showSuccessAlert('Connexion réussie. Redirection en cours...');

            // Redirect after 1 second (supports ?redirect=...)
            setTimeout(() => {
                window.location.href = redirectTarget;
            }, 1000);
        } else {
            showErrorAlert(result.message || 'Erreur lors de la connexion');
            loginBtn.disabled = false;
            loginBtn.innerHTML = 'Connexion';
        }
    } catch (error) {
        console.error('[LOGIN] Error:', error);
        showErrorAlert(error.message || 'Une erreur est survenue. Veuillez réessayer.');
        loginBtn.disabled = false;
        loginBtn.innerHTML = 'Connexion';
    }
}

// ===== ALERT MESSAGES =====
function showErrorAlert(message) {
    const errorAlert = document.getElementById('errorAlert');
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = message;
    errorAlert.classList.add('show');
    
    // Hide after 5 seconds
    setTimeout(() => {
        errorAlert.classList.remove('show');
    }, 5000);
}

function showSuccessAlert(message) {
    const successAlert = document.getElementById('successAlert');
    const successMessage = document.getElementById('successMessage');
    successMessage.textContent = message;
    successAlert.classList.add('show');
}

// ===== PAGE INITIALIZATION =====
document.addEventListener('DOMContentLoaded', async function() {
    console.log('[LOGIN] Page loaded');

    // If already logged in, redirect immediately
    if (state.getToken()) {
        try {
            const profile = await AuthService.getMe();
            const role = profile?.user?.normalizedRole || profile?.user?.role;
            window.location.href = resolveRedirectTargetForRole(role);
        } catch (_) {
            window.location.href = getDefaultHomeForRole('MANAGER');
        }
        return;
    }

    // Load "remember me" email if saved
    const savedEmail = localStorage.getItem('waqtek_remember_email');
    if (savedEmail) {
        document.getElementById('email').value = savedEmail;
        document.getElementById('rememberMe').checked = true;
    }

    // Focus on email input
    document.getElementById('email').focus();

    // Setup enter key submission
    document.getElementById('loginForm').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleLoginSubmit(e);
        }
    });

    console.log('[LOGIN] Initialized');
});

// ===== SIGNUP LINK HANDLER =====
document.addEventListener('click', function(e) {
    if (e.target.href && e.target.href.includes('#signup')) {
        e.preventDefault();
        console.log('[LOGIN] Signup clicked - TODO: Implement signup');
        showErrorAlert('Fonctionnalité d\'inscription en cours de développement');
    }
});

// ===== PASSWORD RECOVERY HANDLER =====
document.addEventListener('click', function(e) {
    if (e.target.href && e.target.href.includes('#forgot')) {
        e.preventDefault();
        console.log('[LOGIN] Password recovery clicked - TODO: Implement recovery');
        showErrorAlert('Récupération de mot de passe en cours de développement');
    }
});
