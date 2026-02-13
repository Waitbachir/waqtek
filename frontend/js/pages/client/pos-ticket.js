const posState = {
    establishments: [],
    queues: [],
    selectedEstablishmentId: null,
    selectedQueueId: null,
    syncInProgress: false,
    syncTimer: null
};

const POS_LOGIN_URL = "./enterprise/sign-in.html";
const PENDING_SYNC_KEY = "waqtek_pos_pending_sync_v1";
const OFFLINE_COUNTER_KEY = "waqtek_pos_offline_counter_v1";
const WAITING_CACHE_PREFIX = "waqtek_waiting_cache_";
const OFFLINE_TICKET_MAP_KEY = "waqtek_offline_ticket_map_v1";

function getEl(id) {
    return document.getElementById(id);
}

function safeParseJson(raw, fallback = null) {
    try {
        return JSON.parse(raw);
    } catch (_) {
        return fallback;
    }
}

function getPendingSyncQueue() {
    return safeParseJson(localStorage.getItem(PENDING_SYNC_KEY), []) || [];
}

function setPendingSyncQueue(items) {
    localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(items || []));
}

function pushPendingSync(item) {
    const queue = getPendingSyncQueue();
    queue.push(item);
    setPendingSyncQueue(queue);
    updateSyncInfo();
}

function getNextOfflineNumber() {
    const current = Number(localStorage.getItem(OFFLINE_COUNTER_KEY) || "0");
    const next = current + 1;
    localStorage.setItem(OFFLINE_COUNTER_KEY, String(next));
    return `OFF-${next}`;
}

function cacheTicketForWaiting(queueId, ticket) {
    if (!queueId || !ticket) return;
    const key = `${WAITING_CACHE_PREFIX}${queueId}`;
    const current = safeParseJson(localStorage.getItem(key), []);
    const list = Array.isArray(current) ? current : [];
    list.unshift(ticket);
    localStorage.setItem(key, JSON.stringify(list.slice(0, 40)));
}

function removeOfflineTicketFromCache(queueId, offlineTicketId) {
    if (!queueId || !offlineTicketId) return;
    const key = `${WAITING_CACHE_PREFIX}${queueId}`;
    const current = safeParseJson(localStorage.getItem(key), []);
    const list = Array.isArray(current) ? current : [];
    const filtered = list.filter((t) => t.id !== offlineTicketId);
    localStorage.setItem(key, JSON.stringify(filtered));
}

function appendServerTicketToCache(queueId, ticket) {
    cacheTicketForWaiting(queueId, ticket);
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

function redirectToLogin() {
    const target = `${window.location.pathname}${window.location.search || ""}`;
    window.location.href = `${POS_LOGIN_URL}?redirect=${encodeURIComponent(target)}`;
}

function ensureAuthenticated() {
    const token = state?.getToken?.();
    if (!token) {
        redirectToLogin();
        return false;
    }
    return true;
}

function updateSyncBanner() {
    const banner = getEl("syncBanner");
    if (!banner) return;
    const pending = getPendingSyncQueue().length;

    if (navigator.onLine) {
        banner.className = "online";
        banner.textContent = pending > 0
            ? `Connexion retablie. Synchronisation de ${pending} ticket(s) en cours.`
            : "Connexion active.";
    } else {
        banner.className = "offline";
        banner.textContent = "Connexion perdue. Le mode hors-ligne est actif. Merci de vous rapprocher de l'etablissement.";
    }
}

function updateSyncInfo() {
    const syncInfo = getEl("syncInfo");
    if (!syncInfo) return;
    const pending = getPendingSyncQueue().length;
    syncInfo.textContent = pending > 0
        ? `${pending} ticket(s) en attente de synchronisation vers la base.`
        : "Aucun ticket en attente de synchronisation.";
    updateSyncBanner();
}

function openRemoteModal() {
    const modal = getEl("remoteConfirmModal");
    if (modal) {
        modal.classList.add("show");
        modal.setAttribute("aria-hidden", "false");
    }
}

function closeRemoteModal() {
    const modal = getEl("remoteConfirmModal");
    if (modal) {
        modal.classList.remove("show");
        modal.setAttribute("aria-hidden", "true");
    }
}

function setQueueSelectDisabled(disabled) {
    const queueSelect = getEl("queueSelect");
    if (queueSelect) {
        queueSelect.disabled = !!disabled;
    }
}

function renderEstablishments() {
    const select = getEl("establishmentSelect");
    if (!select) return;

    select.innerHTML = '<option value="">Selectionner un etablissement</option>';
    posState.establishments.forEach((est) => {
        const option = document.createElement("option");
        option.value = est.id;
        option.textContent = est.name || est.id;
        select.appendChild(option);
    });
}

function renderQueues() {
    const select = getEl("queueSelect");
    if (!select) return;

    select.innerHTML = '<option value="">Selectionner une queue</option>';
    posState.queues.forEach((queue) => {
        const option = document.createElement("option");
        option.value = queue.id;
        option.textContent = queue.name || queue.id;
        select.appendChild(option);
    });
}

async function loadEstablishmentsForConnectedAccount() {
    try {
        const list = await EstablishmentService.getEstablishments();
        const filtered = EstablishmentService.filterByCurrentUser(list);
        posState.establishments = Array.isArray(filtered) ? filtered : [];
        renderEstablishments();
    } catch (error) {
        console.error("[POS-TICKET] Erreur chargement etablissements:", error);
        if (error?.status === 401 || error?.status === 403) {
            redirectToLogin();
            return;
        }
        showToast("Impossible de charger les etablissements", "error");
    }
}

async function loadQueuesForConnectedAccount(establishmentId) {
    if (!establishmentId) {
        posState.queues = [];
        renderQueues();
        setQueueSelectDisabled(true);
        return;
    }

    try {
        const list = await QueueService.getQueuesByEstablishment(establishmentId);
        posState.queues = Array.isArray(list) ? list : [];
        renderQueues();
        setQueueSelectDisabled(false);
    } catch (error) {
        console.error("[POS-TICKET] Erreur chargement queues:", error);
        if (error?.status === 401 || error?.status === 403) {
            redirectToLogin();
            return;
        }
        showToast("Impossible de charger les queues", "error");
        posState.queues = [];
        renderQueues();
        setQueueSelectDisabled(true);
    }
}

function displayTicketResult(ticket, remoteAccess, isOffline = false) {
    const ticketBox = getEl("ticketBox");
    const ticketNumber = getEl("ticketNumber");
    const ticketMeta = getEl("ticketMeta");

    if (!ticketBox || !ticketNumber || !ticketMeta) return;

    const estName = posState.establishments.find((e) => e.id === posState.selectedEstablishmentId)?.name || "-";
    const queueName = posState.queues.find((q) => q.id === posState.selectedQueueId)?.name || "-";
    const mode = remoteAccess ? "VIP (acces distant)" : "PST (local)";
    const syncState = isOffline ? "HORS-LIGNE: a synchroniser" : "Synchronise";

    ticketNumber.textContent = ticket?.number || "---";
    ticketMeta.textContent = `${estName} | ${queueName} | ${mode} | ${syncState}`;
    ticketBox.classList.add("show");
}

function getSelectedLabels() {
    const estSelect = getEl("establishmentSelect");
    const queueSelect = getEl("queueSelect");
    const estNameFromSelect = estSelect?.selectedOptions?.[0]?.textContent?.trim() || "";
    const queueNameFromSelect = queueSelect?.selectedOptions?.[0]?.textContent?.trim() || "";
    const estNameFromState = posState.establishments.find((e) => String(e.id) === String(posState.selectedEstablishmentId))?.name || "";
    const queueNameFromState = posState.queues.find((q) => String(q.id) === String(posState.selectedQueueId))?.name || "";
    const estName = estNameFromSelect || estNameFromState || String(posState.selectedEstablishmentId || "");
    const queueName = queueNameFromSelect || queueNameFromState || String(posState.selectedQueueId || "");
    return { estName, queueName };
}

function openPrintWindowForFreeTicket() {
    const popup = window.open("", "_blank", "width=420,height=640");
    if (!popup) {
        showToast("Popup bloquee: autorisez les popups pour imprimer le ticket.", "warning");
    }
    return popup;
}

function renderAndPrintFreeTicket(ticket, context = {}, printWindowRef = null) {
    const win = printWindowRef || openPrintWindowForFreeTicket();
    if (!win) return;

    const estName = context.estName || "-";
    const queueName = context.queueName || "-";
    const createdAt = new Date(ticket?.created_at || Date.now()).toLocaleString("fr-FR");
    const printDate = new Date().toLocaleString("fr-FR");
    const modeText = context.isOffline ? "LOCAL HORS-LIGNE (a synchroniser)" : "LOCAL GRATUIT";

    win.document.write(`
        <html>
        <head>
            <title>Ticket Gratuit WaQtek</title>
            <style>
                @page { size: 75mm 101.6mm; margin: 0; }
                html, body {
                    width: 75mm;
                    height: 101.6mm;
                    margin: 0;
                    padding: 0;
                    background: #fff;
                }
                body {
                    font-family: Arial, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: flex-start;
                }
                .ticket {
                    width: 73mm; margin: 0; background:#fff; border:1px solid #222;
                    border-radius: 2mm; padding: 2mm; color:#111; box-sizing: border-box;
                }
                .brand { text-align:center; border-bottom:1px dashed #666; padding-bottom:1.5mm; margin-bottom:1.5mm; }
                .brand h2 { margin:0; font-size:16px; letter-spacing:1px; }
                .brand p { margin:1mm 0 0; font-size:10px; color:#555; }
                .row { display:flex; justify-content:space-between; margin:0.8mm 0; font-size:10px; }
                .label { color:#666; }
                .value { font-weight:700; text-align:right; max-width:60%; word-break:break-word; }
                .number { text-align:center; margin:1.5mm 0; font-size:34px; font-weight:800; color:#b00000; }
                .msg { font-size:10px; margin:1.2mm 0; text-align:center; }
                .guide { font-size:9px; color:#333; margin-top:1mm; }
                .guide p { margin:0.5mm 0; }
                .footer { font-size:8px; color:#666; text-align:center; margin-top:1mm; }
            </style>
        </head>
        <body>
            <div class="ticket">
                <div class="brand">
                    <h2>WAQTEK</h2>
                    <p>Ticket local sans acces distant</p>
                </div>

                <div class="row"><span class="label">Etablissement</span><span class="value">${estName}</span></div>
                <div class="row"><span class="label">Queue</span><span class="value">${queueName}</span></div>
                <div class="row"><span class="label">Date ticket</span><span class="value">${createdAt}</span></div>
                <div class="row"><span class="label">Imprime le</span><span class="value">${printDate}</span></div>
                <div class="row"><span class="label">Mode</span><span class="value">${modeText}</span></div>

                <div class="number">${ticket?.number || "-"}</div>

                <div class="msg">
                    Ce ticket est gratuit et ne permet pas le suivi a distance.
                </div>

                <div class="guide">
                    <p>1. Conservez ce ticket jusqu'a votre appel.</p>
                    <p>2. Suivez votre numero sur l'ecran d'attente.</p>
                    <p>3. Presentez-vous au guichet lors de l'appel.</p>
                </div>

                <div class="footer">Merci de votre visite.</div>
            </div>
        </body>
        </html>
    `);
    win.document.close();
    win.focus();
    win.print();
}

function redirectToPaymentWaiting(ticket, amount) {
    const { estName, queueName } = getSelectedLabels();
    const issueDate = ticket?.created_at || new Date().toISOString();
    const params = new URLSearchParams({
        ticketId: ticket?.id || "",
        ticketNumber: ticket?.number || "",
        amount: String(amount || 50),
        estId: posState.selectedEstablishmentId || "",
        queueId: posState.selectedQueueId || "",
        estName,
        queueName,
        issueDate
    });

    window.location.href = `payment-pending.html?${params.toString()}`;
}

function isOfflineError(error) {
    if (!error) return false;
    if (!navigator.onLine) return true;
    if (!error.status) return true;
    const message = String(error.message || "").toLowerCase();
    return message.includes("network") || message.includes("fetch") || message.includes("timeout");
}

function buildOfflineTicket(remoteAccess) {
    const number = getNextOfflineNumber();
    return {
        id: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        number,
        status: "waiting",
        created_at: new Date().toISOString(),
        offline: true,
        remoteAccess: !!remoteAccess
    };
}

function enqueueOfflineCreation(remoteAccess, offlineTicket) {
    pushPendingSync({
        queueId: posState.selectedQueueId,
        establishmentId: posState.selectedEstablishmentId,
        remoteAccess: !!remoteAccess,
        createdAt: new Date().toISOString(),
        offlineTicketId: offlineTicket.id,
        offlineTicketNumber: offlineTicket.number
    });
}

async function syncPendingTickets() {
    if (posState.syncInProgress) return;
    if (!navigator.onLine) return;

    const pending = getPendingSyncQueue();
    if (!pending.length) {
        updateSyncInfo();
        return;
    }

    posState.syncInProgress = true;
    updateSyncInfo();

    const remaining = [];
    let syncedCount = 0;

    for (const item of pending) {
        try {
            const response = await apiClient.createPosTicketPublic(item.queueId, item.remoteAccess);
            const ticket = response?.ticket;
            if (ticket) {
                removeOfflineTicketFromCache(item.queueId, item.offlineTicketId);
                appendServerTicketToCache(item.queueId, ticket);
                saveOfflineTicketMapping(item.offlineTicketId, item.queueId, ticket);
                syncedCount += 1;
            } else {
                remaining.push(item);
            }
        } catch (error) {
            if (error?.status === 401 || error?.status === 403) {
                redirectToLogin();
                remaining.push(item);
                continue;
            }
            remaining.push(item);
            if (isOfflineError(error)) {
                break;
            }
        }
    }

    setPendingSyncQueue(remaining);
    if (syncedCount > 0) {
        showToast(`${syncedCount} ticket(s) synchronise(s)`, "success");
    }

    posState.syncInProgress = false;
    updateSyncInfo();
}

function startSyncWatcher() {
    window.addEventListener("online", () => {
        updateSyncInfo();
        syncPendingTickets();
    });
    window.addEventListener("offline", () => {
        updateSyncInfo();
    });

    if (posState.syncTimer) {
        clearInterval(posState.syncTimer);
    }
    posState.syncTimer = setInterval(syncPendingTickets, 7000);
}

async function createPosTicket(remoteAccess) {
    if (!posState.selectedEstablishmentId || !posState.selectedQueueId) {
        showToast("Veuillez selectionner l'etablissement et la queue", "warning");
        return;
    }

    const labels = getSelectedLabels();
    const printWindow = !remoteAccess ? openPrintWindowForFreeTicket() : null;

    try {
        const response = await apiClient.createPosTicketPublic(posState.selectedQueueId, remoteAccess);
        const ticket = response?.ticket;
        const esp32 = response?.esp32;

        if (!ticket) {
            showToast("Ticket non cree", "error");
            return;
        }

        appendServerTicketToCache(posState.selectedQueueId, ticket);
        displayTicketResult(ticket, remoteAccess, false);
        showToast(
            remoteAccess ? `Ticket VIP ${ticket.number} cree` : `Ticket PST ${ticket.number} cree`,
            "success"
        );

        if (esp32 && esp32.sent === false) {
            const reason = esp32.reason || esp32.error || `status ${esp32.status || "inconnu"}`;
            showToast(`Ticket cree mais envoi ESP32 echoue: ${reason}`, "warning");
            console.warn("[POS-TICKET] ESP32 send failed:", esp32);
        }

        if (remoteAccess) {
            setTimeout(() => redirectToPaymentWaiting(ticket, response?.paymentAmount || 50), 600);
        } else {
            renderAndPrintFreeTicket(ticket, { ...labels, isOffline: false }, printWindow);
        }
    } catch (error) {
        if (isOfflineError(error)) {
            const offlineTicket = buildOfflineTicket(remoteAccess);
            enqueueOfflineCreation(remoteAccess, offlineTicket);
            cacheTicketForWaiting(posState.selectedQueueId, offlineTicket);
            displayTicketResult(offlineTicket, remoteAccess, true);
            showToast("Connexion perdue: ticket cree en mode hors-ligne et mis en attente de synchronisation.", "warning");
            updateSyncInfo();
            if (remoteAccess) {
                setTimeout(() => redirectToPaymentWaiting(offlineTicket, 50), 600);
            } else {
                renderAndPrintFreeTicket(offlineTicket, { ...labels, isOffline: true }, printWindow);
            }
            return;
        }

        console.error("[POS-TICKET] Erreur creation ticket:", error);
        showToast(error.message || "Erreur creation ticket", "error");
    }
}

function bindEvents() {
    const estSelect = getEl("establishmentSelect");
    const queueSelect = getEl("queueSelect");
    const freeBtn = getEl("createFreeBtn");
    const remoteBtn = getEl("createRemoteBtn");
    const modalNoBtn = getEl("modalNoBtn");
    const modalYesBtn = getEl("modalYesBtn");
    const modal = getEl("remoteConfirmModal");

    if (estSelect) {
        estSelect.addEventListener("change", async (e) => {
            posState.selectedEstablishmentId = e.target.value || null;
            posState.selectedQueueId = null;
            await loadQueuesForConnectedAccount(posState.selectedEstablishmentId);
        });
    }

    if (queueSelect) {
        queueSelect.addEventListener("change", (e) => {
            posState.selectedQueueId = e.target.value || null;
        });
    }

    if (freeBtn) {
        freeBtn.addEventListener("click", () => createPosTicket(false));
    }

    if (remoteBtn) {
        remoteBtn.addEventListener("click", openRemoteModal);
    }

    if (modalNoBtn) {
        modalNoBtn.addEventListener("click", async () => {
            closeRemoteModal();
            await createPosTicket(false);
        });
    }

    if (modalYesBtn) {
        modalYesBtn.addEventListener("click", async () => {
            closeRemoteModal();
            await createPosTicket(true);
        });
    }

    if (modal) {
        modal.addEventListener("click", (e) => {
            if (e.target === modal) closeRemoteModal();
        });
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    if (!ensureAuthenticated()) return;
    setQueueSelectDisabled(true);
    bindEvents();
    startSyncWatcher();
    updateSyncInfo();
    await loadEstablishmentsForConnectedAccount();
    await syncPendingTickets();
});

window.addEventListener("beforeunload", () => {
    if (posState.syncTimer) {
        clearInterval(posState.syncTimer);
    }
});
