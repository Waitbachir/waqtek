const state = {
  establishments: [],
  queues: [],
  selectedEst: null,
  selectedQueue: null,
  allQueuesMode: false,
};

function tvDisplayUrl() {
  const url = new URL(window.location.href);
  const basePath = url.pathname.replace(/display-control\.html$/, '');
  const displayUrl = `${url.origin}${basePath}queue-display.html`;
  const params = new URLSearchParams();

  if (state.selectedEst) params.set('establishmentId', state.selectedEst);
  if (state.allQueuesMode) {
    params.set('allQueues', '1');
  } else if (state.selectedQueue) {
    params.set('queueId', state.selectedQueue);
  }

  return params.toString() ? `${displayUrl}?${params.toString()}` : displayUrl;
}

function renderQrAndLink() {
  const finalUrl = tvDisplayUrl();
  const qrCanvas = document.getElementById('qrFinal');
  const urlEl = document.getElementById('finalUrl');
  if (qrCanvas) new QRious({ element: qrCanvas, size: 200, value: finalUrl });
  if (urlEl) urlEl.textContent = finalUrl;
}

async function loadEstablishments() {
  const ests = await EstablishmentService.getEstablishments();
  state.establishments = ests || [];
  const select = document.getElementById('estSelect');
  select.innerHTML = '<option value="">Sélectionner...</option>' + state.establishments.map(e => `<option value="${e.id}">${escapeHtml(e.name)}</option>`).join('');
}

async function loadQueues(estId) {
  const select = document.getElementById('queueSelect');
  select.disabled = !estId;
  if (!estId) {
    select.innerHTML = '<option value="">Sélectionner...</option>';
    return;
  }

  const queues = await QueueService.getQueuesByEstablishment(estId);
  state.queues = queues || [];
  select.innerHTML = '<option value="">Sélectionner...</option><option value="__ALL__">Toutes les files</option>' + state.queues.map(q => `<option value="${q.id}">${escapeHtml(q.name)}</option>`).join('');
}

function initEvents() {
  document.getElementById('estSelect').onchange = async (e) => {
    state.selectedEst = e.target.value || null;
    state.selectedQueue = null;
    state.allQueuesMode = false;
    await loadQueues(state.selectedEst);
    renderQrAndLink();
  };

  document.getElementById('queueSelect').onchange = (e) => {
    const value = e.target.value || null;
    state.allQueuesMode = value === '__ALL__';
    state.selectedQueue = state.allQueuesMode ? null : value;
    renderQrAndLink();
  };

  document.getElementById('copyBtn').onclick = () => {
    navigator.clipboard.writeText(tvDisplayUrl()).catch(() => {});
  };
}

async function bootstrap() {
  initEvents();
  await loadEstablishments();
  renderQrAndLink();
}

document.addEventListener('DOMContentLoaded', bootstrap);
