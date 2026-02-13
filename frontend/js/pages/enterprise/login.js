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
    return params.get('redirect') || 'operations-dashboard.html';
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

        if (state.getToken() || (result && result.token)) {
            // Store "remember me" preference
            if (rememberMe) {
                localStorage.setItem('waqtek_remember_email', email);
            }

            // Show success message
            showSuccessAlert('Connexion réussie. Redirection en cours...');

            // Redirect after 1 second (supports ?redirect=...)
            setTimeout(() => {
                window.location.href = getRedirectTarget();
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
document.addEventListener('DOMContentLoaded', function() {
    console.log('[LOGIN] Page loaded');

    // If already logged in, redirect immediately
    if (state.getToken()) {
        window.location.href = getRedirectTarget();
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
