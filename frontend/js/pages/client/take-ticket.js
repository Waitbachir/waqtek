(function () {
    const POS_LOGIN_URL = "../enterprise/sign-in.html";
    const KIOSK_LANG_KEY = "waqtek_kiosk_lang_v1";

    const kioskState = {
        establishments: [],
        queues: [],
        selectedEstablishmentId: null,
        selectedQueueId: null
    };

    const i18n = {
        fr: {
            pageTitle: "Prendre un ticket | WaQtek",
            langLabel: "Langue",
            title: "Prendre un ticket",
            subtitle: "Selectionnez une queue pour continuer",
            contextTitle: "Etablissement actif",
            loadingContext: "Chargement...",
            noContext: "Aucun etablissement configure",
            waitingTitle: "En attente",
            waitingMessage: "Cliquez sur une queue pour prendre un ticket.",
            footerNote: "Ecran adapte aux tablettes et bornes tactiles.",
            successTitle: "Ticket cree",
            localCreated: "Votre ticket local est pret : {ticket}",
            remoteCreated: "Votre ticket avec acces distant est pret : {ticket}",
            createError: "Erreur creation ticket",
            missingContext: "Aucune queue disponible pour cet etablissement.",
            missingToken: "Session expiree, reconnectez-vous.",
            creatingLocal: "Creation ticket local en cours...",
            creatingRemote: "Creation ticket avec acces distant en cours...",
            printPopupBlocked: "Popup bloquee: autorisez les popups pour imprimer le ticket.",
            printMode: "LOCAL GRATUIT",
            printHint: "Conservez ce ticket jusqu'a l'appel.",
            queueEmpty: "Aucune queue disponible.",
            queueCardHint: "Toucher pour choisir le type de ticket",
            modalTitle: "Choisir le type de ticket",
            modalSubtitle: "Queue: {queue}",
            localBtn: "Ticket Local (gratuit)",
            remoteBtn: "Ticket avec acces distant (50 DA)",
            cancelBtn: "Annuler"
        },
        ar: {
            pageTitle: "\u0627\u0633\u062d\u0628 \u062a\u0630\u0643\u0631\u062a\u0643 | WaQtek",
            langLabel: "\u0627\u0644\u0644\u063a\u0629",
            title: "\u0627\u0633\u062d\u0628 \u062a\u0630\u0643\u0631\u062a\u0643",
            subtitle: "\u0627\u062e\u062a\u0631 \u0627\u0644\u0637\u0627\u0628\u0648\u0631 \u0644\u0644\u0645\u062a\u0627\u0628\u0639\u0629",
            contextTitle: "\u0627\u0644\u0645\u0624\u0633\u0633\u0629 \u0627\u0644\u0646\u0634\u0637\u0629",
            loadingContext: "\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u062d\u0645\u064a\u0644...",
            noContext: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0624\u0633\u0633\u0629 \u0645\u064f\u0647\u064a\u0623\u0629",
            waitingTitle: "\u0641\u064a \u0627\u0644\u0627\u0646\u062a\u0638\u0627\u0631",
            waitingMessage: "\u0627\u0636\u063a\u0637 \u0639\u0644\u0649 \u0637\u0627\u0628\u0648\u0631 \u0644\u0623\u062e\u0630 \u062a\u0630\u0643\u0631\u0629.",
            footerNote: "\u0627\u0644\u0634\u0627\u0634\u0629 \u0645\u0647\u064a\u0623\u0629 \u0644\u0644\u0623\u062c\u0647\u0632\u0629 \u0627\u0644\u0644\u0648\u062d\u064a\u0629 \u0648\u0623\u0643\u0634\u0627\u0643 \u0627\u0644\u0644\u0645\u0633.",
            successTitle: "\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062a\u0630\u0643\u0631\u0629",
            localCreated: "\u062a\u0630\u0643\u0631\u062a\u0643 \u0627\u0644\u0645\u062d\u0644\u064a\u0629 \u062c\u0627\u0647\u0632\u0629: {ticket}",
            remoteCreated: "\u062a\u0630\u0643\u0631\u062a\u0643 \u0645\u0639 \u0627\u0644\u0648\u0635\u0648\u0644 \u0627\u0644\u0628\u0639\u064a\u062f \u062c\u0627\u0647\u0632\u0629: {ticket}",
            createError: "\u062e\u0637\u0623 \u0623\u062b\u0646\u0627\u0621 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062a\u0630\u0643\u0631\u0629",
            missingContext: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0637\u0648\u0627\u0628\u064a\u0631 \u0645\u062a\u0627\u062d\u0629 \u0644\u0647\u0630\u0647 \u0627\u0644\u0645\u0624\u0633\u0633\u0629.",
            missingToken: "\u0627\u0646\u062a\u0647\u062a \u0627\u0644\u062c\u0644\u0633\u0629\u060c \u064a\u0631\u062c\u0649 \u0625\u0639\u0627\u062f\u0629 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644.",
            creatingLocal: "\u062c\u0627\u0631\u064a \u0625\u0646\u0634\u0627\u0621 \u062a\u0630\u0643\u0631\u0629 \u0645\u062d\u0644\u064a\u0629...",
            creatingRemote: "\u062c\u0627\u0631\u064a \u0625\u0646\u0634\u0627\u0621 \u062a\u0630\u0643\u0631\u0629 \u0645\u0639 \u0648\u0635\u0648\u0644 \u0628\u0639\u064a\u062f...",
            printPopupBlocked: "\u0627\u0644\u0646\u0627\u0641\u0630\u0629 \u0645\u062d\u062c\u0648\u0628\u0629\u060c \u0633\u0645\u062d \u0628\u0627\u0644\u0637\u0628\u0627\u0639\u0629.",
            printMode: "\u0645\u062d\u0644\u064a \u0645\u062c\u0627\u0646\u064a",
            printHint: "\u0627\u062d\u062a\u0641\u0638 \u0628\u0627\u0644\u062a\u0630\u0643\u0631\u0629 \u062d\u062a\u0649 \u064a\u062a\u0645 \u0627\u0633\u062a\u062f\u0639\u0627\u0624\u0643.",
            queueEmpty: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0637\u0648\u0627\u0628\u064a\u0631 \u0645\u062a\u0627\u062d\u0629.",
            queueCardHint: "\u0627\u0636\u063a\u0637 \u0644\u0627\u062e\u062a\u064a\u0627\u0631 \u0646\u0648\u0639 \u0627\u0644\u062a\u0630\u0643\u0631\u0629",
            modalTitle: "\u0627\u062e\u062a\u0631 \u0646\u0648\u0639 \u0627\u0644\u062a\u0630\u0643\u0631\u0629",
            modalSubtitle: "\u0627\u0644\u0637\u0627\u0628\u0648\u0631: {queue}",
            localBtn: "\u062a\u0630\u0643\u0631\u0629 \u0645\u062d\u0644\u064a\u0629 (\u0645\u062c\u0627\u0646\u064a)",
            remoteBtn: "\u062a\u0630\u0643\u0631\u0629 \u0645\u0639 \u0648\u0635\u0648\u0644 \u0628\u0639\u064a\u062f (50 \u062f\u062c)",
            cancelBtn: "\u0625\u0644\u063a\u0627\u0621"
        }
    };

    function getEl(id) {
        return document.getElementById(id);
    }

    function getCurrentLang() {
        const selected = getEl("langSelect")?.value || localStorage.getItem(KIOSK_LANG_KEY) || "fr";
        return i18n[selected] ? selected : "fr";
    }

    function t(key) {
        const lang = getCurrentLang();
        return i18n[lang]?.[key] || i18n.fr[key] || "";
    }

    function setDirection(lang) {
        const isArabic = lang === "ar";
        document.documentElement.lang = isArabic ? "ar" : "fr";
        document.documentElement.dir = isArabic ? "rtl" : "ltr";
    }

    function showUiFeedback(type, title, message) {
        const feedback = getEl("feedback");
        const feedbackTitle = getEl("feedbackTitle");
        const feedbackMessage = getEl("feedbackMessage");

        if (!feedback || !feedbackTitle || !feedbackMessage) return;
        feedback.classList.remove("ok", "warn");
        if (type) feedback.classList.add(type);
        feedbackTitle.textContent = title;
        feedbackMessage.textContent = message;
    }

    function notify(message, type = "info") {
        if (typeof showToast === "function") {
            showToast(message, type);
            return;
        }
        console.log(`[KIOSK] ${message}`);
    }

    function getQueryParam(name) {
        return new URLSearchParams(window.location.search).get(name);
    }

    function redirectToLogin() {
        const target = `${window.location.pathname}${window.location.search || ""}`;
        window.location.href = `${POS_LOGIN_URL}?redirect=${encodeURIComponent(target)}`;
    }

    function ensureAuthenticated() {
        const token = state?.getToken?.();
        if (!token) {
            notify(t("missingToken"), "warning");
            redirectToLogin();
            return false;
        }
        return true;
    }

    function getSelectedEstablishment() {
        return kioskState.establishments.find((e) => String(e.id) === String(kioskState.selectedEstablishmentId)) || null;
    }

    function getSelectedQueue() {
        return kioskState.queues.find((q) => String(q.id) === String(kioskState.selectedQueueId)) || null;
    }

    function renderContext() {
        const contextValue = getEl("contextValue");
        if (!contextValue) return;
        const est = getSelectedEstablishment();
        contextValue.textContent = est ? (est.name || est.id) : t("noContext");
    }

    function escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text ?? "";
        return div.innerHTML;
    }

    function renderQueues() {
        const grid = getEl("queuesGrid");
        const empty = getEl("emptyQueues");
        if (!grid || !empty) return;

        if (!kioskState.queues.length) {
            grid.innerHTML = "";
            empty.style.display = "block";
            empty.textContent = t("queueEmpty");
            return;
        }

        empty.style.display = "none";
        grid.innerHTML = kioskState.queues.map((queue) => `
            <button class="queue-card" type="button" data-queue-id="${queue.id}">
                <span class="queue-card-title">${escapeHtml(queue.name || `Queue ${queue.id}`)}</span>
                <span class="queue-card-desc">${escapeHtml(queue.description || t("queueCardHint"))}</span>
            </button>
        `).join("");

        grid.querySelectorAll(".queue-card").forEach((card) => {
            card.addEventListener("click", () => {
                const queueId = card.getAttribute("data-queue-id");
                kioskState.selectedQueueId = queueId;
                openChoiceModal();
            });
        });
    }

    function openChoiceModal() {
        const modal = getEl("ticketChoiceModal");
        const title = getEl("modalQueueTitle");
        const subtitle = getEl("modalSubtitle");
        const localBtn = getEl("localTicketBtn");
        const remoteBtn = getEl("remoteTicketBtn");
        const cancelBtn = getEl("cancelModalBtn");
        const queue = getSelectedQueue();
        if (!modal || !title || !subtitle || !localBtn || !remoteBtn || !cancelBtn || !queue) return;

        title.textContent = t("modalTitle");
        subtitle.textContent = t("modalSubtitle").replace("{queue}", queue.name || queue.id);
        localBtn.textContent = t("localBtn");
        remoteBtn.textContent = t("remoteBtn");
        cancelBtn.textContent = t("cancelBtn");

        modal.classList.add("show");
        modal.setAttribute("aria-hidden", "false");
    }

    function closeChoiceModal() {
        const modal = getEl("ticketChoiceModal");
        if (!modal) return;
        modal.classList.remove("show");
        modal.setAttribute("aria-hidden", "true");
    }

    function setQueuesDisabled(disabled) {
        document.querySelectorAll(".queue-card").forEach((btn) => {
            btn.disabled = !!disabled;
        });
        const localBtn = getEl("localTicketBtn");
        const remoteBtn = getEl("remoteTicketBtn");
        if (localBtn) localBtn.disabled = !!disabled;
        if (remoteBtn) remoteBtn.disabled = !!disabled;
    }

    function openPrintWindow() {
        const popup = window.open("", "_blank", "width=420,height=620");
        if (!popup) notify(t("printPopupBlocked"), "warning");
        return popup;
    }

    function printLocalTicket(ticket) {
        const printWindow = openPrintWindow();
        if (!printWindow) return;

        const est = getSelectedEstablishment();
        const queue = getSelectedQueue();
        const createdAt = new Date(ticket?.created_at || Date.now()).toLocaleString("fr-FR");

        printWindow.document.write(`
            <html>
            <head>
                <title>Ticket WaQtek</title>
                <style>
                    body { font-family: Arial, sans-serif; width: 75mm; margin: 0 auto; padding: 8px; color: #111; }
                    .brand { text-align: center; border-bottom: 1px dashed #888; padding-bottom: 8px; margin-bottom: 10px; }
                    .num { font-size: 42px; font-weight: 700; text-align: center; margin: 12px 0; color: #b40000; }
                    .row { display: flex; justify-content: space-between; margin: 6px 0; font-size: 12px; gap: 10px; }
                    .hint { margin-top: 10px; font-size: 11px; text-align: center; }
                </style>
            </head>
            <body>
                <div class="brand"><strong>WAQTEK</strong></div>
                <div class="row"><span>Etablissement</span><span>${est?.name || "-"}</span></div>
                <div class="row"><span>Queue</span><span>${queue?.name || "-"}</span></div>
                <div class="row"><span>Date</span><span>${createdAt}</span></div>
                <div class="row"><span>Mode</span><span>${t("printMode")}</span></div>
                <div class="num">${ticket?.number || "-"}</div>
                <div class="hint">${t("printHint")}</div>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    }

    function redirectToPaymentWaiting(ticket, amount) {
        const est = getSelectedEstablishment();
        const queue = getSelectedQueue();
        const params = new URLSearchParams({
            ticketId: ticket?.id || "",
            ticketNumber: ticket?.number || "",
            amount: String(amount || 50),
            estId: kioskState.selectedEstablishmentId || "",
            queueId: kioskState.selectedQueueId || "",
            estName: est?.name || "",
            queueName: queue?.name || "",
            issueDate: ticket?.created_at || new Date().toISOString()
        });
        window.location.href = `payment-pending.html?${params.toString()}`;
    }

    async function createTicket(remoteAccess) {
        if (!kioskState.selectedQueueId) {
            showUiFeedback("warn", t("waitingTitle"), t("missingContext"));
            return;
        }

        showUiFeedback("", t("waitingTitle"), remoteAccess ? t("creatingRemote") : t("creatingLocal"));
        setQueuesDisabled(true);

        try {
            const response = await apiClient.createPosTicketPublic(kioskState.selectedQueueId, remoteAccess);
            const ticket = response?.ticket;
            if (!ticket) throw new Error(t("createError"));

            const message = remoteAccess ? t("remoteCreated") : t("localCreated");
            showUiFeedback("ok", t("successTitle"), message.replace("{ticket}", ticket.number || "-"));

            if (remoteAccess) {
                window.setTimeout(() => redirectToPaymentWaiting(ticket, response?.paymentAmount || 50), 600);
            } else {
                printLocalTicket(ticket);
            }

            closeChoiceModal();
        } catch (error) {
            console.error("[TAKE-TICKET] create error", error);
            showUiFeedback("warn", t("createError"), error?.message || t("createError"));
            if (error?.status === 401 || error?.status === 403) {
                redirectToLogin();
            }
        } finally {
            setQueuesDisabled(false);
        }
    }

    async function bootstrapKiosk() {
        try {
            showUiFeedback("", t("waitingTitle"), t("loadingContext"));
            const list = await EstablishmentService.getEstablishments();
            const filtered = EstablishmentService.filterByCurrentUser(list);
            kioskState.establishments = Array.isArray(filtered) ? filtered : [];

            const requestedEst = getQueryParam("establishmentId") || getQueryParam("estId");
            const selectedEst = kioskState.establishments.find((e) => String(e.id) === String(requestedEst))
                || kioskState.establishments[0]
                || null;

            kioskState.selectedEstablishmentId = selectedEst?.id || null;
            renderContext();

            if (!kioskState.selectedEstablishmentId) {
                renderQueues();
                showUiFeedback("warn", t("waitingTitle"), t("noContext"));
                return;
            }

            const queues = await QueueService.getQueuesByEstablishment(kioskState.selectedEstablishmentId);
            kioskState.queues = Array.isArray(queues) ? queues : [];
            renderQueues();

            if (!kioskState.queues.length) {
                showUiFeedback("warn", t("waitingTitle"), t("missingContext"));
                return;
            }

            showUiFeedback("", t("waitingTitle"), t("waitingMessage"));
        } catch (error) {
            console.error("[TAKE-TICKET] bootstrap error", error);
            showUiFeedback("warn", t("createError"), error?.message || t("createError"));
            notify(error?.message || t("createError"), "error");
            if (error?.status === 401 || error?.status === 403) {
                redirectToLogin();
            }
        }
    }

    function applyLanguage(lang) {
        const dict = i18n[lang] || i18n.fr;
        setDirection(lang);
        document.title = dict.pageTitle;
        getEl("langLabel").textContent = dict.langLabel;
        getEl("title").textContent = dict.title;
        getEl("subtitle").textContent = dict.subtitle;
        getEl("contextTitle").textContent = dict.contextTitle;
        getEl("footerNote").textContent = dict.footerNote;

        const feedback = getEl("feedback");
        if (!feedback.classList.contains("ok")) {
            showUiFeedback("", dict.waitingTitle, dict.waitingMessage);
        }

        localStorage.setItem(KIOSK_LANG_KEY, lang);
        renderContext();
        renderQueues();
    }

    function bindEvents() {
        getEl("langSelect")?.addEventListener("change", () => {
            applyLanguage(getCurrentLang());
        });

        getEl("localTicketBtn")?.addEventListener("click", () => createTicket(false));
        getEl("remoteTicketBtn")?.addEventListener("click", () => createTicket(true));
        getEl("cancelModalBtn")?.addEventListener("click", closeChoiceModal);
        getEl("ticketChoiceModal")?.addEventListener("click", (e) => {
            if (e.target?.id === "ticketChoiceModal") closeChoiceModal();
        });
    }

    async function init() {
        const langSelect = getEl("langSelect");
        const preferredLang = localStorage.getItem(KIOSK_LANG_KEY);
        if (preferredLang && i18n[preferredLang] && langSelect) {
            langSelect.value = preferredLang;
        }
        applyLanguage(getCurrentLang());

        if (!ensureAuthenticated()) return;
        bindEvents();
        await bootstrapKiosk();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
