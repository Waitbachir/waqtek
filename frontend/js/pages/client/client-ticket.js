/**
 * CLIENT TICKET PAGE
 * Supports QR/manual ticket creation with offline fallback and auto-sync.
 */

const pageState = {
    scanner: null,
    currentTicket: null,
    isScanning: false,
    ticketsCreated: [],
    selectedQueue: null,
    syncInProgress: false,
    syncTimer: null
};

const CLIENT_PENDING_SYNC_KEY = 'waqtek_client_pending_sync_v1';
const CLIENT_OFFLINE_COUNTER_KEY = 'waqtek_client_offline_counter_v1';
const WAITING_CACHE_PREFIX = 'waqtek_waiting_cache_';
const OFFLINE_TICKET_MAP_KEY = 'waqtek_offline_ticket_map_v1';

function safeParseJson(raw, fallback = null) {
    try {
        return JSON.parse(raw);
    } catch (_) {
        return fallback;
    }
}

function isOfflineError(error) {
    if (!error) return false;
    if (!navigator.onLine) return true;
    if (!error.status) return true;
    const message = String(error.message || '').toLowerCase();
    return message.includes('network') || message.includes('fetch') || message.includes('timeout');
}

function getPendingSyncQueue() {
    return safeParseJson(localStorage.getItem(CLIENT_PENDING_SYNC_KEY), []) || [];
}

function setPendingSyncQueue(items) {
    localStorage.setItem(CLIENT_PENDING_SYNC_KEY, JSON.stringify(items || []));
}

function pushPendingSync(item) {
    const queue = getPendingSyncQueue();
    queue.push(item);
    setPendingSyncQueue(queue);
}

function getNextOfflineNumber() {
    const current = Number(localStorage.getItem(CLIENT_OFFLINE_COUNTER_KEY) || '0');
    const next = current + 1;
    localStorage.setItem(CLIENT_OFFLINE_COUNTER_KEY, String(next));
    return `C-OFF-${next}`;
}

function cacheTicketForWaiting(queueId, ticket) {
    if (!queueId || !ticket) return;
    const key = `${WAITING_CACHE_PREFIX}${queueId}`;
    const current = safeParseJson(localStorage.getItem(key), []);
    const list = Array.isArray(current) ? current : [];
    list.unshift(ticket);
    localStorage.setItem(key, JSON.stringify(list.slice(0, 60)));
}

function removeOfflineTicketFromWaitingCache(queueId, offlineTicketId) {
    if (!queueId || !offlineTicketId) return;
    const key = `${WAITING_CACHE_PREFIX}${queueId}`;
    const current = safeParseJson(localStorage.getItem(key), []);
    const list = Array.isArray(current) ? current : [];
    const filtered = list.filter((t) => t.id !== offlineTicketId);
    localStorage.setItem(key, JSON.stringify(filtered));
}

function getOfflineTicketMap() {
    return safeParseJson(localStorage.getItem(OFFLINE_TICKET_MAP_KEY), {}) || {};
}

function setOfflineTicketMap(map) {
    localStorage.setItem(OFFLINE_TICKET_MAP_KEY, JSON.stringify(map || {}));
}

function saveOfflineTicketMapping(offlineTicketId, queueId, serverTicket) {
    if (!offlineTicketId || !serverTicket?.id) return;
    const map = getOfflineTicketMap();
    map[offlineTicketId] = {
        queueId: queueId || null,
        serverTicketId: serverTicket.id,
        serverTicketNumber: serverTicket.number || null,
        syncedAt: new Date().toISOString()
    };
    setOfflineTicketMap(map);
}

function replaceOfflineTicketInList(offlineTicketId, serverTicket) {
    if (!offlineTicketId || !serverTicket) return;

    pageState.ticketsCreated = (pageState.ticketsCreated || []).map((ticket) => {
        if (ticket.id === offlineTicketId) {
            return { ...serverTicket, syncedFromOffline: true };
        }
        return ticket;
    });

    if (pageState.currentTicket && pageState.currentTicket.id === offlineTicketId) {
        pageState.currentTicket = { ...serverTicket, syncedFromOffline: true };
        state.setCurrentTicket(pageState.currentTicket);
        displayTicket(pageState.currentTicket);
    }
}

function buildOfflineTicket(queueId) {
    return {
        id: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        queue_id: queueId,
        number: getNextOfflineNumber(),
        status: 'waiting',
        created_at: new Date().toISOString(),
        offline: true
    };
}

async function syncPendingTickets() {
    if (pageState.syncInProgress) return;
    if (!navigator.onLine) return;

    const pending = getPendingSyncQueue();
    if (!pending.length) return;

    pageState.syncInProgress = true;

    const remaining = [];
    let syncedCount = 0;

    for (const item of pending) {
        try {
            const serverTicket = await TicketService.createPublicTicket(item.queueId, item.establishmentId || null);
            if (!serverTicket || !serverTicket.id) {
                remaining.push(item);
                continue;
            }

            removeOfflineTicketFromWaitingCache(item.queueId, item.offlineTicketId);
            cacheTicketForWaiting(item.queueId, serverTicket);
            replaceOfflineTicketInList(item.offlineTicketId, serverTicket);
            saveOfflineTicketMapping(item.offlineTicketId, item.queueId, serverTicket);
            syncedCount += 1;
        } catch (error) {
            remaining.push(item);
            if (isOfflineError(error)) {
                break;
            }
        }
    }

    setPendingSyncQueue(remaining);
    pageState.syncInProgress = false;
    updateTicketsDisplay();

    if (syncedCount > 0) {
        showToast(`${syncedCount} ticket(s) synchronise(s)`, 'success');
    }
}

function startSyncWatcher() {
    window.addEventListener('online', () => {
        syncPendingTickets();
    });

    if (pageState.syncTimer) {
        clearInterval(pageState.syncTimer);
    }

    pageState.syncTimer = setInterval(syncPendingTickets, 7000);
}

// ===== INITIALIZE QR SCANNER =====
async function initializeQrScanner() {
    try {
        console.log('[CLIENT-TICKET] Initializing QR scanner...');

        if (typeof Html5Qrcode === 'undefined') {
            console.warn('[CLIENT-TICKET] Html5Qrcode not loaded');
            showToast('Scanner non disponible - rechargez la page', 'warning');
            disableScannerUI();
            return;
        }

        const isLocalhost = (() => {
            const host = window.location.hostname;
            return host === 'localhost' || host === '127.0.0.1' || host === '';
        })();

        if (!window.isSecureContext && !isLocalhost) {
            showToast('Le scanner QR necessite HTTPS ou localhost', 'warning');
            disableScannerUI();
            return;
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showToast('Camera non supportee sur ce navigateur', 'warning');
            disableScannerUI();
            return;
        }

        const cameras = await Html5Qrcode.getCameras();

        if (!cameras || cameras.length === 0) {
            console.warn('[CLIENT-TICKET] No cameras found');
            showToast('Camera non disponible - utilisez la saisie manuelle', 'warning');
            disableScannerUI();
            return;
        }

        const qrReader = document.getElementById('reader');
        if (!qrReader) return;

        pageState.scanner = new Html5Qrcode('reader');

        const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            rememberLastUsedCamera: true
        };

        await pageState.scanner.start(cameras[0].id, config, onQrCodeSuccess, onQrCodeError);

        pageState.isScanning = true;
        console.log('[CLIENT-TICKET] Scanner started');
    } catch (error) {
        console.error('[CLIENT-TICKET] Scanner initialization error:', error);
        showToast('Scanner QR indisponible - utilisez la saisie manuelle', 'warning');
        disableScannerUI();
    }
}

// ===== QR CODE SUCCESS =====
function onQrCodeSuccess(qrCodeFullObject) {
    const decodedText = qrCodeFullObject;
    console.log('[CLIENT-TICKET] QR Code scanned:', decodedText);

    const queueId = decodedText.replace('QUEUE-', '');

    if (queueId) {
        document.getElementById('queueCode').value = queueId;
        createTicketFromQr(queueId);
    }
}

// ===== QR CODE ERROR =====
function onQrCodeError() {
    // Ignore scanner noise
}

// ===== DISABLE SCANNER UI =====
function disableScannerUI() {
    const reader = document.getElementById('reader');
    if (reader) {
        reader.innerHTML = '<p style="color: #999; padding: 20px;">Camera non disponible</p>';
    }
}

// ===== CREATE TICKET FROM QR =====
async function createTicketFromQr(queueCode) {
    if (!pageState.isScanning) return;

    if (pageState.scanner) {
        await pageState.scanner.stop();
        pageState.isScanning = false;
    }

    await createTicket(queueCode);

    setTimeout(() => {
        if (pageState.scanner) {
            initializeQrScanner();
        }
    }, 2000);
}

// ===== CREATE TICKET =====
async function createTicket(queueCodeOrEvent = null) {
    try {
        if (queueCodeOrEvent && queueCodeOrEvent.target) {
            if (typeof queueCodeOrEvent.preventDefault === 'function') {
                queueCodeOrEvent.preventDefault();
            }
            queueCodeOrEvent = null;
        }

        const code = queueCodeOrEvent || document.getElementById('queueCode')?.value?.trim();

        if (!code) {
            showToast('Veuillez entrer le code de la file ou scanner le QR code', 'warning');
            return;
        }

        console.log('[CLIENT-TICKET] Creating ticket for queue:', code);

        const result = await TicketService.createPublicTicket(code);
        const ticket = result && result.ticket ? result.ticket : result;

        if (ticket) {
            pageState.currentTicket = ticket;
            pageState.ticketsCreated.push(ticket);

            cacheTicketForWaiting(code, ticket);
            displayTicket(ticket);
            state.setCurrentTicket(ticket);
            updateTicketsDisplay();

            showToast(`Ticket cree: ${ticket.number}`, 'success');
            document.getElementById('queueCode').value = '';

            subscribeToTicketUpdates(ticket.id);
        }
    } catch (error) {
        const code = queueCodeOrEvent || document.getElementById('queueCode')?.value?.trim();

        if (code && isOfflineError(error)) {
            const offlineTicket = buildOfflineTicket(code);
            pageState.currentTicket = offlineTicket;
            pageState.ticketsCreated.push(offlineTicket);

            pushPendingSync({
                queueId: code,
                establishmentId: null,
                offlineTicketId: offlineTicket.id,
                offlineTicketNumber: offlineTicket.number,
                createdAt: new Date().toISOString()
            });

            cacheTicketForWaiting(code, offlineTicket);
            displayTicket(offlineTicket);
            state.setCurrentTicket(offlineTicket);
            updateTicketsDisplay();

            showToast('Connexion perdue: ticket cree hors-ligne et en attente de sync.', 'warning');
            document.getElementById('queueCode').value = '';
            return;
        }

        console.error('[CLIENT-TICKET] Create ticket error:', error);
        showToast(error.message || 'Erreur lors de la creation du ticket', 'error');
    }
}

// ===== DISPLAY TICKET =====
function displayTicket(ticket) {
    const ticketBox = document.getElementById('ticketBox');
    if (!ticketBox) return;

    ticketBox.style.display = 'block';
    document.getElementById('ticketNumber').textContent = ticket.number || '???';

    const status = ticket.offline ? 'waiting (hors-ligne, sync en attente)' : (ticket.status || 'waiting');
    document.getElementById('ticketStatus').textContent = `Status: ${status}`;

    ticketBox.scrollIntoView({ behavior: 'smooth' });
}

// ===== SUBSCRIBE TO TICKET UPDATES =====
function subscribeToTicketUpdates(ticketId) {
    try {
        RealtimeService.subscribeToTicket(ticketId, (update) => {
            console.log('[CLIENT-TICKET] Ticket update:', update);

            if (update.status && pageState.currentTicket) {
                pageState.currentTicket.status = update.status;
                document.getElementById('ticketStatus').textContent = `Status: ${update.status}`;

                if (update.status === 'called') {
                    showToast('Votre ticket a ete appele!', 'success');
                } else if (update.status === 'served') {
                    showToast('Votre ticket a ete servi!', 'success');
                }

                updateTicketsDisplay();
            }
        });
    } catch (error) {
        console.error('[CLIENT-TICKET] Subscribe error:', error);
    }
}

// ===== CREATE MULTIPLE TICKETS (TEST MODE) =====
async function createMultipleTickets() {
    const code = document.getElementById('queueCode')?.value?.trim();
    const count = parseInt(document.getElementById('ticketCount')?.value || '1', 10);

    if (!code || count < 1 || count > 10) {
        showToast('Code invalide ou nombre de tickets invalide (1-10)', 'warning');
        return;
    }

    console.log('[CLIENT-TICKET] Creating', count, 'tickets for queue:', code);

    for (let i = 0; i < count; i += 1) {
        try {
            await createTicket(code);
            await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error) {
            console.error('[CLIENT-TICKET] Error creating ticket', i + 1, ':', error);
        }
    }

    showToast(`${count} tickets traites`, 'success');
}

// ===== UPDATE TICKETS DISPLAY =====
function updateTicketsDisplay() {
    const container = document.getElementById('ticketsContainer');
    if (!container) return;

    if (!pageState.ticketsCreated || pageState.ticketsCreated.length === 0) {
        container.innerHTML = '<p style="color: #999;">Aucun ticket cree</p>';
        return;
    }

    const list = [...pageState.ticketsCreated].reverse();

    container.innerHTML = list.map((ticket) => `
        <div style="padding: 10px; border: 1px solid #ddd; margin-bottom: 10px; border-radius: 6px;">
            <strong>#${ticket.number}</strong>
            <span style="float: right; color: ${getStatusColor(ticket.status)};">●</span>
            <br/>
            <small>Status: ${ticket.offline ? 'waiting (hors-ligne)' : (ticket.status || 'waiting')}</small>
            <br/>
            <small>${ticket.created_at ? formatTime(ticket.created_at) : ''}</small>
        </div>
    `).join('');
}

// ===== HELPER: Get Status Color =====
function getStatusColor(status) {
    switch (status) {
        case 'called':
            return '#ff9800';
        case 'served':
            return '#4caf50';
        case 'cancelled':
            return '#f44336';
        default:
            return '#2196f3';
    }
}

// ===== HELPER: Format Time =====
function formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('fr-FR');
}

// ===== PAGE INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function onReady() {
    console.log('[CLIENT-TICKET] Page loaded');

    initializeQrScanner();
    startSyncWatcher();
    syncPendingTickets();

    const createBtn = document.getElementById('createTicketBtn');
    if (createBtn) {
        createBtn.addEventListener('click', createTicket);
    }

    const testBtn = document.getElementById('createMultipleTicketsBtn');
    if (testBtn) {
        testBtn.addEventListener('click', createMultipleTickets);
    }

    const queueCodeInput = document.getElementById('queueCode');
    if (queueCodeInput) {
        queueCodeInput.addEventListener('keypress', function onKeyPress(e) {
            if (e.key === 'Enter') {
                createTicket();
            }
        });
    }

    console.log('[CLIENT-TICKET] Initialized');
});

// ===== CLEANUP =====
window.addEventListener('beforeunload', function onUnload() {
    if (pageState.scanner) {
        pageState.scanner.stop();
    }
    if (pageState.syncTimer) {
        clearInterval(pageState.syncTimer);
    }
});
