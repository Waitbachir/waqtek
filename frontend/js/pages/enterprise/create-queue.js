/**
 * 📋 ENTERPRISE CREATE QUEUE PAGE
 * 
 * Handles:
 * - Create new queue
 * - Display queues by establishment
 * - Edit queue settings
 * - Delete queue
 */

const pageState = {
    establishments: [],
    queues: [],
    selectedEstId: null,
    isLoading: false
};

// ===== LOAD PAGE DATA =====
async function loadQueuesPage() {
    try {
        console.log('[QUEUES] Loading...');
        pageState.isLoading = true;

        // Protect page
        if (!state.getToken()) {
            window.location.href = 'sign-in.html';
            return;
        }

        // Load establishments
        const establishments = await EstablishmentService.getEstablishments();
        pageState.establishments = establishments || [];

        // Populate establishment select
        populateEstablishmentsSelect();

        // Load queues if first establishment exists
        if (pageState.establishments.length > 0) {
            pageState.selectedEstId = pageState.establishments[0].id;
            await loadQueuesForEstablishment(pageState.selectedEstId);
        }

        console.log('[QUEUES] Loaded', pageState.queues.length);
    } catch (error) {
        console.error('[QUEUES] Load error:', error);
        showToast('Erreur lors du chargement', 'error');
    } finally {
        pageState.isLoading = false;
    }
}

// ===== POPULATE ESTABLISHMENT SELECT =====
function populateEstablishmentsSelect() {
    const select = document.getElementById('estSelect');
    if (!select) return;

    select.innerHTML = pageState.establishments
        .map(est => `<option value="${est.id}">${escapeHtml(est.name)}</option>`)
        .join('');

    select.addEventListener('change', async function() {
        pageState.selectedEstId = this.value;
        await loadQueuesForEstablishment(pageState.selectedEstId);
    });
}

// ===== LOAD QUEUES FOR ESTABLISHMENT =====
async function loadQueuesForEstablishment(estId) {
    try {
        console.log('[QUEUES] Loading for establishment:', estId);
        const queues = await QueueService.getQueuesByEstablishment(estId);
        pageState.queues = queues || [];
        updateQueuesUI();
    } catch (error) {
        console.error('[QUEUES] Load error:', error);
        showToast('Erreur lors du chargement des files', 'error');
    }
}

// ===== CREATE QUEUE =====
async function handleCreateQueue() {
    if (!pageState.selectedEstId) {
        showToast('Veuillez sélectionner un établissement', 'warning');
        return;
    }

    const name = document.getElementById('queueName')?.value?.trim();
    const description = document.getElementById('queueDesc')?.value?.trim();

    if (!name) {
        showToast('Veuillez entrer un nom pour la file', 'warning');
        return;
    }

    try {
        console.log('[QUEUES] Creating:', { name, estId: pageState.selectedEstId });

        const result = await QueueService.createQueue({
            name,
            description,
            capacity: parseInt(document.getElementById('queueCapacity')?.value || '0') || null,
            priority: document.getElementById('queuePriority')?.value || 'normal',
            establishmentid: pageState.selectedEstId
        });

        if (result) {
            showToast('File créée avec succès', 'success');
            document.getElementById('queueName').value = '';
            document.getElementById('queueDesc').value = '';
            document.getElementById('queueCapacity').value = '';
            await loadQueuesForEstablishment(pageState.selectedEstId);
        }
    } catch (error) {
        console.error('[QUEUES] Create error:', error);
        showToast('Erreur lors de la création', 'error');
    }
}

// ===== DELETE QUEUE =====
async function handleDeleteQueue(queueId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette file?')) {
        return;
    }

    try {
        console.log('[QUEUES] Deleting:', queueId);
        const result = await QueueService.deleteQueue(queueId);

        if (result) {
            showToast('File supprimée', 'success');
            await loadQueuesForEstablishment(pageState.selectedEstId);
        }
    } catch (error) {
        console.error('[QUEUES] Delete error:', error);
        showToast('Erreur lors de la suppression', 'error');
    }
}

// ===== UPDATE UI =====
function updateQueuesUI() {
    const tbody = document.getElementById('queuesTable');

    if (!pageState.queues || pageState.queues.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">Aucune file</td></tr>';
        return;
    }

    tbody.innerHTML = pageState.queues.map(queue => `
        <tr>
            <td><strong>${escapeHtml(queue.name || 'N/A')}</strong></td>
            <td>${escapeHtml(queue.description || '—')}</td>
            <td>${queue.capacity ? `${queue.capacity} places` : '—'}</td>
            <td>${queue.priority || 'normal'}</td>
            <td>
                <button class="btn-small" onclick="handleDeleteQueue('${queue.id}')">🗑️ Supprimer</button>
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
    console.log('[QUEUES] Page loaded');
    
    // Protect page
    AuthService.requireAuth('sign-in.html');
    
    // Load data
    loadQueuesPage();

    // Setup create button
    const createBtn = document.getElementById('createQueueBtn');
    if (createBtn) {
        createBtn.addEventListener('click', handleCreateQueue);
    }

    // Allow Enter key
    const inputs = document.querySelectorAll('#queueName, #queueDesc');
    inputs.forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleCreateQueue();
            }
        });
    });

    console.log('[QUEUES] Initialized');
});
