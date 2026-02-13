/**
 * CLIENT WAITING SCREEN PAGE WITH OFFLINE FALLBACK
 */

const WAITING_CACHE_PREFIX = "waqtek_waiting_cache_";

const pageState = {
    allTickets: [],
    queue: null,
    establishment: null,
    queueId: null,
    isLoading: false,
    refreshInterval: null,
    connectionLost: false
};

function cacheKey(queueId) {
    return `${WAITING_CACHE_PREFIX}${queueId}`;
}

function readCachedTickets(queueId) {
    if (!queueId) return [];
    try {
        const raw = localStorage.getItem(cacheKey(queueId));
        const data = raw ? JSON.parse(raw) : [];
        return Array.isArray(data) ? data : [];
    } catch (_) {
        return [];
    }
}

function writeCachedTickets(queueId, tickets) {
    if (!queueId) return;
    try {
        const list = Array.isArray(tickets) ? tickets : [];
        localStorage.setItem(cacheKey(queueId), JSON.stringify(list.slice(0, 60)));
    } catch (_) {}
}

function setConnectionLost(value) {
    pageState.connectionLost = !!value;
}

function isOfflineError(error) {
    if (!error) return false;
    if (!navigator.onLine) return true;
    if (!error.status) return true;
    const message = String(error.message || "").toLowerCase();
    return message.includes("network") || message.includes("fetch") || message.includes("timeout");
}

async function loadWaitingScreen() {
    try {
        pageState.isLoading = true;

        const params = new URLSearchParams(window.location.search);
        const queueId = params.get("queueId") || state.getSelectedQueue();
        pageState.queueId = queueId;

        if (!queueId) {
            showScreenMessage("Configuration manquante", "Veuillez specifier un ID de file");
            return;
        }

        try {
            const queue = await QueueService.getQueue(queueId);
            pageState.queue = queue;

            const queueEstId = queue?.establishment_id || queue?.establishmentid || queue?.establishmentId;
            if (queueEstId) {
                try {
                    pageState.establishment = await EstablishmentService.getEstablishment(queueEstId);
                } catch (_) {}
            }
            setConnectionLost(false);
        } catch (error) {
            if (isOfflineError(error)) {
                setConnectionLost(true);
            } else {
                console.error("[WAITING-SCREEN] Queue info error:", error);
            }
        }

        await loadWaitingTickets(queueId);
        setupRealtimeUpdates(queueId);
        startAutoRefresh(queueId);
    } catch (error) {
        console.error("[WAITING-SCREEN] Load error:", error);
        showScreenMessage("Erreur de chargement", error.message || "Erreur inconnue");
    } finally {
        pageState.isLoading = false;
    }
}

async function loadWaitingTickets(queueId) {
    try {
        const tickets = await QueueService.getWaitingTickets(queueId);
        pageState.allTickets = tickets || [];
        writeCachedTickets(queueId, pageState.allTickets);
        setConnectionLost(false);
        updateWaitingScreenUI();
    } catch (error) {
        if (isOfflineError(error)) {
            setConnectionLost(true);
            const cached = readCachedTickets(queueId);
            if (cached.length > 0) {
                pageState.allTickets = cached;
                updateWaitingScreenUI();
                return;
            }
        }
        console.error("[WAITING-SCREEN] Load tickets error:", error);
        showToast("Connexion perdue: affichage des dernieres donnees disponibles.", "warning");
        updateWaitingScreenUI();
    }
}

function setupRealtimeUpdates(queueId) {
    try {
        RealtimeService.subscribeToQueue(queueId, () => {
            loadWaitingTickets(queueId);
        });
    } catch (error) {
        console.error("[WAITING-SCREEN] Real-time error:", error);
    }
}

function startAutoRefresh(queueId) {
    pageState.refreshInterval = setInterval(() => {
        loadWaitingTickets(queueId);
    }, 5000);
}

function buildConnectionBannerHtml() {
    if (!pageState.connectionLost) return "";
    return `
        <div style="margin: 0 0 16px 0; padding: 14px; border-radius: 10px; background: #fff3cd; border-left: 6px solid #ff9800;">
            <strong style="display:block; color:#8a6d3b; font-size:18px;">Connexion internet perdue</strong>
            <span style="color:#8a6d3b; font-size:15px;">Le systeme continue en mode hors-ligne. Merci de vous rapprocher de l'etablissement. Synchronisation automatique des que la connexion revient.</span>
        </div>
    `;
}

function updateWaitingScreenUI() {
    const container = document.getElementById("waitingScreenContent");
    if (!container) return;

    const waiting = pageState.allTickets.filter((t) => (t.status || "waiting") === "waiting").slice(0, 20);
    const called = pageState.allTickets.filter((t) => t.status === "called").slice(0, 5);

    let html = buildConnectionBannerHtml();

    if (pageState.establishment) {
        html += `
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="margin: 0; font-size: 48px; color: #d40000;">
                    ${escapeHtml(pageState.establishment.name || "Accueil")}
                </h1>
                <p style="margin: 10px 0 0 0; font-size: 24px; color: #666;">
                    File d'attente
                </p>
            </div>
        `;
    }

    if (called.length > 0) {
        html += `
            <div style="margin-bottom: 40px; padding: 30px; background: #ffe8e8; border-radius: 10px; border-left: 8px solid #d40000;">
                <p style="margin: 0 0 20px 0; font-size: 20px; color: #666; text-transform: uppercase; letter-spacing: 2px;">
                    Tickets appeles
                </p>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px;">
        `;
        called.forEach((ticket) => {
            html += `
                <div style="background: white; padding: 30px; border-radius: 8px; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,.1);">
                    <div style="font-size: 64px; font-weight: bold; color: #d40000; margin: 0;">
                        ${escapeHtml(ticket.number || "???")}
                    </div>
                    <p style="margin: 15px 0 0 0; font-size: 18px; color: #666;">
                        Comptoir: ${escapeHtml(ticket.counter || "-")}
                    </p>
                </div>
            `;
        });
        html += `</div></div>`;
    }

    if (waiting.length > 0) {
        html += `
            <div>
                <p style="margin: 0 0 20px 0; font-size: 20px; color: #666; text-transform: uppercase; letter-spacing: 2px;">
                    Prochains tickets (${waiting.length})
                </p>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 15px;">
        `;
        waiting.forEach((ticket, idx) => {
            const bgColor = idx === 0 ? "#e3f2fd" : "#f9f9f9";
            html += `
                <div style="background: ${bgColor}; padding: 20px; border-radius: 8px; text-align: center; border: ${idx === 0 ? "3px solid #2196f3" : "none"};">
                    <div style="font-size: 40px; font-weight: bold; color: #2196f3;">
                        ${escapeHtml(ticket.number || "???")}
                    </div>
                    <small style="color: #999;">Position: ${idx + 1}</small>
                </div>
            `;
        });
        html += `</div></div>`;
    } else {
        html += `
            <div style="text-align: center; padding: 60px 20px;">
                <p style="font-size: 32px; color: #4caf50;">Aucun ticket en attente</p>
            </div>
        `;
    }

    container.innerHTML = html;
}

function showScreenMessage(title, message) {
    const container = document.getElementById("waitingScreenContent");
    if (container) {
        container.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100vh; text-align: center;">
                <div>
                    <h1 style="font-size: 48px; margin-bottom: 20px;">${escapeHtml(title)}</h1>
                    <p style="font-size: 24px; color: #666;">${escapeHtml(message)}</p>
                </div>
            </div>
        `;
    }
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

document.addEventListener("DOMContentLoaded", function () {
    document.body.style.background = "#fff";
    document.body.style.margin = "0";
    document.body.style.padding = "20px";

    loadWaitingScreen();

    window.addEventListener("online", () => {
        setConnectionLost(false);
        if (pageState.queueId) {
            loadWaitingTickets(pageState.queueId);
        }
    });
    window.addEventListener("offline", () => {
        setConnectionLost(true);
        updateWaitingScreenUI();
    });

    if (navigator.wakeLock) {
        navigator.wakeLock.request("screen").catch(() => {});
    }
});

window.addEventListener("beforeunload", function () {
    if (pageState.refreshInterval) {
        clearInterval(pageState.refreshInterval);
    }
});
