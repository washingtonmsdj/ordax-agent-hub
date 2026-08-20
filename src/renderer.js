const $ = (id) => document.getElementById(id);

let state;
let activeAgent;
const webviews = new Map();
const inactiveSince = new Map();
let suspensionTimer;

function slug(value) {
  return value
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `agent-${Date.now()}`;
}

function partitionFor(agent) {
  return `persist:ordax-agent-${agent.profileId}`;
}

function normalizeUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) return 'https://chatgpt.com/';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

async function persist() {
  await window.agentHub.setState(state);
}

function findAgent(id) {
  return state.agents.find((agent) => agent.id === id);
}

function renderTabs() {
  const tabs = $('tabs');
  tabs.innerHTML = '';
  for (const agent of state.agents) {
    const el = document.createElement('div');
    el.className = `tab ${agent.id === state.activeAgentId ? 'active' : ''}`;
    el.innerHTML = `<div class="tab-title"></div><div class="tab-account muted"></div>`;
    el.querySelector('.tab-title').textContent = agent.name;
    el.querySelector('.tab-account').textContent = agent.accountLabel || 'sem identificação';
    el.addEventListener('click', () => activateAgent(agent.id));
    tabs.appendChild(el);
  }
}

function attachWebviewEvents(agent, view) {
  const saveUrl = async () => {
    try {
      const current = view.getURL();
      if (current && current !== 'about:blank') {
        agent.lastUrl = current;
        if (agent.id === state.activeAgentId) $('urlBox').value = current;
        await persist();
      }
    } catch {}
  };

  view.addEventListener('did-start-loading', () => {
    if (agent.id === state.activeAgentId) $('webStatus').textContent = 'carregando';
  });
  view.addEventListener('did-stop-loading', () => {
    if (agent.id === state.activeAgentId) $('webStatus').textContent = 'pronto';
    saveUrl();
  });
  view.addEventListener('did-navigate', saveUrl);
  view.addEventListener('did-navigate-in-page', saveUrl);
  view.addEventListener('page-title-updated', (event) => {
    if (event.title && event.title !== 'ChatGPT') view.dataset.pageTitle = event.title;
  });
  view.addEventListener('did-fail-load', (event) => {
    if (event.errorCode === -3) return;
    if (agent.id === state.activeAgentId) $('webStatus').textContent = 'erro';
  });
}

function ensureWebview(agent) {
  let view = webviews.get(agent.id);
  if (view && view.isConnected) return view;

  view = document.createElement('webview');
  view.className = 'agent-webview';
  view.setAttribute('partition', partitionFor(agent));
  view.setAttribute('src', agent.lastUrl || 'https://chatgpt.com/');
  view.setAttribute('allowpopups', '');
  view.setAttribute('webpreferences', 'contextIsolation=yes,nodeIntegration=no,sandbox=yes');
  attachWebviewEvents(agent, view);
  webviews.set(agent.id, view);
  return view;
}

function unloadWebview(agentId) {
  const view = webviews.get(agentId);
  if (!view) return;
  try {
    const agent = findAgent(agentId);
    const current = view.getURL();
    if (agent && current && current !== 'about:blank') agent.lastUrl = current;
  } catch {}
  view.remove();
  webviews.delete(agentId);
  persist();
}

async function activateAgent(id) {
  if (state.activeAgentId && state.activeAgentId !== id) inactiveSince.set(state.activeAgentId, Date.now());
  state.activeAgentId = id;
  activeAgent = findAgent(id);
  inactiveSince.delete(id);
  await persist();
  renderTabs();
  renderAgentPanel();

  const host = $('webviewHost');
  host.innerHTML = '';
  const view = ensureWebview(activeAgent);
  host.appendChild(view);
  $('urlBox').value = activeAgent.lastUrl || 'https://chatgpt.com/';
  refreshGit();
}

function renderAgentPanel() {
  if (!activeAgent) return;
  $('agentTitle').textContent = activeAgent.name;
  $('accountLabel').textContent = activeAgent.accountLabel || '—';
  $('profileLabel').textContent = partitionFor(activeAgent);
  $('repoPath').value = activeAgent.repoPath || '';
  $('expectedBranch').textContent = activeAgent.expectedBranch || '—';
  $('mission').value = activeAgent.mission || '';
  $('suspendMinutesLabel').textContent = state.suspendAfterMinutes;
}

async function refreshGit() {
  if (!activeAgent) return;
  $('gitBranch').textContent = '...';
  $('gitHead').textContent = '...';
  $('gitStatus').textContent = '...';
  $('gitChanges').textContent = '...';
  $('branchWarning').classList.add('hidden');

  if (!activeAgent.repoPath) {
    $('gitBranch').textContent = '—';
    $('gitHead').textContent = '—';
    $('gitStatus').textContent = 'sem repo';
    $('gitChanges').textContent = 'Selecione o clone local.';
    return;
  }

  const info = await window.agentHub.gitInfo(activeAgent.repoPath);
  if (!info.ok) {
    $('gitBranch').textContent = 'erro';
    $('gitHead').textContent = '—';
    $('gitStatus').textContent = 'inválido';
    $('gitChanges').textContent = info.error;
    return;
  }

  $('gitBranch').textContent = info.branch;
  $('gitHead').textContent = info.head;
  $('gitStatus').textContent = info.clean ? 'limpo' : `${info.changes.length} mudança(s)`;
  $('gitChanges').textContent = info.clean ? 'Working tree limpo.' : info.changes.join('\n');

  if (activeAgent.expectedBranch && info.branch !== activeAgent.expectedBranch) {
    $('branchWarning').textContent = `Branch atual é ${info.branch}; esta aba espera ${activeAgent.expectedBranch}.`;
    $('branchWarning').classList.remove('hidden');
  }
}

function activeView() {
  return activeAgent ? webviews.get(activeAgent.id) : null;
}

function openAgentModal(agent = null) {
  $('modalBackdrop').classList.remove('hidden');
  $('modalTitle').textContent = agent ? 'Editar agente' : 'Novo agente';
  $('modalAgentId').value = agent?.id || '';
  $('modalName').value = agent?.name || '';
  $('modalAccount').value = agent?.accountLabel || '';
  $('modalBranch').value = agent?.expectedBranch || '';
  $('modalMission').value = agent?.mission || '';
  $('deleteAgentBtn').classList.toggle('hidden', !agent || state.agents.length <= 1);
}

function closeAgentModal() {
  $('modalBackdrop').classList.add('hidden');
}

async function saveAgentFromModal() {
  const existingId = $('modalAgentId').value;
  const name = $('modalName').value.trim();
  if (!name) return alert('Informe um nome para o agente.');

  if (existingId) {
    const agent = findAgent(existingId);
    agent.name = name;
    agent.accountLabel = $('modalAccount').value.trim();
    agent.expectedBranch = $('modalBranch').value.trim();
    agent.mission = $('modalMission').value.trim();
  } else {
    let id = slug(name);
    while (findAgent(id)) id = `${id}-${Math.floor(Math.random() * 9999)}`;
    state.agents.push({
      id,
      name,
      accountLabel: $('modalAccount').value.trim(),
      expectedBranch: $('modalBranch').value.trim(),
      mission: $('modalMission').value.trim(),
      profileId: id,
      repoPath: '',
      lastUrl: 'https://chatgpt.com/'
    });
    state.activeAgentId = id;
  }

  await persist();
  closeAgentModal();
  await activateAgent(state.activeAgentId);
}

async function deleteActiveAgentFromModal() {
  const id = $('modalAgentId').value;
  if (!id || state.agents.length <= 1) return;
  const agent = findAgent(id);
  if (!confirm(`Excluir a aba "${agent.name}"? A pasta de sessão do Electron permanece no perfil local do aplicativo.`)) return;
  unloadWebview(id);
  state.agents = state.agents.filter((item) => item.id !== id);
  if (state.activeAgentId === id) state.activeAgentId = state.agents[0].id;
  await persist();
  closeAgentModal();
  await activateAgent(state.activeAgentId);
}

async function copyContext() {
  if (!activeAgent) return;
  const info = activeAgent.repoPath ? await window.agentHub.gitInfo(activeAgent.repoPath) : null;
  const text = [
    `AGENT=${activeAgent.name}`,
    `ACCOUNT=${activeAgent.accountLabel || ''}`,
    `REPO_PATH=${activeAgent.repoPath || ''}`,
    `EXPECTED_BRANCH=${activeAgent.expectedBranch || ''}`,
    `CURRENT_BRANCH=${info?.ok ? info.branch : ''}`,
    `HEAD_SHA=${info?.ok ? info.head : ''}`,
    `LOCAL_CHANGES=${info?.ok ? info.changes.length : ''}`,
    '',
    'MISSION:',
    activeAgent.mission || ''
  ].join('\n');
  await navigator.clipboard.writeText(text);
  $('saveStateLabel').textContent = 'contexto copiado';
  setTimeout(() => $('saveStateLabel').textContent = '', 1500);
}

function startSuspensionLoop() {
  clearInterval(suspensionTimer);
  suspensionTimer = setInterval(() => {
    const threshold = Math.max(1, Number(state.suspendAfterMinutes) || 10) * 60_000;
    for (const [id, since] of inactiveSince.entries()) {
      if (id !== state.activeAgentId && Date.now() - since >= threshold) {
        unloadWebview(id);
        inactiveSince.delete(id);
      }
    }
  }, 30_000);
}

function bindUi() {
  $('addAgentBtn').addEventListener('click', () => openAgentModal());
  $('editAgentBtn').addEventListener('click', () => openAgentModal(activeAgent));
  $('cancelModalBtn').addEventListener('click', closeAgentModal);
  $('saveAgentBtn').addEventListener('click', saveAgentFromModal);
  $('deleteAgentBtn').addEventListener('click', deleteActiveAgentFromModal);

  $('pickRepoBtn').addEventListener('click', async () => {
    const path = await window.agentHub.pickRepo();
    if (!path) return;
    activeAgent.repoPath = path;
    await persist();
    renderAgentPanel();
    refreshGit();
  });

  $('refreshGitBtn').addEventListener('click', refreshGit);
  $('refreshAllBtn').addEventListener('click', refreshGit);
  $('openFolderBtn').addEventListener('click', () => window.agentHub.openFolder(activeAgent.repoPath));
  $('copyContextBtn').addEventListener('click', copyContext);

  $('saveMissionBtn').addEventListener('click', async () => {
    activeAgent.mission = $('mission').value;
    await persist();
    $('saveStateLabel').textContent = 'salvo';
    setTimeout(() => $('saveStateLabel').textContent = '', 1200);
  });

  $('openPrBtn').addEventListener('click', async () => {
    const info = activeAgent.repoPath ? await window.agentHub.gitInfo(activeAgent.repoPath) : null;
    if (!info?.ok || !info.remote) return alert('Remote origin não encontrado.');
    let url = info.remote.replace(/\.git$/, '');
    if (url.startsWith('git@github.com:')) url = `https://github.com/${url.slice('git@github.com:'.length)}`;
    if (!/^https?:\/\//.test(url)) return alert(`Remote não é uma URL web reconhecida: ${info.remote}`);
    window.agentHub.openExternal(url);
  });

  $('backBtn').addEventListener('click', () => { const v = activeView(); if (v?.canGoBack()) v.goBack(); });
  $('forwardBtn').addEventListener('click', () => { const v = activeView(); if (v?.canGoForward()) v.goForward(); });
  $('reloadBtn').addEventListener('click', () => activeView()?.reload());
  $('goBtn').addEventListener('click', () => {
    const url = normalizeUrl($('urlBox').value);
    $('urlBox').value = url;
    activeView()?.loadURL(url);
  });
  $('urlBox').addEventListener('keydown', (event) => { if (event.key === 'Enter') $('goBtn').click(); });
}

async function bootstrap() {
  state = await window.agentHub.getState();
  bindUi();
  renderTabs();
  activeAgent = findAgent(state.activeAgentId) || state.agents[0];
  state.activeAgentId = activeAgent.id;
  await activateAgent(activeAgent.id);
  startSuspensionLoop();
}

bootstrap();
