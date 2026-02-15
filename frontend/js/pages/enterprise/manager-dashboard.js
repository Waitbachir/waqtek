(function () {
    const MANAGER_CONTEXT_KEY = "waqtek_manager_context_v1";
    const COUNTER_STATE_KEY = "waqtek_counter_sessions_v1";
    const COUNTER_TTL_MS = 10 * 60 * 1000;

    const stateLocal = {
        establishment: null,
        queues: [],
        selectedQueue: null,
        selectedCounter: null
    };

    function getEl(id) { return document.getElementById(id); }

    function parseJson(raw, fallback) {
        try { return JSON.parse(raw); } catch (_) { return fallback; }
    }

    function escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text ?? "";
        return div.innerHTML;
    }

    function getCounterSessions() {
        const map = parseJson(localStorage.getItem(COUNTER_STATE_KEY), {}) || {};
        const now = Date.now();
        const next = {};
        Object.keys(map).forEach((k) => {
            if (map[k]?.expiresAt > now) next[k] = map[k];
        });
        localStorage.setItem(COUNTER_STATE_KEY, JSON.stringify(next));
        return next;
    }

    function reserveCounter(queueId, counterNumber) {
        const key = `${queueId}:${counterNumber}`;
        const sessions = getCounterSessions();
        sessions[key] = { expiresAt: Date.now() + COUNTER_TTL_MS };
        localStorage.setItem(COUNTER_STATE_KEY, JSON.stringify(sessions));
    }

    function loadFreeCounters(queueId) {
        const sessions = getCounterSessions();
        const counters = [];
        for (let i = 1; i <= 6; i += 1) {
            const key = `${queueId}:${i}`;
            counters.push({ number: i, occupied: !!sessions[key] });
        }
        return counters;
    }

    function renderQueues() {
        const grid = getEl("queuesGrid");
        const empty = getEl("emptyState");
        if (!grid || !empty) return;

        if (!stateLocal.queues.length) {
            grid.innerHTML = "";
            empty.style.display = "block";
            return;
        }

        empty.style.display = "none";
        grid.innerHTML = stateLocal.queues.map((q) => `
            <article class="queue" data-queue-id="${q.id}">
                <h3>${escapeHtml(q.name || `Queue ${q.id}`)}</h3>
                <p>${escapeHtml(q.description || "Cliquer pour choisir un guichet libre")}</p>
            </article>
        `).join("");

        grid.querySelectorAll(".queue").forEach((card) => {
            card.addEventListener("click", () => {
                const id = card.getAttribute("data-queue-id");
                const queue = stateLocal.queues.find((q) => String(q.id) === String(id));
                if (!queue) return;
                openCounterModal(queue);
            });
        });
    }

    function openCounterModal(queue) {
        stateLocal.selectedQueue = queue;
        stateLocal.selectedCounter = null;
        const modal = getEl("counterModal");
        const title = getEl("modalTitle");
        const grid = getEl("counterGrid");
        const confirmBtn = getEl("confirmCounterBtn");
        if (!modal || !title || !grid || !confirmBtn) return;

        title.textContent = `Queue: ${queue.name || queue.id} - Choisir un guichet libre`;
        confirmBtn.disabled = true;

        const counters = loadFreeCounters(queue.id);
        grid.innerHTML = counters.map((c) => `
            <button class="counter ${c.occupied ? "occupied" : ""}" data-counter="${c.number}" type="button" ${c.occupied ? "disabled" : ""}>
                Guichet ${c.number}
            </button>
        `).join("");

        grid.querySelectorAll(".counter:not(.occupied)").forEach((btn) => {
            btn.addEventListener("click", () => {
                grid.querySelectorAll(".counter").forEach((el) => el.classList.remove("selected"));
                btn.classList.add("selected");
                stateLocal.selectedCounter = Number(btn.getAttribute("data-counter"));
                confirmBtn.disabled = false;
            });
        });

        modal.classList.add("show");
        modal.setAttribute("aria-hidden", "false");
    }

    function closeCounterModal() {
        const modal = getEl("counterModal");
        if (!modal) return;
        modal.classList.remove("show");
        modal.setAttribute("aria-hidden", "true");
    }

    function persistManagerContext() {
        if (!stateLocal.establishment || !stateLocal.selectedQueue || !stateLocal.selectedCounter) return;
        localStorage.setItem(MANAGER_CONTEXT_KEY, JSON.stringify({
            establishmentId: stateLocal.establishment.id,
            queueId: stateLocal.selectedQueue.id,
            counter: stateLocal.selectedCounter,
            savedAt: new Date().toISOString()
        }));
    }

    async function loadQueues() {
        const est = stateLocal.establishment;
        if (!est?.id) {
            stateLocal.queues = [];
            renderQueues();
            return;
        }
        const queues = await QueueService.getQueuesByEstablishment(est.id);
        stateLocal.queues = Array.isArray(queues) ? queues : [];
        renderQueues();
    }

    async function loadContext() {
        const establishments = await EstablishmentService.getEstablishments();
        const scoped = EstablishmentService.filterByCurrentUser(establishments || []);
        stateLocal.establishment = scoped[0] || null;
        getEl("activeEst").textContent = stateLocal.establishment?.name || "Non configure";
        await loadQueues();
    }

    function bindEvents() {
        getEl("logoutBtn")?.addEventListener("click", async () => {
            try { await AuthService.logout(); } finally { window.location.href = "sign-in.html"; }
        });
        getEl("cancelCounterBtn")?.addEventListener("click", closeCounterModal);
        getEl("counterModal")?.addEventListener("click", (e) => {
            if (e.target?.id === "counterModal") closeCounterModal();
        });
        getEl("confirmCounterBtn")?.addEventListener("click", () => {
            if (!stateLocal.selectedQueue || !stateLocal.selectedCounter) return;
            reserveCounter(stateLocal.selectedQueue.id, stateLocal.selectedCounter);
            persistManagerContext();
            closeCounterModal();
            const params = new URLSearchParams({
                queueId: String(stateLocal.selectedQueue.id),
                counter: String(stateLocal.selectedCounter)
            });
            window.location.href = `ticket-management.html?${params.toString()}`;
        });
    }

    async function init() {
        if (!AuthService.requireAuth("sign-in.html")) return;
        bindEvents();
        try {
            await loadContext();
        } catch (error) {
            console.error("[MANAGER-DASHBOARD] init failed", error);
            if (typeof showToast === "function") showToast("Erreur chargement manager dashboard", "error");
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
