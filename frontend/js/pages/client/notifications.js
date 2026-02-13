/**
 * 🔔 CLIENT NOTIFICATIONS PAGE
 * 
 * Handles:
 * - Display user notifications
 * - Mark notifications as read
 * - Delete notifications
 * - Real-time notification updates
 * - Notification preferences
 */

const pageState = {
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    filter: 'all' // 'all', 'unread', 'read'
};

// ===== LOAD NOTIFICATIONS =====
async function loadNotifications() {
    try {
        console.log('[NOTIFICATIONS] Loading...');
        pageState.isLoading = true;

        // Protect page
        AuthService.requireAuth('sign-in.html');

        // Load notifications from API
        const result = await api.getNotifications();
        if (result && Array.isArray(result)) {
            pageState.notifications = result.sort((a, b) => 
                new Date(b.created_at) - new Date(a.created_at)
            );
        } else {
            pageState.notifications = [];
        }

        // Count unread
        pageState.unreadCount = pageState.notifications.filter(n => !n.read).length;

        // Update UI
        updateNotificationsUI();

        console.log('[NOTIFICATIONS] Loaded', pageState.notifications.length);
    } catch (error) {
        console.error('[NOTIFICATIONS] Load error:', error);
        // Show empty state if error
        pageState.notifications = [];
        updateNotificationsUI();
    } finally {
        pageState.isLoading = false;
    }
}

// ===== MARK AS READ =====
async function handleMarkAsRead(notificationId) {
    try {
        console.log('[NOTIFICATIONS] Marking as read:', notificationId);

        const result = await api.markNotificationAsRead(notificationId);

        if (result) {
            // Update local state
            const notif = pageState.notifications.find(n => n.id === notificationId);
            if (notif) {
                notif.read = true;
                pageState.unreadCount = Math.max(0, pageState.unreadCount - 1);
            }

            updateNotificationsUI();
        }
    } catch (error) {
        console.error('[NOTIFICATIONS] Mark as read error:', error);
        showToast('Erreur lors de la mise à jour', 'error');
    }
}

// ===== DELETE NOTIFICATION =====
async function handleDeleteNotification(notificationId) {
    try {
        console.log('[NOTIFICATIONS] Deleting:', notificationId);

        const result = await api.deleteNotification(notificationId);

        if (result) {
            pageState.notifications = pageState.notifications.filter(n => n.id !== notificationId);
            updateNotificationsUI();
            showToast('Notification supprimée', 'success');
        }
    } catch (error) {
        console.error('[NOTIFICATIONS] Delete error:', error);
        showToast('Erreur lors de la suppression', 'error');
    }
}

// ===== MARK ALL AS READ =====
async function handleMarkAllAsRead() {
    try {
        console.log('[NOTIFICATIONS] Marking all as read...');

        // Mark all in API
        for (const notif of pageState.notifications.filter(n => !n.read)) {
            await api.markNotificationAsRead(notif.id);
        }

        // Update local state
        pageState.notifications.forEach(n => n.read = true);
        pageState.unreadCount = 0;

        updateNotificationsUI();
        showToast('Tous les messages marqués comme lus', 'success');
    } catch (error) {
        console.error('[NOTIFICATIONS] Mark all error:', error);
        showToast('Erreur lors de la mise à jour', 'error');
    }
}

// ===== CLEAR ALL =====
async function handleClearAll() {
    if (!confirm('Êtes-vous sûr de vouloir supprimer tous les messages?')) {
        return;
    }

    try {
        console.log('[NOTIFICATIONS] Clearing all...');

        // Delete all in API
        for (const notif of pageState.notifications) {
            await api.deleteNotification(notif.id);
        }

        pageState.notifications = [];
        pageState.unreadCount = 0;

        updateNotificationsUI();
        showToast('Tous les messages supprimés', 'success');
    } catch (error) {
        console.error('[NOTIFICATIONS] Clear all error:', error);
        showToast('Erreur lors de la suppression', 'error');
    }
}

// ===== SET FILTER =====
function setFilter(filter) {
    pageState.filter = filter;
    updateNotificationsUI();

    // Update button states
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.style.opacity = btn.dataset.filter === filter ? '1' : '0.5';
    });
}

// ===== UPDATE UI =====
function updateNotificationsUI() {
    const container = document.getElementById('notificationsContainer');
    if (!container) return;

    // Filter notifications
    let filtered = pageState.notifications;
    if (pageState.filter === 'unread') {
        filtered = filtered.filter(n => !n.read);
    } else if (pageState.filter === 'read') {
        filtered = filtered.filter(n => n.read);
    }

    // Update unread count
    const unreadBadge = document.getElementById('unreadCount');
    if (unreadBadge) {
        if (pageState.unreadCount > 0) {
            unreadBadge.textContent = pageState.unreadCount;
            unreadBadge.style.display = 'inline-block';
        } else {
            unreadBadge.style.display = 'none';
        }
    }

    // Build notifications list
    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 20px;">
                <p style="font-size: 18px; color: #999;">Aucune notification</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(notif => `
        <div style="
            padding: 16px;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            margin-bottom: 12px;
            background: ${notif.read ? '#f9f9f9' : '#f0f7ff'};
            opacity: ${notif.read ? '0.8' : '1'};
        ">
            <div style="display: flex; justify-content: space-between; align-items: start; gap: 12px;">
                <div style="flex: 1;">
                    <h4 style="margin: 0 0 8px 0; color: ${notif.read ? '#666' : '#333'};">
                        ${escapeHtml(notif.title || 'Notification')}
                    </h4>
                    <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">
                        ${escapeHtml(notif.message || '')}
                    </p>
                    <small style="color: #999;">
                        ${formatNotificationTime(notif.created_at)}
                    </small>
                </div>
                <div style="display: flex; gap: 8px;">
                    ${!notif.read ? `
                        <button 
                            class="notif-btn" 
                            title="Marquer comme lu"
                            onclick="handleMarkAsRead('${notif.id}')"
                            style="background: #2196f3; color: white;"
                        >
                            ✓
                        </button>
                    ` : ''}
                    <button 
                        class="notif-btn" 
                        title="Supprimer"
                        onclick="handleDeleteNotification('${notif.id}')"
                        style="background: #f44336; color: white;"
                    >
                        ✕
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// ===== HELPER: Format Time =====
function formatNotificationTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins}m`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;

    return date.toLocaleDateString('fr-FR');
}

// ===== HELPER: Escape HTML =====
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== PAGE INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('[NOTIFICATIONS] Page loaded');

    // Protect page
    AuthService.requireAuth('sign-in.html');

    // Load notifications
    loadNotifications();

    // Setup filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            setFilter(this.dataset.filter);
        });
    });

    // Setup action buttons
    const markAllBtn = document.getElementById('markAllBtn');
    if (markAllBtn) {
        markAllBtn.addEventListener('click', handleMarkAllAsRead);
    }

    const clearAllBtn = document.getElementById('clearAllBtn');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', handleClearAll);
    }

    // Refresh every 30 seconds
    setInterval(() => {
        if (document.hidden === false) {
            loadNotifications();
        }
    }, 30000);

    console.log('[NOTIFICATIONS] Initialized');
});

// ===== ADD STYLES =====
const style = document.createElement('style');
style.textContent = `
    .notif-btn {
        padding: 8px 12px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
        transition: all 0.2s;
    }
    .notif-btn:hover {
        transform: scale(1.1);
    }
    .filter-btn {
        padding: 8px 16px;
        margin-right: 8px;
        border: 1px solid #ddd;
        background: white;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
    }
    .filter-btn:hover {
        background: #f0f0f0;
    }
`;
document.head.appendChild(style);
