(function () {
    function getEl(id) { return document.getElementById(id); }

    function escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text ?? "";
        return div.innerHTML;
    }

    async function loadData() {
        try {
            const [stats, establishments, queues] = await Promise.all([
                StatsService.loadDashboard().catch(() => ({})),
                EstablishmentService.getEstablishments().catch(() => []),
                QueueService.getQueues().catch(() => [])
            ]);

            const estList = EstablishmentService.filterByCurrentUser(establishments || []);
            getEl("estCount").textContent = String(estList.length || 0);
            getEl("queueCount").textContent = String((queues || []).length || 0);
            getEl("ticketCount").textContent = String(stats?.ticketsToday || 0);
            getEl("planName").textContent = stats?.plan || "Standard";

            const tbody = getEl("estTable");
            if (!estList.length) {
                tbody.innerHTML = "<tr><td colspan=\"3\">Aucun etablissement</td></tr>";
                return;
            }
            tbody.innerHTML = estList.slice(0, 8).map((est) => `
                <tr>
                    <td>${escapeHtml(est.name || "-")}</td>
                    <td>${escapeHtml(est.address || "-")}</td>
                    <td>${est.created_at ? new Date(est.created_at).toLocaleDateString("fr-FR") : "-"}</td>
                </tr>
            `).join("");
        } catch (error) {
            console.error("[ADMIN-DASHBOARD] load failed", error);
            if (typeof showToast === "function") showToast("Erreur chargement dashboard admin", "error");
        }
    }

    function bindEvents() {
        const logoutBtn = getEl("logoutBtn");
        logoutBtn?.addEventListener("click", async () => {
            try {
                await AuthService.logout();
            } finally {
                window.location.href = "sign-in.html";
            }
        });
    }

    async function init() {
        if (!AuthService.requireAuth("sign-in.html")) return;
        bindEvents();
        await loadData();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
