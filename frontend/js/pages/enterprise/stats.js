let dailyChart = null;
let monthlyChart = null;
let statsInitialized = false;

function formatMoney(value) {
    return `${Number(value || 0).toLocaleString('fr-FR')} FCFA`;
}

function toIsoDateInput(date) {
    const d = new Date(date);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function getFilters() {
    const establishmentId = document.getElementById('establishmentFilter').value || '';
    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;

    const params = {};
    if (establishmentId) params.establishment_id = establishmentId;
    if (start) params.start = new Date(`${start}T00:00:00.000Z`).toISOString();
    if (end) params.end = new Date(`${end}T23:59:59.999Z`).toISOString();
    return params;
}

async function loadEstablishmentFilter() {
    const select = document.getElementById('establishmentFilter');
    select.innerHTML = '<option value="">Tous mes etablissements</option>';

    const response = await apiClient.getEstablishments();
    const establishments = response.establishments || [];

    for (const est of establishments) {
        const option = document.createElement('option');
        option.value = est.id;
        option.textContent = est.name || `Etablissement ${est.id}`;
        select.appendChild(option);
    }
}

function renderCharts(dailyData, monthlyData) {
    const dailyCtx = document.getElementById('dailyRevenueChart');
    const monthlyCtx = document.getElementById('monthlyRevenueChart');

    const dailyLabels = dailyData.map((d) => d.period);
    const dailyRevenue = dailyData.map((d) => Number(d.revenue || 0));

    const monthlyLabels = monthlyData.map((d) => d.period);
    const monthlyRevenue = monthlyData.map((d) => Number(d.revenue || 0));

    if (dailyChart) dailyChart.destroy();
    if (monthlyChart) monthlyChart.destroy();

    dailyChart = new Chart(dailyCtx, {
        type: 'line',
        data: {
            labels: dailyLabels,
            datasets: [{
                label: 'Revenu journalier',
                data: dailyRevenue,
                borderColor: '#0f766e',
                backgroundColor: 'rgba(15,118,110,0.2)',
                tension: 0.25,
                fill: true
            }]
        },
        options: { responsive: true, plugins: { legend: { display: true } } }
    });

    monthlyChart = new Chart(monthlyCtx, {
        type: 'bar',
        data: {
            labels: monthlyLabels,
            datasets: [{
                label: 'Revenu mensuel',
                data: monthlyRevenue,
                backgroundColor: '#2563eb'
            }]
        },
        options: { responsive: true, plugins: { legend: { display: true } } }
    });
}

async function loadRevenueDashboard() {
    const params = getFilters();

    const [daily, monthly, vip] = await Promise.all([
        StatsService.getRevenueDaily(params),
        StatsService.getRevenueMonthly(params),
        StatsService.getVipCount(params)
    ]);

    document.getElementById('kpiDailyRevenue').textContent = formatMoney(daily?.totals?.revenue || 0);
    document.getElementById('kpiMonthlyRevenue').textContent = formatMoney(monthly?.totals?.revenue || 0);
    document.getElementById('kpiVipCount').textContent = Number(vip?.total_vip_tickets || 0).toLocaleString('fr-FR');

    renderCharts(daily?.data || [], monthly?.data || []);
}

function setupDefaultDates() {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);

    document.getElementById('startDate').value = toIsoDateInput(start);
    document.getElementById('endDate').value = toIsoDateInput(end);
}

function setupEvents() {
    document.getElementById('refreshBtn').addEventListener('click', loadRevenueDashboard);
    document.getElementById('establishmentFilter').addEventListener('change', loadRevenueDashboard);
}

async function initStatsPage() {
    if (statsInitialized) return;
    statsInitialized = true;

    AuthService.requireAuth('sign-in.html');
    setupDefaultDates();
    await loadEstablishmentFilter();
    setupEvents();
    await loadRevenueDashboard();
}

async function logout() {
    try {
        if (window.AuthService && typeof AuthService.logout === 'function') {
            await AuthService.logout();
        }
    } finally {
        localStorage.removeItem('waqtek_token');
        localStorage.removeItem('waqtek_user');
        window.location.href = 'sign-in.html';
    }
}

window.logout = logout;
window.initStatsPage = initStatsPage;

function bootstrapStatsPage() {
    initStatsPage().catch((error) => {
        console.error('[STATS] Init failed:', error);
        alert('Erreur chargement statistiques');
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrapStatsPage);
} else {
    bootstrapStatsPage();
}
