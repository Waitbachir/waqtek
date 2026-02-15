(function () {
    const POS_LOGIN_URL = "./enterprise/sign-in.html";
    const KIOSK_CONTEXT_KEY = "waqtek_kiosk_context_v1";
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
            subtitle: "Appuyez pour obtenir votre ticket",
            contextTitle: "Kiosk actif",
            loadingContext: "Chargement de la configuration...",
            noContext: "Aucune configuration de file disponible",
            normalLabel: "Ticket Normal",
            vipLabel: "Ticket VIP",
            waitingTitle: "En attente",
            waitingMessage: "Selectionnez un type de ticket pour continuer.",
            footerNote: "Ecran adapte aux tablettes et bornes tactiles.",
            successTitle: "Ticket cree",
            normalCreated: "Votre ticket normal est pret : {ticket}",
            vipCreated: "Votre ticket VIP est pret : {ticket}",
            createError: "Erreur creation ticket",
            missingContext: "Aucune file kiosk configuree.",
            missingToken: "Session expiree, reconnectez-vous.",
            creatingNormal: "Creation ticket normal en cours...",
            creatingVip: "Creation ticket VIP en cours...",
            printPopupBlocked: "Popup bloquee: autorisez les popups pour imprimer le ticket.",
            printMode: "LOCAL GRATUIT",
            printHint: "Conservez ce ticket jusqu'a l'appel."
        },
        ar: {
            pageTitle: "\u0627\u0633\u062d\u0628 \u062a\u0630\u0643\u0631\u062a\u0643 | WaQtek",
            langLabel: "\u0627\u0644\u0644\u063a\u0629",
            title: "\u0627\u0633\u062d\u0628 \u062a\u0630\u0643\u0631\u062a\u0643",
            subtitle: "\u0627\u0636\u063a\u0637 \u0644\u0644\u062d\u0635\u0648\u0644 \u0639\u0644\u0649 \u062a\u0630\u0643\u0631\u062a\u0643",
            contextTitle: "\u0627\u0644\u0643\u064a\u0648\u0633\u0643 \u0627\u0644\u0646\u0634\u0637",
            loadingContext: "\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a...",
            noContext: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0637\u0627\u0628\u0648\u0631 \u0645\u062a\u0627\u062d\u0629",
            normalLabel: "\u062a\u0630\u0643\u0631\u0629 \u0639\u0627\u062f\u064a\u0629",
            vipLabel: "\u062a\u0630\u0643\u0631\u0629 VIP",
            waitingTitle: "\u0641\u064a \u0627\u0644\u0627\u0646\u062a\u0638\u0627\u0631",
            waitingMessage: "\u0627\u062e\u062a\u0631 \u0646\u0648\u0639 \u0627\u0644\u062a\u0630\u0643\u0631\u0629 \u0644\u0644\u0645\u062a\u0627\u0628\u0639\u0629.",
            footerNote: "\u0627\u0644\u0634\u0627\u0634\u0629 \u0645\u0647\u064a\u0623\u0629 \u0644\u0644\u0623\u062c\u0647\u0632\u0629 \u0627\u0644\u0644\u0648\u062d\u064a\u0629 \u0648\u0623\u0643\u0634\u0627\u0643 \u0627\u0644\u0644\u0645\u0633.",
            successTitle: "\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062a\u0630\u0643\u0631\u0629",
            normalCreated: "\u062a\u0630\u0643\u0631\u062a\u0643 \u0627\u0644\u0639\u0627\u062f\u064a\u0629 \u062c\u0627\u0647\u0632\u0629: {ticket}",
            vipCreated: "\u062a\u0630\u0643\u0631\u062a\u0643 VIP \u062c\u0627\u0647\u0632\u0629: {ticket}",
            createError: "\u062e\u0637\u0623 \u0623\u062b\u0646\u0627\u0621 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062a\u0630\u0643\u0631\u0629",
            missingContext: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0643\u064a\u0648\u0633\u0643.",
            missingToken: "\u0627\u0646\u062a\u0647\u062a \u0627\u0644\u062c\u0644\u0633\u0629\u060c \u064a\u0631\u062c\u0649 \u0625\u0639\u0627\u062f\u0629 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644.",
            creatingNormal: "\u062c\u0627\u0631\u064a \u0625\u0646\u0634\u0627\u0621 \u062a\u0630\u0643\u0631\u0629 \u0639\u0627\u062f\u064a\u0629...",
            creatingVip: "\u062c\u0627\u0631\u064a \u0625\u0646\u0634\u0627\u0621 \u062a\u0630\u0643\u0631\u0629 VIP...",
            printPopupBlocked: "\u0627\u0644\u0646\u0627\u0641\u0630\u0629 \u0645\u062d\u062c\u0648\u0628\u0629\u060c \u0633\u0645\u062d \u0628\u0627\u0644\u0637\u0628\u0627\u0639\u0629.",
            printMode: "\u0645\u062d\u0644\u064a \u0645\u062c\u0627\u0646\u064a",
            printHint: "\u0627\u062d\u062a\u0641\u0638 \u0628\u0627\u0644\u062a\u0630\u0643\u0631\u0629 \u062d\u062a\u0649 \u064a\u062a\u0645 \u0627\u0633\u062a\u062f\u0639\u0627\u0624\u0643."
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

    function addPressFeedback(button) {
        button.classList.add("is-pressed");
        window.setTimeout(() => button.classList.remove("is-pressed"), 140);
    }

    function notify(message, type = "info") {
        if (typeof showToast === "function") {
            showToast(message, type);
            return;
        }
        console.log(`[KIOSK] ${message}`);
    }

    function parseSavedContext() {
        try {
            const raw = localStorage.getItem(KIOSK_CONTEXT_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (_) {
            return {};
        }
    }

    function saveContext() {
        localStorage.setItem(KIOSK_CONTEXT_KEY, JSON.stringify({
            establishmentId: kioskState.selectedEstablishmentId || null,
            queueId: kioskState.selectedQueueId || null
        }));
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

    async function loadEstablishmentsForConnectedAccount() {
        const list = await EstablishmentService.getEstablishments();
        const filtered = EstablishmentService.filterByCurrentUser(list);
        kioskState.establishments = Array.isArray(filtered) ? filtered : [];
    }

    async function loadQueuesForEstablishment(establishmentId) {
        kioskState.selectedQueueId = null;
        if (!establishmentId) {
            kioskState.queues = [];
            return;
        }
        const list = await QueueService.getQueuesByEstablishment(establishmentId);
        kioskState.queues = Array.isArray(list) ? list : [];
    }

    function pickKioskContext() {
        const saved = parseSavedContext();
        const requestedEst = getQueryParam("establishmentId") || getQueryParam("estId");
        const requestedQueue = getQueryParam("queueId");

        const estByParam = kioskState.establishments.find((e) => String(e.id) === String(requestedEst));
        const estBySaved = kioskState.establishments.find((e) => String(e.id) === String(saved.establishmentId));
        const selectedEst = estByParam || estBySaved || kioskState.establishments[0] || null;

        kioskState.selectedEstablishmentId = selectedEst?.id || null;

        const queueByParam = kioskState.queues.find((q) => String(q.id) === String(requestedQueue));
        const queueBySaved = kioskState.queues.find((q) => String(q.id) === String(saved.queueId));
        const selectedQueue = queueByParam || queueBySaved || kioskState.queues[0] || null;

        kioskState.selectedQueueId = selectedQueue?.id || null;
        saveContext();
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
        const queue = getSelectedQueue();

        if (!est || !queue) {
            contextValue.textContent = t("noContext");
            return;
        }
        contextValue.textContent = `${est.name || est.id} | ${queue.name || queue.id}`;
    }

    function setButtonsDisabled(disabled) {
        const normalBtn = getEl("normalBtn");
        const vipBtn = getEl("vipBtn");
        if (normalBtn) normalBtn.disabled = !!disabled;
        if (vipBtn) vipBtn.disabled = !!disabled;
    }

    function openPrintWindow() {
        const popup = window.open("", "_blank", "width=420,height=620");
        if (!popup) {
            notify(t("printPopupBlocked"), "warning");
        }
        return popup;
    }

    function printNormalTicket(ticket) {
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

    async function createKioskTicket(remoteAccess) {
        if (!kioskState.selectedQueueId) {
            showUiFeedback("warn", t("waitingTitle"), t("missingContext"));
            notify(t("missingContext"), "warning");
            return;
        }

        const pendingText = remoteAccess ? t("creatingVip") : t("creatingNormal");
        showUiFeedback("", t("waitingTitle"), pendingText);
        setButtonsDisabled(true);

        try {
            const response = await apiClient.createPosTicketPublic(kioskState.selectedQueueId, remoteAccess);
            const ticket = response?.ticket;
            if (!ticket) {
                throw new Error(t("createError"));
            }

            const template = remoteAccess ? t("vipCreated") : t("normalCreated");
            showUiFeedback("ok", t("successTitle"), template.replace("{ticket}", ticket.number || "-"));

            notify(
                remoteAccess ? `Ticket VIP ${ticket.number} cree` : `Ticket normal ${ticket.number} cree`,
                "success"
            );

            if (remoteAccess) {
                window.setTimeout(() => redirectToPaymentWaiting(ticket, response?.paymentAmount || 50), 600);
            } else {
                printNormalTicket(ticket);
            }
        } catch (error) {
            console.error("[TAKE-TICKET] create error:", error);
            showUiFeedback("warn", t("createError"), error?.message || t("createError"));
            notify(error?.message || t("createError"), "error");
            if (error?.status === 401 || error?.status === 403) {
                redirectToLogin();
            }
        } finally {
            setButtonsDisabled(false);
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
        getEl("normalLabel").textContent = dict.normalLabel;
        getEl("vipLabel").textContent = dict.vipLabel;
        getEl("footerNote").textContent = dict.footerNote;

        const feedback = getEl("feedback");
        if (!feedback.classList.contains("ok")) {
            showUiFeedback("", dict.waitingTitle, dict.waitingMessage);
        }

        renderContext();
        localStorage.setItem(KIOSK_LANG_KEY, lang);
    }

    async function bootstrapKiosk() {
        try {
            showUiFeedback("", t("waitingTitle"), t("loadingContext"));
            setButtonsDisabled(true);

            await loadEstablishmentsForConnectedAccount();
            const targetEstablishmentId = getQueryParam("establishmentId") || getQueryParam("estId") || parseSavedContext().establishmentId;
            kioskState.selectedEstablishmentId =
                kioskState.establishments.find((e) => String(e.id) === String(targetEstablishmentId))?.id ||
                kioskState.establishments[0]?.id ||
                null;

            await loadQueuesForEstablishment(kioskState.selectedEstablishmentId);
            pickKioskContext();
            renderContext();

            if (!kioskState.selectedQueueId) {
                showUiFeedback("warn", t("waitingTitle"), t("missingContext"));
                notify(t("missingContext"), "warning");
                return;
            }

            showUiFeedback("", t("waitingTitle"), t("waitingMessage"));
        } catch (error) {
            console.error("[TAKE-TICKET] bootstrap error:", error);
            showUiFeedback("warn", t("createError"), error?.message || t("createError"));
            notify(error?.message || t("createError"), "error");
            if (error?.status === 401 || error?.status === 403) {
                redirectToLogin();
            }
        } finally {
            setButtonsDisabled(false);
        }
    }

    function bindEvents() {
        const langSelect = getEl("langSelect");
        const normalBtn = getEl("normalBtn");
        const vipBtn = getEl("vipBtn");

        langSelect?.addEventListener("change", function () {
            applyLanguage(getCurrentLang());
        });

        normalBtn?.addEventListener("click", function () {
            addPressFeedback(normalBtn);
            createKioskTicket(false);
        });

        vipBtn?.addEventListener("click", function () {
            addPressFeedback(vipBtn);
            createKioskTicket(true);
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
