/**
 * signup.js
 * Handle user registration form
 */

// Get DOM elements
const signupForm = document.getElementById('signupForm');
const signupBtn = document.getElementById('signupBtn');
const errorAlert = document.getElementById('errorAlert');
const successAlert = document.getElementById('successAlert');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const strengthDiv = document.getElementById('strengthDiv');
const strengthText = document.getElementById('strengthText');
const strengthBar = document.getElementById('strengthBar');

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

// Check if user already logged in
if (window.state && window.state.getToken()) {
    const currentUser = window.state.getUser && window.state.getUser();
    const currentRole = currentUser?.normalizedRole || currentUser?.role;
    window.location.href = getDefaultHomeForRole(currentRole);
}

/**
 * Check password strength
 */
function checkPasswordStrength(password) {
    if (password.length < 6) {
        return { strength: 'weak', label: 'Faible' };
    }
    
    let strength = 0;
    if (/[a-z]/.test(password)) strength++; // lowercase
    if (/[A-Z]/.test(password)) strength++; // uppercase
    if (/[0-9]/.test(password)) strength++; // numbers
    if (/[^a-zA-Z0-9]/.test(password)) strength++; // special chars

    if (strength < 2) return { strength: 'weak', label: 'Faible' };
    if (strength < 3) return { strength: 'fair', label: 'Moyen' };
    return { strength: 'strong', label: 'Fort' };
}

/**
 * Update password strength indicator
 */
passwordInput.addEventListener('input', (e) => {
    const password = e.target.value;
    
    if (password.length === 0) {
        strengthDiv.style.display = 'none';
        strengthBar.className = 'strength-indicator';
        return;
    }

    strengthDiv.style.display = 'block';
    const { strength, label } = checkPasswordStrength(password);
    
    strengthBar.className = `strength-indicator ${strength}`;
    strengthText.textContent = `Force: ${label}`;
    strengthText.style.color = strength === 'weak' ? '#ff6b6b' : strength === 'fair' ? '#ffd700' : '#51cf66';
});

/**
 * Validate password match
 */
confirmPasswordInput.addEventListener('input', (e) => {
    if (passwordInput.value !== e.target.value && e.target.value.length > 0) {
        if (!e.target.classList.contains('error')) {
            e.target.style.borderColor = '#ff6b6b';
        }
    } else {
        e.target.style.borderColor = '#e0e0e0';
    }
});

/**
 * Show error message
 */
function showError(message) {
    errorMessage.textContent = message;
    errorAlert.classList.add('show');
    successAlert.classList.remove('show');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Show success message
 */
function showSuccess(message) {
    successMessage.textContent = message || 'Inscription réussie. Redirection en cours...';
    successAlert.classList.add('show');
    errorAlert.classList.remove('show');
}

/**
 * Clear alerts
 */
function clearAlerts() {
    errorAlert.classList.remove('show');
    successAlert.classList.remove('show');
}

/**
 * Validate form
 */
function validateForm(formData) {
    // Check first name
    if (!formData.firstName || formData.firstName.trim().length < 2) {
        showError('Le prénom doit contenir au moins 2 caractères.');
        return false;
    }

    // Check last name
    if (!formData.lastName || formData.lastName.trim().length < 2) {
        showError('Le nom doit contenir au moins 2 caractères.');
        return false;
    }

    // Check email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
        showError('Veuillez entrer une adresse email valide.');
        return false;
    }

    // Check password length
    if (!formData.password || formData.password.length < 6) {
        showError('Le mot de passe doit contenir au moins 6 caractères.');
        return false;
    }

    // Check password match
    if (formData.password !== formData.confirmPassword) {
        showError('Les mots de passe ne correspondent pas.');
        return false;
    }

    // Check terms accepted
    if (!formData.terms) {
        showError('Vous devez accepter les conditions d\'utilisation.');
        return false;
    }

    return true;
}

/**
 * Handle signup form submission
 */
async function handleSignupSubmit(event) {
    event.preventDefault();
    clearAlerts();

    // Get form data
    const formData = {
        firstName: document.getElementById('firstName').value.trim(),
        lastName: document.getElementById('lastName').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim() || null,
        password: document.getElementById('password').value,
        confirmPassword: document.getElementById('confirmPassword').value,
        terms: document.getElementById('terms').checked
    };

    // Validate form
    if (!validateForm(formData)) {
        return;
    }

    // Disable button and show loading
    signupBtn.disabled = true;
    signupBtn.innerHTML = '<span class="loading-spinner"></span>Inscription en cours...';

    try {
        // Prepare user data for backend
        const userData = {
            email: formData.email,
            password: formData.password,
            full_name: `${formData.firstName} ${formData.lastName}`,
            role: 'manager' // Default role for new accounts
        };

        // Call AuthService to register
        if (!window.AuthService) {
            throw new Error('AuthService not available');
        }

        const result = await window.AuthService.register(
            userData.email,
            userData.password,
            userData.role,
            userData.full_name
        );

        if (!result || !result.token) {
            throw new Error('Registration failed: No token received');
        }

        // Store token in state
        if (window.state) {
            window.state.setToken(result.token);
        }

        // Show success message
        showSuccess('✅ Inscription réussie! Bienvenue sur WaQtek.');

        // Redirect to dashboard after 2 seconds
        const profile = await window.AuthService.getMe();
        const role = profile?.user?.normalizedRole || profile?.user?.role || userData.role;
        const redirectTarget = getDefaultHomeForRole(role);
        setTimeout(() => {
            window.location.href = redirectTarget;
        }, 2000);

    } catch (error) {
        console.error('Signup error:', error);
        
        // Parse error message
        let errorMsg = 'Une erreur est survenue. Veuillez réessayer.';
        
        if (error.message === 'User already exists') {
            errorMsg = 'Cet email est déjà utilisé. Veuillez en choisir un autre.';
        } else if (error.message.includes('invalid')) {
            errorMsg = 'Données invalides. Veuillez vérifier votre saisie.';
        } else if (error.message.includes('Network')) {
            errorMsg = 'Erreur de connexion. Veuillez vérifier votre connexion internet.';
        } else if (error.message) {
            errorMsg = error.message;
        }

        showError(errorMsg);

        // Re-enable button
        signupBtn.disabled = false;
        signupBtn.innerHTML = 'Créer mon Compte';
    }
}

/**
 * Real-time email validation (check if email already exists)
 * Optional: Can be implemented to check email availability
 */
const emailInput = document.getElementById('email');
let emailCheckTimeout;

emailInput.addEventListener('blur', async (e) => {
    const email = e.target.value.trim();
    if (!email || !email.includes('@')) return;

    // Optional: Check if email is available
    // This would require an API endpoint to check email availability
    // For now, we just validate format on submit
});

// Log page load
console.log('Signup page loaded successfully');
