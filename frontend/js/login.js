// ============================================
// LOGIN.JS - Authentification integree
// ============================================

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

function initLoginPage() {
    if (isAuthenticated()) {
        const user = getCurrentUser();
        window.location.href = `/enterprise/${getDefaultHomeForRole(user?.normalizedRole || user?.role)}`;
        return;
    }

    setupLoginFormListeners();
    restoreRememberedEmail();
    console.log('Login page initialized');
}

function setupLoginFormListeners() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    form.addEventListener('submit', handleLoginSubmit);

    const inputs = form.querySelectorAll('input');
    inputs.forEach((input) => {
        input.addEventListener('focus', () => {
            clearError();
        });
    });
}

async function handleLoginSubmit(e) {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const rememberMe = document.getElementById('rememberMe').checked;
    const loginBtn = document.getElementById('loginBtn');

    if (!email || !password) {
        showLoginError('Veuillez remplir tous les champs');
        return;
    }

    if (!isValidEmail(email)) {
        showLoginError('Adresse email invalide');
        return;
    }

    if (password.length < 6) {
        showLoginError('Le mot de passe doit contenir au moins 6 caracteres');
        return;
    }

    loginBtn.disabled = true;
    const originalText = loginBtn.innerHTML;
    loginBtn.innerHTML = '<span class="spinner"></span> Connexion en cours...';

    try {
        const response = await apiClient.login(email, password);
        if (!response.token || !response.user) {
            throw new Error('Reponse API invalide');
        }

        saveAuth(response.token, response.user);

        if (rememberMe) {
            localStorage.setItem('waqtek_remembered_email', email);
        } else {
            localStorage.removeItem('waqtek_remembered_email');
        }

        const role = response?.user?.normalizedRole || response?.user?.role;
        const redirectTarget = getDefaultHomeForRole(role);

        showLoginSuccess('Connexion reussie! Redirection...');

        setTimeout(() => {
            window.location.href = `/enterprise/${redirectTarget}`;
        }, 800);
    } catch (error) {
        console.error('Login error:', error);

        if (error.status === 401) {
            showLoginError('Email ou mot de passe incorrect');
        } else if (error.status === 400) {
            showLoginError(error.message || 'Erreur de validation');
        } else if (error.status === 429) {
            showLoginError('Trop de tentatives. Veuillez reessayer plus tard');
        } else if (error.message === 'Timeout') {
            showLoginError('Delai depasse. Verifiez votre connexion');
        } else {
            showLoginError(error.message || 'Erreur de connexion. Veuillez reessayer');
        }

        loginBtn.disabled = false;
        loginBtn.innerHTML = originalText;
    }
}

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

function clearError() {
    const errorAlert = document.getElementById('errorAlert');
    if (errorAlert) {
        errorAlert.classList.remove('show');
    }
}

function restoreRememberedEmail() {
    const rememberedEmail = localStorage.getItem('waqtek_remembered_email');
    const emailInput = document.getElementById('email');
    const rememberMeCheckbox = document.getElementById('rememberMe');

    if (rememberedEmail && emailInput) {
        emailInput.value = rememberedEmail;
        if (rememberMeCheckbox) {
            rememberMeCheckbox.checked = true;
        }
        document.getElementById('password')?.focus();
    }
}

function saveAuth(token, user) {
    localStorage.setItem('waqtek_token', token);
    localStorage.setItem('waqtek_user', JSON.stringify(user));
    localStorage.setItem('waqtek_auth_time', new Date().toISOString());
}

function isAuthenticated() {
    const token = localStorage.getItem('waqtek_token');
    const user = localStorage.getItem('waqtek_user');
    return token && user;
}

async function logout() {
    try {
        await apiClient.logout().catch(() => {});
    } finally {
        clearAuth();
        window.location.href = 'sign-in-modern.html';
    }
}

document.addEventListener('DOMContentLoaded', initLoginPage);
