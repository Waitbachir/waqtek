const state = {
    token: null,
    deviceId: null,
    claimed: false,
    pollTimer: null
};

const DEVICE_KEY = "waqtek_remote_tracker_device_v1";

function apiBase() {
    const protocol = window.location.protocol === "https:" ? "https" : "http";
    const host = window.location.hostname || "localhost";
    return `${protocol}://${host}:5000/api`;
}

function getTokenFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("token") || "";
}

function getOrCreateDeviceId() {
    const existing = localStorage.getItem(DEVICE_KEY);
    if (existing) return existing;
    const value = (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
        ? crypto.randomUUID()
        : `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(DEVICE_KEY, value);
    return value;
}

function setStatus(text, type = "pending") {
    const el = document.getElementById("status");
    if (!el) return;
    el.className = `status ${type}`;
    el.textContent = text;
}

function setPosition(position, waitingCount) {
    const posEl = document.getElementById("positionValue");
    const waitingEl = document.getElementById("waitingValue");
    if (posEl) posEl.textContent = position ?? "-";
    if (waitingEl) waitingEl.textContent = waitingCount ?? "-";
}

function setTicketNumber(ticketNumber) {
    const el = document.getElementById("ticketNumberValue");
    if (el) el.textContent = ticketNumber || "-";
}

async function claimToken() {
    try {
        const response = await fetch(`${apiBase()}/tickets/public/remote-access/claim`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                token: state.token,
                id_device: state.deviceId
            })
        });
        const data = await response.json();
        if (!response.ok) {
            if (data?.error === "DEVICE_NOT_ALLOWED") {
                setStatus("Ce ticket est deja utilise sur un autre smartphone.", "error");
                return false;
            }
            if (data?.error === "TOKEN_EXPIRED") {
                setStatus("Ce ticket n'est plus valide (deja appele ou termine).", "error");
                return false;
            }
            setStatus(`Activation impossible: ${data?.error || "Erreur"}`, "error");
            return false;
        }
        state.claimed = true;
        setStatus("Ticket actif. Recuperation de votre position...", "ok");
        return true;
    } catch (_) {
        setStatus("Connexion perdue. Nouvelle tentative...", "pending");
        return false;
    }
}

async function refreshPosition() {
    if (!state.claimed) return;
    try {
        const url = `${apiBase()}/tickets/public/remote-access/position?token=${encodeURIComponent(state.token)}&id_device=${encodeURIComponent(state.deviceId)}`;
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            if (data?.error === "POSITION_ONLY_WHEN_WAITING") {
                setStatus("Le ticket a ete appele. Ce lien est maintenant expire.", "error");
                if (state.pollTimer) {
                    clearInterval(state.pollTimer);
                    state.pollTimer = null;
                }
                return;
            }
            if (data?.error === "DEVICE_NOT_ALLOWED") {
                setStatus("Ce ticket est deja utilise sur un autre smartphone.", "error");
                return;
            }
            if (data?.error === "TOKEN_INVALID") {
                setStatus("Lien invalide.", "error");
                return;
            }
            setStatus("Synchronisation en cours...", "pending");
            return;
        }

        setPosition(data?.position, data?.waitingCount);
        setTicketNumber(data?.ticketNumber);
        setStatus("Position synchronisee", "ok");
    } catch (_) {
        setStatus("Connexion perdue. Nouvelle tentative...", "pending");
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    state.token = getTokenFromUrl();
    state.deviceId = getOrCreateDeviceId();

    if (!state.token) {
        setStatus("Lien invalide: token manquant.", "error");
        return;
    }

    const claimed = await claimToken();
    if (!claimed) return;

    await refreshPosition();
    state.pollTimer = setInterval(refreshPosition, 5000);
});

window.addEventListener("beforeunload", () => {
    if (state.pollTimer) {
        clearInterval(state.pollTimer);
        state.pollTimer = null;
    }
});
