const pageState = {
    ticketId: null,
    ticketNumber: null,
    paid: false,
    activated: false,
    pollTimer: null,
    trackingUrl: null,
    trackingToken: null
};

function readQuery() {
    const params = new URLSearchParams(window.location.search);
    const issueDateRaw = params.get("issueDate") || "";
    const issueDate = issueDateRaw ? new Date(issueDateRaw) : new Date();
    return {
        ticketId: params.get("ticketId") || "",
        ticketNumber: params.get("ticketNumber") || "-",
        amount: params.get("amount") || "50",
        estId: params.get("estId") || "",
        queueId: params.get("queueId") || "",
        estName: params.get("estName") || "-",
        queueName: params.get("queueName") || "-",
        issueDate: isNaN(issueDate.getTime()) ? new Date() : issueDate
    };
}

function apiBase() {
    const protocol = window.location.protocol === "https:" ? "https" : "http";
    const host = window.location.hostname || "localhost";
    return `${protocol}://${host}:5000/api`;
}

function setStatus(kind, text) {
    const statusEl = document.getElementById("paymentStatus");
    if (!statusEl) return;
    statusEl.className = `status ${kind}`;
    statusEl.textContent = text;
}

function renderQr(url) {
    const qrBox = document.getElementById("qrBox");
    const canvas = document.getElementById("ticketQrCanvas");
    const link = document.getElementById("trackUrl");
    if (!qrBox || !canvas || !link) return;

    if (typeof QRious !== "undefined") {
        new QRious({
            element: canvas,
            size: 220,
            value: url
        });
    }

    link.href = url;
    link.textContent = url;
    qrBox.classList.add("show");
}

function printRemoteTicket() {
    const canvas = document.getElementById("ticketQrCanvas");
    if (!canvas || !pageState.trackingUrl) return;
    const qrDataUrl = canvas.toDataURL("image/png");
    const estName = document.getElementById("estName")?.textContent || "-";
    const queueName = document.getElementById("queueName")?.textContent || "-";
    const issueDate = document.getElementById("issueDate")?.textContent || "-";
    const printDate = new Date().toLocaleString("fr-FR");

    const popup = window.open("", "_blank", "width=420,height=640");
    if (!popup) return;

    popup.document.write(`
        <html>
        <head>
            <title>Ticket Distant WaQtek</title>
            <style>
                @page { size: 75mm 90.6mm; margin: 0; }
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
                    width: 73mm;
                    margin: 0;
                    background:#fff;
                    border: 1px solid #222;
                    border-radius: 2mm;
                    padding: 2mm;
                    color:#111;
                    box-sizing: border-box;
                }
                .brand { text-align:center; border-bottom:1px dashed #666; padding-bottom:1.5mm; margin-bottom:1.5mm; }
                .brand h2 { margin:0; font-size:16px; letter-spacing:1px; }
                .brand p { margin:1mm 0 0; font-size:10px; color:#555; }
                .row { display:flex; justify-content:space-between; margin:0.8mm 0; font-size:10px; }
                .label { color:#666; }
                .value { font-weight:700; text-align:right; max-width:60%; word-break:break-word; }
                .number {
                    text-align:center;
                    margin:1.5mm 0;
                    font-size:30px;
                    font-weight:800;
                    color:#b00000;
                }
                .qr { text-align:center; border-top:1px dashed #666; border-bottom:1px dashed #666; padding:1.5mm 0; margin:1.5mm 0; }
                img { width: 22mm; height: 22mm; }
                .msg { font-size:10px; margin:1.2mm 0; text-align:center; }
                .guide { font-size:9px; color:#333; margin-top:1mm; }
                .guide p { margin:0.5mm 0; }
                .url { font-size:8px; word-break:break-all; color:#444; margin-top:1mm; text-align:center; }
                .footer { font-size:8px; color:#666; text-align:center; margin-top:1mm; }
            </style>
        </head>
        <body>
            <div class="ticket">
                <div class="brand">
                    <h2>WAQTEK</h2>
                    <p>Ticket de suivi distant</p>
                </div>

                <div class="row"><span class="label">Etablissement</span><span class="value">${estName}</span></div>
                <div class="row"><span class="label">Queue</span><span class="value">${queueName}</span></div>
                <div class="row"><span class="label">Date ticket</span><span class="value">${issueDate}</span></div>
                <div class="row"><span class="label">Imprime le</span><span class="value">${printDate}</span></div>

                <div class="number">${pageState.ticketNumber || "-"}</div>

                <div class="qr">
                    <img id="qrPrintImage" src="${qrDataUrl}" alt="QR Ticket" />
                </div>

                <div class="msg">
                    Scannez ce QR avec le smartphone du client pour suivre la position dans la file.
                </div>

                <div class="guide">
                    <p>1. Ouvrir l'appareil photo du smartphone.</p>
                    <p>2. Scanner le QR code puis ouvrir le lien.</p>
                    <p>3. Le suivi est limite a un seul appareil.</p>
                    <p>4. Valable uniquement jusqu'a l'appel du ticket.</p>
                </div>

                <div class="url">${pageState.trackingUrl}</div>
                <div class="footer">Merci de conserver ce ticket.</div>
            </div>
        </body>
        </html>
    `);
    popup.document.close();

    const triggerPrint = () => {
        popup.focus();
        popup.print();
    };

    const qrImg = popup.document.getElementById("qrPrintImage");
    if (!qrImg) {
        setTimeout(triggerPrint, 200);
        return;
    }
    if (qrImg.complete) {
        setTimeout(triggerPrint, 150);
        return;
    }

    qrImg.addEventListener("load", () => setTimeout(triggerPrint, 100), { once: true });
    qrImg.addEventListener("error", () => setTimeout(triggerPrint, 200), { once: true });
}

async function activateRemoteAccess() {
    if (!pageState.ticketId) return false;
    if (pageState.activated) return true;

    try {
        const response = await fetch(`${apiBase()}/tickets/public/remote-access/activate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ticketId: pageState.ticketId })
        });

        const data = await response.json();
        if (!response.ok) {
            const msg = data?.error || "Activation remote access impossible";
            setStatus("pending", `Paiement detecte mais activation en cours (${msg})...`);
            return false;
        }

        pageState.activated = true;
        pageState.trackingToken = data?.remoteAccess?.token || null;
        pageState.trackingUrl = data?.remoteAccess?.trackingUrl || null;
        if (!pageState.trackingUrl && pageState.trackingToken) {
            pageState.trackingUrl = `${window.location.origin}/client/remote-tracking.html?token=${encodeURIComponent(pageState.trackingToken)}`;
        }
        if (pageState.trackingUrl) {
            renderQr(pageState.trackingUrl);
        }
        return true;
    } catch (_) {
        setStatus("pending", "Connexion perdue. Nouvelle tentative d'activation...");
        return false;
    }
}

async function checkPaymentStatus() {
    if (!pageState.ticketId || pageState.paid) return;

    try {
        const response = await fetch(`${apiBase()}/tickets/public/payment-status/${encodeURIComponent(pageState.ticketId)}`);
        const data = await response.json();
        const payment = data?.payment || {};

        if (payment.confirmed === true || payment.status === "paid") {
            pageState.paid = true;
            const ok = await activateRemoteAccess();
            if (ok) {
                setStatus("paid", "Paiement effectue avec succes. Ticket QR pret pour impression.");
                if (pageState.pollTimer) {
                    clearInterval(pageState.pollTimer);
                    pageState.pollTimer = null;
                }
            }
            return;
        }

        if (payment.status === "pending") {
            setStatus("pending", "En attente de confirmation de paiement...");
            return;
        }

        setStatus("pending", "Synchronisation paiement en cours...");
    } catch (_) {
        setStatus("pending", "Connexion perdue. Nouvelle tentative de synchronisation...");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const query = readQuery();
    pageState.ticketId = query.ticketId;
    pageState.ticketNumber = query.ticketNumber;

    const ticketNumberEl = document.getElementById("ticketNumber");
    const amountEl = document.getElementById("amount");
    const estNameEl = document.getElementById("estName");
    const queueNameEl = document.getElementById("queueName");
    const issueDateEl = document.getElementById("issueDate");
    const returnBtn = document.getElementById("returnBtn");
    const printBtn = document.getElementById("printBtn");

    if (ticketNumberEl) ticketNumberEl.textContent = query.ticketNumber;
    if (amountEl) amountEl.textContent = `${query.amount} DA`;
    if (estNameEl) estNameEl.textContent = query.estName;
    if (queueNameEl) queueNameEl.textContent = query.queueName;
    if (issueDateEl) issueDateEl.textContent = query.issueDate.toLocaleString("fr-FR");

    // Fallback: resolve labels from IDs if names are missing in URL
    if (query.estId && (!query.estName || query.estName === "-")) {
        fetch(`${apiBase()}/establishments/${encodeURIComponent(query.estId)}`)
            .then((r) => r.ok ? r.json() : null)
            .then((data) => {
                const name = data?.establishment?.name || data?.name || "";
                if (name && estNameEl) estNameEl.textContent = name;
            })
            .catch(() => {});
    }
    if (query.queueId && (!query.queueName || query.queueName === "-")) {
        fetch(`${apiBase()}/queues/${encodeURIComponent(query.queueId)}`)
            .then((r) => r.ok ? r.json() : null)
            .then((data) => {
                const name = data?.queue?.name || data?.name || "";
                if (name && queueNameEl) queueNameEl.textContent = name;
            })
            .catch(() => {});
    }

    if (!query.ticketId) {
        setStatus("pending", "Ticket introuvable. Verification paiement impossible.");
    } else {
        checkPaymentStatus();
        pageState.pollTimer = setInterval(checkPaymentStatus, 3000);
    }

    if (printBtn) {
        printBtn.addEventListener("click", printRemoteTicket);
    }

    if (returnBtn) {
        returnBtn.addEventListener("click", () => {
            window.location.href = "pos-ticket.html";
        });
    }
});

window.addEventListener("beforeunload", () => {
    if (pageState.pollTimer) {
        clearInterval(pageState.pollTimer);
        pageState.pollTimer = null;
    }
});
