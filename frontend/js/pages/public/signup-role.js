(function () {
    function byId(id) { return document.getElementById(id); }

    function getRoleConfig() {
        const role = String(document.body?.dataset?.signupRole || "").toLowerCase();
        const titleMap = {
            waqtek_team: "Inscription WaQtek Team",
            admin: "Inscription Admin",
            manager: "Inscription Manager"
        };
        const endpointMap = {
            waqtek_team: "/auth/register/waqtekteam",
            admin: "/auth/register/admin",
            manager: "/auth/register/manager"
        };
        return {
            role,
            title: titleMap[role] || "Inscription",
            endpoint: endpointMap[role] || null
        };
    }

    function showMessage(type, message) {
        const errorBox = byId("errorBox");
        const successBox = byId("successBox");
        if (!errorBox || !successBox) return;

        if (type === "error") {
            errorBox.textContent = message;
            errorBox.style.display = "block";
            successBox.style.display = "none";
            return;
        }

        successBox.textContent = message;
        successBox.style.display = "block";
        errorBox.style.display = "none";
    }

    function clearMessages() {
        const errorBox = byId("errorBox");
        const successBox = byId("successBox");
        if (errorBox) errorBox.style.display = "none";
        if (successBox) successBox.style.display = "none";
    }

    function validateForm({ fullName, email, password, confirmPassword }) {
        if (!fullName || fullName.trim().length < 2) {
            return "Le nom complet est obligatoire (min 2 caracteres).";
        }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return "Adresse email invalide.";
        }
        if (!password || password.length < 6) {
            return "Le mot de passe doit contenir au moins 6 caracteres.";
        }
        if (password !== confirmPassword) {
            return "Les mots de passe ne correspondent pas.";
        }
        return null;
    }

    async function submitSignup(event) {
        event.preventDefault();
        clearMessages();

        const cfg = getRoleConfig();
        if (!cfg.endpoint) {
            showMessage("error", "Configuration de role invalide.");
            return;
        }

        const fullName = byId("fullName")?.value?.trim() || "";
        const email = byId("email")?.value?.trim() || "";
        const password = byId("password")?.value || "";
        const confirmPassword = byId("confirmPassword")?.value || "";
        const submitBtn = byId("submitBtn");

        const validationError = validateForm({ fullName, email, password, confirmPassword });
        if (validationError) {
            showMessage("error", validationError);
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = "Inscription...";

        try {
            const response = await apiClient.post(cfg.endpoint, {
                full_name: fullName,
                email,
                password
            });

            if (!response?.user?.id) {
                throw new Error("Creation du compte echouee.");
            }

            showMessage("success", `Compte cree avec succes (${cfg.role}). Redirection vers la connexion...`);
            setTimeout(() => {
                window.location.href = "enterprise/sign-in.html";
            }, 1200);
        } catch (error) {
            const msg = error?.message || "Erreur lors de l'inscription.";
            showMessage("error", msg);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Creer le compte";
        }
    }

    function init() {
        const cfg = getRoleConfig();
        const pageTitle = byId("pageTitle");
        const roleBadge = byId("roleBadge");
        if (pageTitle) pageTitle.textContent = cfg.title;
        if (roleBadge) roleBadge.textContent = cfg.role || "unknown";

        byId("signupForm")?.addEventListener("submit", submitSignup);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
