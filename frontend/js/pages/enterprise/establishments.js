/**
 * 🏢 ENTERPRISE ESTABLISHMENTS PAGE
 * 
 * Handles:
 * - Display establishments list
 * - Create new establishment
 * - Delete establishment
 * - Update establishment
 */

const pageState = {
    establishments: [],
    isLoading: false
};

// ===== LOAD ESTABLISHMENTS =====
async function loadEstablishments() {
    try {
        console.log('[ESTABLISHMENTS] Loading...');
        pageState.isLoading = true;

        // Protect page
        if (!state.getToken()) {
            window.location.href = 'sign-in.html';
            return;
        }

        // Fetch establishments
        const establishments = await EstablishmentService.getEstablishments();
        pageState.establishments = establishments || [];

        // Update UI
        updateEstablishmentsUI();
        console.log('[ESTABLISHMENTS] Loaded', pageState.establishments.length);
    } catch (error) {
        console.error('[ESTABLISHMENTS] Error:', error);
        showToast('Erreur lors du chargement des établissements', 'error');
    } finally {
        pageState.isLoading = false;
    }
}

// ===== CREATE ESTABLISHMENT =====
async function handleCreateEstablishment() {
    const name = document.getElementById('estName')?.value?.trim();
    const address = document.getElementById('estAddress')?.value?.trim();

    if (!name || !address) {
        showToast('Veuillez remplir tous les champs', 'warning');
        return;
    }

    try {
        console.log('[ESTABLISHMENTS] Creating:', { name, address });

        const result = await EstablishmentService.createEstablishment(name, address, {
            phone: document.getElementById('estPhone')?.value?.trim(),
            email: document.getElementById('estEmail')?.value?.trim(),
            description: document.getElementById('estDescription')?.value?.trim()
        });

        if (result) {
            showToast('Établissement créé avec succès', 'success');
            
            // Clear form
            document.getElementById('estName').value = '';
            document.getElementById('estAddress').value = '';
            document.getElementById('estPhone').value = '';
            document.getElementById('estEmail').value = '';
            document.getElementById('estDescription').value = '';

            // Reload list
            await loadEstablishments();
        }
    } catch (error) {
        console.error('[ESTABLISHMENTS] Create error:', error);
        showToast('Erreur lors de la création', 'error');
    }
}

// ===== DELETE ESTABLISHMENT =====
async function handleDeleteEstablishment(estId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet établissement?')) {
        return;
    }

    try {
        console.log('[ESTABLISHMENTS] Deleting:', estId);
        const result = await EstablishmentService.deleteEstablishment(estId);

        if (result) {
            showToast('Établissement supprimé avec succès', 'success');
            await loadEstablishments();
        }
    } catch (error) {
        console.error('[ESTABLISHMENTS] Delete error:', error);
        showToast('Erreur lors de la suppression', 'error');
    }
}

// ===== UPDATE ESTABLISHMENT =====
async function handleUpdateEstablishment(estId) {
    const name = prompt('Nouveau nom:');
    if (!name) return;

    try {
        console.log('[ESTABLISHMENTS] Updating:', estId);
        const result = await EstablishmentService.updateEstablishment(estId, { name });

        if (result) {
            showToast('Établissement mis à jour', 'success');
            await loadEstablishments();
        }
    } catch (error) {
        console.error('[ESTABLISHMENTS] Update error:', error);
        showToast('Erreur lors de la mise à jour', 'error');
    }
}

// ===== UPDATE UI =====
function updateEstablishmentsUI() {
    const tbody = document.getElementById('estTable');

    if (!pageState.establishments || pageState.establishments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">Aucun établissement</td></tr>';
        return;
    }

    tbody.innerHTML = pageState.establishments.map(est => `
        <tr>
            <td><strong>${escapeHtml(est.name || 'N/A')}</strong></td>
            <td>${escapeHtml(est.address || 'N/A')}</td>
            <td>${escapeHtml(est.email || '—')}</td>
            <td>${est.created_at ? new Date(est.created_at).toLocaleDateString('fr-FR') : 'N/A'}</td>
            <td>
                <button class="btn-small" onclick="handleUpdateEstablishment('${est.id}')">✏️ Modifier</button>
                <button class="btn-small btn-danger" onclick="handleDeleteEstablishment('${est.id}')">🗑️ Supprimer</button>
            </td>
        </tr>
    `).join('');
}

// ===== HELPER: Escape HTML =====
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== PAGE INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('[ESTABLISHMENTS] Page loaded');
    
    // Protect page
    AuthService.requireAuth('sign-in.html');
    
    // Load establishments
    loadEstablishments();

    // Setup form submission
    const createBtn = document.getElementById('createEstBtn');
    if (createBtn) {
        createBtn.addEventListener('click', handleCreateEstablishment);
    }

    // Allow Enter key in form
    const inputs = document.querySelectorAll('#estName, #estAddress, #estEmail, #estPhone');
    inputs.forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleCreateEstablishment();
            }
        });
    });

    // Refresh every 60 seconds
    setInterval(() => {
        if (document.hidden === false) {
            loadEstablishments();
        }
    }, 60000);

    console.log('[ESTABLISHMENTS] Initialized');
});

// ===== STYLE CLASS FOR BUTTONS =====
const style = document.createElement('style');
style.textContent = `
    .btn-small {
        padding: 6px 12px;
        margin: 0 4px;
        font-size: 12px;
        border: none;
        border-radius: 4px;
        background: #2563eb;
        color: white;
        cursor: pointer;
        transition: all 0.2s;
    }
    .btn-small:hover {
        background: #1d4ed8;
    }
    .btn-small.btn-danger {
        background: #dc2626;
    }
    .btn-small.btn-danger:hover {
        background: #b91c1c;
    }
`;
document.head.appendChild(style);
