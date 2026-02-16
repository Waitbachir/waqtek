(function () {
    const MANAGER_CONTEXT_KEY = "waqtek_manager_context_v1";

    const stateLocal = {
        establishment: null,
        queues: [],
        selectedQueue: null,
        selectedCounter: null
    };

    function getEl(id) { return document.getElementById(id); }

    function escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text ?? "";
        return div.innerHTML;
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

    async function openCounterModal(queue) {
        stateLocal.selectedQueue = queue;
        stateLocal.selectedCounter = null;
        const modal = getEl("counterModal");
        const title = getEl("modalTitle");
        const grid = getEl("counterGrid");
        const confirmBtn = getEl("confirmCounterBtn");
        if (!modal || !title || !grid || !confirmBtn) return;

        title.textContent = `Queue: ${queue.name || queue.id} - Choisir un guichet libre`;
        confirmBtn.disabled = true;

        modal.classList.add("show");
        modal.setAttribute("aria-hidden", "false");

        try {
            grid.innerHTML = `<p style="margin:0;color:#5d778e;">Chargement des guichets disponibles...</p>`;
            const freeCounters = await QueueService.getAvailableCounters(queue.id);
            if (!Array.isArray(freeCounters) || freeCounters.length === 0) {
                grid.innerHTML = `<p style="margin:0;color:#5d778e;">Aucun guichet disponible pour le moment.</p>`;
                return;
            }

            grid.innerHTML = freeCounters.map((number) => `
                <button class="counter" data-counter="${number}" type="button">
                    Guichet ${number}
                </button>
            `).join("");

            grid.querySelectorAll(".counter").forEach((btn) => {
                btn.addEventListener("click", () => {
                    grid.querySelectorAll(".counter").forEach((el) => el.classList.remove("selected"));
                    btn.classList.add("selected");
                    stateLocal.selectedCounter = Number(btn.getAttribute("data-counter"));
                    confirmBtn.disabled = false;
                });
            });
        } catch (error) {
            console.error("[MANAGER-DASHBOARD] counters load failed", error);
            grid.innerHTML = `<p style="margin:0;color:#b91c1c;">Erreur chargement guichets.</p>`;
        }
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
        const profile = await AuthService.getMe().catch(() => ({}));
        const user = profile?.user || state?.getUser?.() || {};
        const userEmail = String(user?.email || "").toLowerCase();
        const userEstId = user?.id_etab || user?.establishment_id || user?.establishmentId || user?.establishmentid || null;

        const establishments = await EstablishmentService.getEstablishments();
        const list = Array.isArray(establishments) ? establishments : [];

        const byIdEtab = userEstId
            ? list.find((est) => String(est?.id) === String(userEstId))
            : null;

        const byManagerEmail = userEmail
            ? list.find((est) => {
                const managerEmail = String(est?.manager_email || est?.managerEmail || est?.owner_email || "").toLowerCase();
                return managerEmail && managerEmail === userEmail;
            })
            : null;

        const fallbackScoped = EstablishmentService.filterByCurrentUser(list);
        stateLocal.establishment = byIdEtab || byManagerEmail || fallbackScoped[0] || list[0] || null;
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
        getEl("confirmCounterBtn")?.addEventListener("click", async () => {
            if (!stateLocal.selectedQueue || !stateLocal.selectedCounter) return;
            const confirmBtn = getEl("confirmCounterBtn");
            if (confirmBtn) confirmBtn.disabled = true;

            try {
                await QueueService.saveManagerContext(stateLocal.selectedQueue.id, stateLocal.selectedCounter);
                persistManagerContext();
                closeCounterModal();
                window.location.href = "ticket-management.html";
            } catch (error) {
                console.error("[MANAGER-DASHBOARD] save context failed", error);
                if (error?.status === 409) {
                    showToast("Ce guichet vient d'etre occupe. Choisissez un autre guichet.", "warning");
                    await openCounterModal(stateLocal.selectedQueue);
                } else {
                    showToast("Impossible de sauvegarder le contexte manager", "error");
                }
            } finally {
                if (confirmBtn) confirmBtn.disabled = false;
            }
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
