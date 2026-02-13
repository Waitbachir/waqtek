/**
 * 📊 ENTERPRISE DASHBOARD PAGE
 * 
 * Handles:
 * - Loading dashboard statistics (StatsService)
 * - Displaying establishments count/data
 * - User logout
 * - Navigation sidebar
 * - Sidebar active state
 */

// ===== PAGE STATE =====
const pageState = {
    isLoading: true,
    establishments: [],
    queues: [],
    stats: null
};
let dashboardInitialized = false;

// ===== LOAD DASHBOARD =====
async function loadDashboard() {
    try {
        console.log('[DASHBOARD] Loading...');
        pageState.isLoading = true;

        // Protect page - redirect if not authenticated
        if (!state.getToken()) {
            window.location.href = 'sign-in.html';
            return;
        }

        // Load all stats in parallel
        const [stats, establishments] = await Promise.all([
            StatsService.loadDashboard(),
            EstablishmentService.getEstablishments()
        ]);

        pageState.establishments = (window.EstablishmentService && typeof EstablishmentService.filterByCurrentUser === 'function')
            ? EstablishmentService.filterByCurrentUser(establishments || [])
            : (establishments || []);
        pageState.stats = stats || {};

        // Update UI
        updateDashboardUI();

        // Setup navigation
        setupNavigation();

        // Setup real-time subscriptions
        setupRealtimeUpdates();

        console.log('[DASHBOARD] Loaded successfully');
        pageState.isLoading = false;
    } catch (error) {
        console.error('[DASHBOARD] Error:', error);
        showToast('Erreur lors du chargement du tableau de bord', 'error');
        pageState.isLoading = false;
    }
}

// ===== UPDATE UI =====
function updateDashboardUI() {
    // Update stats cards
    document.getElementById('estCount').textContent = pageState.establishments.length || '0';
    document.getElementById('queueCount').textContent = pageState.stats.queueCount || '0';
    document.getElementById('ticketCount').textContent = pageState.stats.ticketsToday || '0';
    document.getElementById('plan').textContent = pageState.stats.plan || 'Standard';

    // Update establishments table
    updateEstablishmentsTable();
}

// ===== UPDATE TABLE =====
function updateEstablishmentsTable() {
    const tbody = document.getElementById('estTable');
    
    if (!pageState.establishments || pageState.establishments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3">Aucun établissement</td></tr>';
        return;
    }

    tbody.innerHTML = pageState.establishments
        .slice(0, 5) // Show only first 5
        .map(est => `
            <tr>
                <td><strong>${escapeHtml(est.name || 'N/A')}</strong></td>
                <td>${escapeHtml(est.address || 'N/A')}</td>
                <td>${est.created_at ? new Date(est.created_at).toLocaleDateString('fr-FR') : 'N/A'}</td>
            </tr>
        `)
        .join('');
}

// ===== SETUP NAVIGATION =====
function setupNavigation() {
    const currentPage = window.location.pathname.split('/').pop();
    document.querySelectorAll('.sidebar a').forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage || (currentPage === '' && href === 'operations-dashboard.html')) {
            link.style.background = '#1e293b';
            link.style.color = '#fff';
        } else {
            link.style.background = 'transparent';
            link.style.color = '#cbd5e1';
        }
    });
}

// ===== REAL-TIME UPDATES =====
function setupRealtimeUpdates() {
    try {
        // Subscribe to queue updates
        RealtimeService.subscribeToQueue(null, (message) => {
            console.log('[DASHBOARD] Queue update:', message);
            // Reload dashboard stats on changes
            loadDashboard();
        });

        console.log('[DASHBOARD] Real-time subscriptions set up');
    } catch (error) {
        console.error('[DASHBOARD] Real-time error:', error);
        // Continue without real-time
    }
}

// ===== LOGOUT HANDLER =====
async function handleLogout() {
    if (confirm('Êtes-vous sûr de vouloir vous déconnecter?')) {
        try {
            console.log('[DASHBOARD] Logging out...');
            await AuthService.logout();
            window.location.href = 'sign-in.html';
        } catch (error) {
            console.error('[DASHBOARD] Logout error:', error);
            showToast('Erreur lors de la déconnexion', 'error');
        }
    }
}

// ===== HELPER: Escape HTML =====
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== PAGE INITIALIZATION =====
function initDashboardPage() {
    if (dashboardInitialized) return;
    dashboardInitialized = true;

    console.log('[DASHBOARD] Page loaded');
    
    // Redirect to login if not authenticated
    AuthService.requireAuth('sign-in.html');
    
    // Load dashboard
    loadDashboard();

    // Setup logout button
    const logoutBtn = document.querySelector('.logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Refresh data every 30 seconds
    setInterval(() => {
        if (document.hidden === false) { // Only if tab is active
            loadDashboard();
        }
    }, 30000);

    console.log('[DASHBOARD] Initialized');
}

window.initDashboardPage = initDashboardPage;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboardPage);
} else {
    initDashboardPage();
}

// ===== LISTEN FOR STATE CHANGES =====
state.onChange('token', (newToken, oldToken) => {
    if (!newToken && oldToken) {
        console.log('[DASHBOARD] Token cleared, redirecting to login');
        window.location.href = 'sign-in.html';
    }
});
