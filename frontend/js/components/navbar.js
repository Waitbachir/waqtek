/**
 * NAVBAR.JS
 * Gestion de la barre de navigation et du sidebar
 */

class Navbar {
    constructor() {
        this.currentPage = this.detectCurrentPage();
        this.init();
    }

    detectCurrentPage() {
        const filename = window.location.pathname.split('/').pop();
        return filename || 'operations-dashboard.html';
    }

    init() {
        this.setupNavbar();
        this.setupSidebar();
        this.setupEventListeners();
    }

    setupNavbar() {
        const navbar = document.querySelector('.navbar');
        if (!navbar) return;

        // Activer le lien actif dans la navbar
        const links = navbar.querySelectorAll('.navbar-menu a');
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (href === this.currentPage) {
                link.classList.add('active');
            }
        });
    }

    setupSidebar() {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;

        // Activer le lien actif dans le sidebar
        const links = sidebar.querySelectorAll('a');
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (href === this.currentPage || href === `./${this.currentPage}`) {
                link.classList.add('active');
            }
        });
    }

    setupEventListeners() {
        // Déconnexion
        const logoutBtn = document.querySelector('.navbar-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        // Mobile menu toggle (futur)
        const menuToggle = document.querySelector('.navbar-menu-toggle');
        if (menuToggle) {
            menuToggle.addEventListener('click', () => this.toggleMobileMenu());
        }
    }

    logout() {
        if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
            localStorage.removeItem('waqtek_token');
            window.location.href = 'sign-in.html';
        }
    }

    toggleMobileMenu() {
        const menu = document.querySelector('.navbar-menu');
        if (menu) {
            menu.classList.toggle('active');
        }
    }

    updateUserDisplay(username) {
        const userDisplay = document.querySelector('.navbar-user');
        if (userDisplay && username) {
            const avatar = userDisplay.querySelector('.navbar-avatar');
            if (avatar) {
                avatar.textContent = username.charAt(0).toUpperCase();
            }
        }
    }
}

// Initialiser au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    window.navbar = new Navbar();
});
