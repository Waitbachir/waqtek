/**
 * ENTERPRISE MANAGE TICKETS PAGE
 * Offline-capable queue management with automatic synchronization.
 */

const pageState = {
    queues: [],
    tickets: [],
    allTickets: [],
    selectedQueueId: null,
    selectedEstId: null,
    selectedCounter: null,
    currentTicketId: null,
    currentTicket: null,
    isLoading: false,
    realtimeUnsubscribe: null,
    connectionLost: !navigator.onLine,
    syncInProgress: false,
    syncTimer: null,
    refreshTimer: null
};
let manageTicketsInitialized = false;

window.pageState = pageState;

const COUNTER_STORAGE_KEY = 'waqtek_selected_counter';
const DEFAULT_COUNTERS = 10;
const WAITING_CACHE_PREFIX = 'waqtek_waiting_cache_';
const ENTERPRISE_TICKETS_CACHE_PREFIX = 'waqtek_enterprise_tickets_cache_';
const QUEUE_CACHE_PREFIX = 'waqtek_enterprise_queue_cache_';
const ESTABLISHMENTS_CACHE_KEY = 'waqtek_enterprise_establishments_cache_v1';
const PENDING_ACTIONS_KEY = 'waqtek_enterprise_pending_actions_v1';
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

function normalizeTicket(ticket) {
    if (!ticket || typeof ticket !== 'object') return null;
    return {
        ...ticket,
        id: ticket.id || ticket.ticket_id || ticket.ticketId || null,
        number: String(ticket.number || ticket.numero_ticket || '-'),
        status: ticket.status || 'waiting'
    };
}

function sortByDateAsc(list) {
    return (list || []).slice().sort((a, b) => {
        const aTime = new Date(a.created_at || a.updated_at || 0).getTime();
        const bTime = new Date(b.created_at || b.updated_at || 0).getTime();
        return aTime - bTime;
    });
}

function queueTicketsCacheKey(queueId) {
    return `${ENTERPRISE_TICKETS_CACHE_PREFIX}${queueId}`;
}

function sharedWaitingCacheKey(queueId) {
    return `${WAITING_CACHE_PREFIX}${queueId}`;
}

function queueListCacheKey(establishmentId) {
    return `${QUEUE_CACHE_PREFIX}${establishmentId}`;
}

function writeTicketsToCache(queueId, tickets) {
    if (!queueId) return;
    const list = (Array.isArray(tickets) ? tickets : [])
        .map(normalizeTicket)
        .filter(Boolean)
        .slice(0, 200);

    localStorage.setItem(queueTicketsCacheKey(queueId), JSON.stringify(list));
    localStorage.setItem(sharedWaitingCacheKey(queueId), JSON.stringify(list));
}

function readTicketsFromCache(queueId) {
    if (!queueId) return [];

    const localRaw = localStorage.getItem(queueTicketsCacheKey(queueId));
    const localList = safeParseJson(localRaw, []);
    if (Array.isArray(localList) && localList.length > 0) {
        return localList.map(normalizeTicket).filter(Boolean);
    }

    const sharedRaw = localStorage.getItem(sharedWaitingCacheKey(queueId));
    const sharedList = safeParseJson(sharedRaw, []);
    return Array.isArray(sharedList)
        ? sharedList.map(normalizeTicket).filter(Boolean)
        : [];
}

function writeEstablishmentsCache(establishments) {
    const list = Array.isArray(establishments) ? establishments : [];
    localStorage.setItem(ESTABLISHMENTS_CACHE_KEY, JSON.stringify(list.slice(0, 200)));
}

function readEstablishmentsCache() {
    return safeParseJson(localStorage.getItem(ESTABLISHMENTS_CACHE_KEY), []) || [];
}

function writeQueuesCache(establishmentId, queues) {
    if (!establishmentId) return;
    const list = Array.isArray(queues) ? queues : [];
    localStorage.setItem(queueListCacheKey(establishmentId), JSON.stringify(list.slice(0, 200)));
}

function readQueuesCache(establishmentId) {
    if (!establishmentId) return [];
    return safeParseJson(localStorage.getItem(queueListCacheKey(establishmentId)), []) || [];
}

function getPendingActions() {
    return safeParseJson(localStorage.getItem(PENDING_ACTIONS_KEY), []) || [];
}

function setPendingActions(actions) {
    localStorage.setItem(PENDING_ACTIONS_KEY, JSON.stringify(Array.isArray(actions) ? actions : []));
    updateSyncBanner();
}

function getOfflineTicketMap() {
    return safeParseJson(localStorage.getItem(OFFLINE_TICKET_MAP_KEY), {}) || {};
}

function enqueuePendingAction(action) {
    const queue = getPendingActions();
    queue.push({
        id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        queuedAt: new Date().toISOString(),
        ...action
    });
    setPendingActions(queue);
}

function getTicketCounter(ticket) {
    if (!ticket) return '';
    return ticket.counter || ticket.counter_number || ticket.counterNumber || ticket.guichet || ticket.window || '';
}

function normalizeCounter(value) {
    if (value === null || value === undefined) return '';
    return String(value).trim();
}

function getCurrentTicketForCounter(counter, calledTickets) {
    const counterValue = normalizeCounter(counter);
    if (!counterValue) return null;

    const list = (calledTickets || []).filter((t) => normalizeCounter(getTicketCounter(t)) === counterValue);
    if (list.length === 0) return null;

    return list
        .slice()
        .sort((a, b) => {
            const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
            const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
            return bTime - aTime;
        })[0];
}

function syncCurrentTicketForCounter(calledTickets = null) {
    const called = calledTickets || pageState.allTickets.filter((t) => t.status === 'called');
    const current = getCurrentTicketForCounter(pageState.selectedCounter, called);

    pageState.currentTicket = current || null;
    pageState.currentTicketId = current ? current.id : null;
    stateManager.setCurrentTicket(current || null);

    return current || null;
}

function rebuildListsFromAll() {
    const waiting = pageState.allTickets.filter((t) => t.status === 'waiting');
    const called = pageState.allTickets.filter((t) => t.status === 'called');
    const served = pageState.allTickets.filter((t) => t.status === 'served');
    const missed = pageState.allTickets.filter((t) => t.status === 'missed');
    return { waiting, called, served, missed };
}

function updateLocalTicket(ticketId, updates = {}) {
    if (!ticketId) return;
    pageState.allTickets = (pageState.allTickets || []).map((t) => {
        if (t.id === ticketId) {
            return { ...t, ...updates, updated_at: new Date().toISOString() };
        }
        return t;
    });
}

function setConnectionLost(value) {
    pageState.connectionLost = !!value;
    updateSyncBanner();
}

function updateSyncBanner() {
    const banner = document.getElementById('syncBanner');
    if (!banner) return;

    const pending = getPendingActions().length;
    const offline = !navigator.onLine || pageState.connectionLost;

    if (offline) {
        banner.className = 'mb-6 rounded-xl border px-4 py-3 text-sm bg-amber-50 border-amber-300 text-amber-800';
        banner.textContent = pending > 0
            ? `Mode hors ligne actif. ${pending} action(s) en attente de synchronisation.`
            : 'Mode hors ligne actif. Les tickets en cache restent disponibles.';
        return;
    }

    if (pending > 0) {
        banner.className = 'mb-6 rounded-xl border px-4 py-3 text-sm bg-blue-50 border-blue-300 text-blue-800';
        banner.textContent = `Connexion retablie. Synchronisation de ${pending} action(s) en cours.`;
        return;
    }

    banner.className = 'mb-6 rounded-xl border px-4 py-3 text-sm bg-emerald-50 border-emerald-300 text-emerald-800';
    banner.textContent = 'Connexion active. Donnees synchronisees.';
}

async function resolveServerTicketId(action, queueTicketsMap) {
    const currentId = String(action.ticketId || '');
    if (currentId && !currentId.startsWith('offline-')) {
        return currentId;
    }

    if (currentId && currentId.startsWith('offline-')) {
        const map = getOfflineTicketMap();
        const mapped = map[currentId];
        if (mapped?.serverTicketId) {
            return mapped.serverTicketId;
        }
    }

    const queueId = action.queueId;
    if (!queueId) return null;

    if (!queueTicketsMap.has(queueId)) {
        try {
            const tickets = await TicketService.getQueueTickets(queueId);
            queueTicketsMap.set(queueId, Array.isArray(tickets) ? tickets : []);
        } catch (error) {
            if (isOfflineError(error)) {
                throw error;
            }
            queueTicketsMap.set(queueId, []);
        }
    }

    const list = queueTicketsMap.get(queueId) || [];
    const found = list.find((t) => String(t.number || '') === String(action.ticketNumber || ''));
    return found?.id || null;
}

async function syncPendingActions() {
    if (pageState.syncInProgress) return;
    if (!navigator.onLine) return;

    const pending = getPendingActions();
    if (!pending.length) {
        updateSyncBanner();
        return;
    }

    pageState.syncInProgress = true;
    updateSyncBanner();

    const queueTicketsMap = new Map();
    const remaining = [];

    for (const action of pending) {
        try {
            const resolvedTicketId = await resolveServerTicketId(action, queueTicketsMap);
            if (!resolvedTicketId) {
                remaining.push(action);
                continue;
            }

            const extra = action.status === 'called' && action.counter
                ? { counter: action.counter }
                : {};

            await TicketService.updateTicketStatus(resolvedTicketId, action.status, extra);

            if (action.ticketId && action.ticketId.startsWith('offline-') && pageState.selectedQueueId === action.queueId) {
                updateLocalTicket(action.ticketId, { id: resolvedTicketId, status: action.status, counter: action.counter || null });
            }
        } catch (error) {
            if (error?.status === 401 || error?.status === 403) {
                window.location.href = 'sign-in.html';
                remaining.push(action);
                continue;
            }

            remaining.push(action);

            if (isOfflineError(error)) {
                setConnectionLost(true);
                break;
            }
        }
    }

    setPendingActions(remaining);
    pageState.syncInProgress = false;

    if (pageState.selectedQueueId && navigator.onLine) {
        await loadTicketsForQueue(pageState.selectedQueueId, { silentError: true });
    } else {
        rebuildAndRenderUI();
    }

    if (pending.length > remaining.length) {
        showToast(`${pending.length - remaining.length} action(s) synchronisee(s)`, 'success');
    }

    updateSyncBanner();
}

function populateCounterSelect() {
    const select = document.getElementById('counterSelect');
    if (!select) return;

    if (!select.options || select.options.length <= 1) {
        const options = ['<option value="">-- Guichet --</option>'];
        for (let i = 1; i <= DEFAULT_COUNTERS; i++) {
            options.push(`<option value="${i}">Guichet ${i}</option>`);
        }
        select.innerHTML = options.join('');
    }

    const saved = localStorage.getItem(COUNTER_STORAGE_KEY);
    if (saved) {
        select.value = saved;
        pageState.selectedCounter = saved;
    }

    select.onchange = function onCounterChange() {
        const value = this.value || '';
        pageState.selectedCounter = value ? value : null;

        if (value) {
            localStorage.setItem(COUNTER_STORAGE_KEY, value);
        } else {
            localStorage.removeItem(COUNTER_STORAGE_KEY);
        }

        syncCurrentTicketForCounter();
        updateCurrentTicketUI(pageState.currentTicket);
        updateActionButtonsState();
    };
}

function populateEstablishmentsSelect(establishments) {
    const select = document.getElementById('establishmentSelect');
    if (!select) return;

    const list = Array.isArray(establishments) ? establishments : [];

    if (list.length === 0) {
        select.innerHTML = '<option value="">-- Etablissement --</option>';
        return;
    }

    select.innerHTML = list
        .map((est) => `<option value="${est.id}">${escapeHtml(est.name || est.id)}</option>`)
        .join('');

    if (pageState.selectedEstId) {
        select.value = pageState.selectedEstId;
    }

    select.onchange = async function onEstablishmentChange() {
        pageState.selectedEstId = this.value || null;
        pageState.selectedQueueId = null;
        pageState.currentTicketId = null;
        pageState.currentTicket = null;
        pageState.allTickets = [];
        pageState.tickets = [];

        updateCurrentTicketUI(null);
        updateActionButtonsState();

        if (!pageState.selectedEstId) {
            pageState.queues = [];
            populateQueuesSelect();
            return;
        }

        await loadQueuesForSelectedEstablishment();
    };
}

function populateQueuesSelect() {
    const select = document.getElementById('queueSelect');
    if (!select) return;

    if (!pageState.queues || pageState.queues.length === 0) {
        select.innerHTML = '<option value="">-- File d\'attente --</option>';
        select.disabled = true;
        return;
    }

    select.innerHTML = pageState.queues
        .map((queue) => `<option value="${queue.id}">${escapeHtml(queue.name || queue.id)}</option>`)
        .join('');

    select.disabled = false;

    if (pageState.selectedQueueId) {
        select.value = pageState.selectedQueueId;
    }

    select.onchange = async function onQueueChange() {
        pageState.selectedQueueId = this.value || null;
        pageState.currentTicketId = null;
        pageState.currentTicket = null;
        updateCurrentTicketUI(null);

        if (!pageState.selectedQueueId) {
            pageState.allTickets = [];
            rebuildAndRenderUI();
            return;
        }

        await loadTicketsForQueue(pageState.selectedQueueId);
        setupRealtimeUpdates();
    };
}

async function loadQueuesForSelectedEstablishment() {
    if (!pageState.selectedEstId) {
        pageState.queues = [];
        populateQueuesSelect();
        return;
    }

    try {
        const queues = await QueueService.getQueuesByEstablishment(pageState.selectedEstId);
        pageState.queues = Array.isArray(queues) ? queues : [];
        writeQueuesCache(pageState.selectedEstId, pageState.queues);
        setConnectionLost(false);
    } catch (error) {
        if (isOfflineError(error)) {
            setConnectionLost(true);
            pageState.queues = readQueuesCache(pageState.selectedEstId);
            showToast('Connexion perdue: files chargees depuis le cache.', 'warning');
        } else {
            console.error('[MANAGE-TICKETS] Queue load error:', error);
            showToast('Erreur lors du chargement des files', 'error');
            pageState.queues = [];
        }
    }

    populateQueuesSelect();

    if (pageState.queues.length > 0) {
        pageState.selectedQueueId = pageState.queues[0].id;
        await loadTicketsForQueue(pageState.selectedQueueId);
        setupRealtimeUpdates();
    } else {
        pageState.allTickets = [];
        rebuildAndRenderUI();
    }
}

function rebuildAndRenderUI() {
    const lists = rebuildListsFromAll();
    pageState.tickets = sortByDateAsc(lists.waiting);
    const current = syncCurrentTicketForCounter(lists.called);

    updateStatsUI(lists);
    updateCurrentTicketUI(current);
    updateTicketsUI();
    updateActionButtonsState();

    if (pageState.selectedQueueId) {
        writeTicketsToCache(pageState.selectedQueueId, pageState.allTickets);
    }
}

async function loadTicketsForQueue(queueId, options = {}) {
    const { silentError = false } = options;

    if (!queueId) {
        pageState.allTickets = [];
        rebuildAndRenderUI();
        return;
    }

    try {
        const allTickets = await TicketService.getQueueTickets(queueId);
        pageState.allTickets = (Array.isArray(allTickets) ? allTickets : [])
            .map(normalizeTicket)
            .filter(Boolean);
        writeTicketsToCache(queueId, pageState.allTickets);
        setConnectionLost(false);
        rebuildAndRenderUI();
    } catch (error) {
        if (isOfflineError(error)) {
            setConnectionLost(true);
            const cached = readTicketsFromCache(queueId);
            if (cached.length > 0) {
                pageState.allTickets = cached;
                rebuildAndRenderUI();
                if (!silentError) {
                    showToast('Connexion perdue: tickets recuperes depuis le cache.', 'warning');
                }
                return;
            }
        }

        console.error('[MANAGE-TICKETS] Load tickets error:', error);
        if (!silentError) {
            showToast('Erreur lors du chargement des tickets', 'error');
        }
    }
}

function selectNextWaitingTicket() {
    const waitingList = sortByDateAsc(pageState.allTickets.filter((t) => t.status === 'waiting'));
    return waitingList[0] || null;
}

async function handleCallNextTicket() {
    if (!pageState.selectedQueueId) {
        showToast('Veuillez selectionner une file', 'warning');
        return;
    }

    if (!pageState.selectedCounter) {
        showToast('Veuillez selectionner un guichet', 'warning');
        return;
    }

    if (pageState.currentTicketId) {
        showToast('Ce guichet a deja un ticket appele', 'warning');
        return;
    }

    try {
        const freshTickets = await TicketService.getQueueTickets(pageState.selectedQueueId);
        pageState.allTickets = (Array.isArray(freshTickets) ? freshTickets : [])
            .map(normalizeTicket)
            .filter(Boolean);
        setConnectionLost(false);

        const nextTicket = selectNextWaitingTicket();
        if (!nextTicket) {
            showToast('Aucun ticket en attente', 'info');
            rebuildAndRenderUI();
            return;
        }

        await TicketService.updateTicketStatus(nextTicket.id, 'called', {
            counter: pageState.selectedCounter
        });

        updateLocalTicket(nextTicket.id, {
            status: 'called',
            counter: pageState.selectedCounter
        });

        rebuildAndRenderUI();
        showToast(`Ticket appele: ${nextTicket.number || ''}`, 'success');
    } catch (error) {
        if (isOfflineError(error)) {
            setConnectionLost(true);

            const nextTicket = selectNextWaitingTicket();
            if (!nextTicket) {
                showToast('Aucun ticket en attente', 'info');
                return;
            }

            updateLocalTicket(nextTicket.id, {
                status: 'called',
                counter: pageState.selectedCounter
            });

            enqueuePendingAction({
                queueId: pageState.selectedQueueId,
                ticketId: nextTicket.id,
                ticketNumber: nextTicket.number,
                status: 'called',
                counter: pageState.selectedCounter
            });

            rebuildAndRenderUI();
            showToast(`Mode hors ligne: ticket ${nextTicket.number || ''} appele localement.`, 'warning');
            return;
        }

        console.error('[MANAGE-TICKETS] Call next error:', error);
        showToast("Erreur lors de l'appel du ticket", 'error');
    }
}

async function handleUpdateTicketStatus(ticketId, newStatus) {
    if (!ticketId || !newStatus) return;

    try {
        if (newStatus === 'called') {
            if (!pageState.selectedCounter) {
                showToast('Veuillez selectionner un guichet', 'warning');
                await loadTicketsForQueue(pageState.selectedQueueId, { silentError: true });
                return;
            }

            if (pageState.currentTicketId && pageState.currentTicketId !== ticketId) {
                showToast('Ce guichet a deja un ticket appele', 'warning');
                await loadTicketsForQueue(pageState.selectedQueueId, { silentError: true });
                return;
            }

            await TicketService.updateTicketStatus(ticketId, newStatus, {
                counter: pageState.selectedCounter
            });
        } else {
            await TicketService.updateTicketStatus(ticketId, newStatus);
        }

        updateLocalTicket(ticketId, {
            status: newStatus,
            counter: newStatus === 'called' ? pageState.selectedCounter : getTicketCounter(pageState.currentTicket)
        });

        if (newStatus !== 'called' && pageState.currentTicketId === ticketId) {
            pageState.currentTicket = null;
            pageState.currentTicketId = null;
        }

        setConnectionLost(false);
        rebuildAndRenderUI();
    } catch (error) {
        if (isOfflineError(error)) {
            setConnectionLost(true);

            const ticket = pageState.allTickets.find((t) => t.id === ticketId);
            if (!ticket) {
                showToast('Ticket introuvable en cache local.', 'error');
                return;
            }

            updateLocalTicket(ticketId, {
                status: newStatus,
                counter: newStatus === 'called' ? pageState.selectedCounter : getTicketCounter(ticket)
            });

            if (newStatus !== 'called' && pageState.currentTicketId === ticketId) {
                pageState.currentTicket = null;
                pageState.currentTicketId = null;
            }

            enqueuePendingAction({
                queueId: pageState.selectedQueueId,
                ticketId,
                ticketNumber: ticket.number,
                status: newStatus,
                counter: newStatus === 'called' ? pageState.selectedCounter : undefined
            });

            rebuildAndRenderUI();
            showToast('Mode hors ligne: action enregistree pour synchronisation.', 'warning');
            return;
        }

        console.error('[MANAGE-TICKETS] Update status error:', error);
        showToast('Erreur lors de la mise a jour', 'error');
    }
}

function setupRealtimeUpdates() {
    try {
        if (!pageState.selectedQueueId) return;

        if (typeof pageState.realtimeUnsubscribe === 'function') {
            pageState.realtimeUnsubscribe();
        }

        pageState.realtimeUnsubscribe = RealtimeService.subscribeToQueue(pageState.selectedQueueId, () => {
            loadTicketsForQueue(pageState.selectedQueueId, { silentError: true });
        });
    } catch (error) {
        console.error('[MANAGE-TICKETS] Real-time setup error:', error);
    }
}

function getClientName(ticket) {
    return ticket?.client_name || ticket?.clientName || ticket?.customer_name || ticket?.customerName || '-';
}

function getClientPhone(ticket) {
    const candidates = [
        ticket?.client_phone,
        ticket?.clientPhone,
        ticket?.phone,
        ticket?.telephone,
        ticket?.tel,
        ticket?.mobile,
        ticket?.customer_phone,
        ticket?.customerPhone
    ];

    for (const value of candidates) {
        const text = String(value || '').trim();
        if (text) return text;
    }

    return '';
}

function updateTicketsUI() {
    const tbody = document.getElementById('ticketsTable');
    if (!tbody) return;

    if (!pageState.tickets || pageState.tickets.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-slate-400">Aucun ticket en attente</td></tr>';
        return;
    }

    tbody.innerHTML = pageState.tickets.map((ticket) => {
        const phone = getClientPhone(ticket);
        const safePhone = escapeHtml(phone);
        const clientName = escapeHtml(getClientName(ticket));
        const status = ticket.status || 'waiting';

        const contactHtml = phone
            ? `<a href="tel:${safePhone}" class="inline-flex items-center rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700">Appeler</a><div class="mt-1 text-xs text-slate-500">${safePhone}</div>`
            : '<span class="text-slate-400 text-xs">Aucun numero</span>';

        return `
            <tr>
                <td class="px-4 py-3"><strong>${escapeHtml(ticket.number || 'N/A')}</strong></td>
                <td class="px-4 py-3">${escapeHtml(status)}</td>
                <td class="px-4 py-3">${clientName}</td>
                <td class="px-4 py-3">${contactHtml}</td>
                <td class="px-4 py-3">${escapeHtml(ticket.priority || 'normal')}</td>
                <td class="px-4 py-3">${ticket.created_at ? formatTime(ticket.created_at) : 'N/A'}</td>
                <td class="px-4 py-3">
                    <select onchange="handleUpdateTicketStatus('${ticket.id}', this.value)">
                        <option value="waiting" ${status === 'waiting' ? 'selected' : ''}>En attente</option>
                        <option value="called" ${status === 'called' ? 'selected' : ''}>Appele</option>
                        <option value="served" ${status === 'served' ? 'selected' : ''}>Servi</option>
                        <option value="missed" ${status === 'missed' ? 'selected' : ''}>Absent</option>
                        <option value="cancelled" ${status === 'cancelled' ? 'selected' : ''}>Annule</option>
                    </select>
                </td>
            </tr>
        `;
    }).join('');
}

function updateStatsUI({ waiting, called, served, missed }) {
    const waitingEl = document.getElementById('waitingCount');
    const calledEl = document.getElementById('calledCount');
    const servedEl = document.getElementById('servedCount');
    const missedEl = document.getElementById('missedCount');

    if (waitingEl) waitingEl.textContent = String(waiting.length);
    if (calledEl) calledEl.textContent = String(called.length);
    if (servedEl) servedEl.textContent = String(served.length);
    if (missedEl) missedEl.textContent = String(missed.length);
}

function updateCurrentTicketUI(ticket) {
    const numberEl = document.getElementById('currentTicketNumber');
    const statusEl = document.getElementById('currentTicketStatus');
    const counterEl = document.getElementById('currentTicketCounter');

    if (!numberEl || !statusEl) return;

    const counterLabel = pageState.selectedCounter
        ? `Guichet ${pageState.selectedCounter}`
        : 'Guichet -';

    if (counterEl) {
        counterEl.textContent = counterLabel;
    }

    if (!pageState.selectedCounter) {
        numberEl.textContent = '-';
        statusEl.textContent = 'Selectionnez un guichet';
        return;
    }

    if (!ticket) {
        numberEl.textContent = '-';
        statusEl.textContent = 'Aucun ticket pour ce guichet';
        return;
    }

    numberEl.textContent = ticket.number || '-';
    statusEl.textContent = ticket.status === 'called' ? 'Appele' : (ticket.status || 'En cours');
}

function updateActionButtonsState() {
    const callBtn = document.getElementById('callBtn');
    const serveBtn = document.getElementById('serveBtn');
    const missBtn = document.getElementById('missBtn');

    const hasQueue = !!pageState.selectedQueueId;
    const hasWaiting = pageState.tickets && pageState.tickets.length > 0;
    const hasCurrent = !!pageState.currentTicketId;
    const hasCounter = !!pageState.selectedCounter;

    if (callBtn) callBtn.disabled = !hasQueue || !hasCounter || !hasWaiting || hasCurrent;
    if (serveBtn) serveBtn.disabled = !hasQueue || !hasCounter || !hasCurrent;
    if (missBtn) missBtn.disabled = !hasQueue || !hasCounter || !hasCurrent;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTime(timestamp) {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('fr-FR');
}

async function loadManageTicketsPage() {
    try {
        pageState.isLoading = true;

        if (!state.getToken()) {
            window.location.href = 'sign-in.html';
            return;
        }

        populateCounterSelect();
        updateSyncBanner();

        let establishments = [];

        try {
            establishments = await EstablishmentService.getEstablishments();
            writeEstablishmentsCache(establishments);
            setConnectionLost(false);
        } catch (error) {
            if (isOfflineError(error)) {
                setConnectionLost(true);
                establishments = readEstablishmentsCache();
                showToast('Connexion perdue: etablissements recuperes depuis le cache.', 'warning');
            } else {
                throw error;
            }
        }

        if (!Array.isArray(establishments) || establishments.length === 0) {
            showToast('Aucun etablissement disponible', 'warning');
            return;
        }

        pageState.selectedEstId = pageState.selectedEstId || establishments[0].id;
        populateEstablishmentsSelect(establishments);

        await loadQueuesForSelectedEstablishment();
        await syncPendingActions();
    } catch (error) {
        console.error('[MANAGE-TICKETS] Load error:', error);
        showToast('Erreur lors du chargement', 'error');
    } finally {
        pageState.isLoading = false;
    }
}

function startBackgroundWatchers() {
    window.addEventListener('online', async () => {
        setConnectionLost(false);
        await syncPendingActions();
        if (pageState.selectedQueueId) {
            await loadTicketsForQueue(pageState.selectedQueueId, { silentError: true });
        }
    });

    window.addEventListener('offline', () => {
        setConnectionLost(true);
    });

    if (pageState.syncTimer) clearInterval(pageState.syncTimer);
    pageState.syncTimer = setInterval(syncPendingActions, 6000);

    if (pageState.refreshTimer) clearInterval(pageState.refreshTimer);
    pageState.refreshTimer = setInterval(() => {
        if (!document.hidden && pageState.selectedQueueId) {
            loadTicketsForQueue(pageState.selectedQueueId, { silentError: true });
        }
    }, 10000);
}

// ===== PAGE INITIALIZATION =====
function initManageTicketsPage() {
    if (manageTicketsInitialized) return;
    manageTicketsInitialized = true;

    AuthService.requireAuth('sign-in.html');
    startBackgroundWatchers();
    loadManageTicketsPage();
}

window.initManageTicketsPage = initManageTicketsPage;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initManageTicketsPage);
} else {
    initManageTicketsPage();
}

window.addEventListener('beforeunload', function onUnload() {
    if (typeof pageState.realtimeUnsubscribe === 'function') {
        pageState.realtimeUnsubscribe();
    }
    if (pageState.syncTimer) clearInterval(pageState.syncTimer);
    if (pageState.refreshTimer) clearInterval(pageState.refreshTimer);
});

// ===== ADD BUTTON STYLES =====
const style = document.createElement('style');
style.textContent = `
    #ticketsTable select {
        padding: 6px 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
        min-width: 108px;
    }
`;
document.head.appendChild(style);
