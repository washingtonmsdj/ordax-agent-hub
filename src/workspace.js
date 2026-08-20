const workspace$ = (id) => document.getElementById(id);

function workspacePathKey(value) {
  return String(value || '').replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
}

function workspaceNotice(message = '', tone = 'info') {
  const element = workspace$('repoNotice');
  if (!message) {
    element.className = 'notice hidden';
    element.textContent = '';
    return;
  }
  element.className = `notice ${tone}`;
  element.textContent = message;
}

function workspaceBadge(text, tone = 'neutral') {
  const badge = workspace$('workspaceBadge');
  badge.className = `workspace-badge ${tone}`;
  badge.textContent = text;
}

function resetWorkspacePanel() {
  for (const id of ['gitProject', 'gitWorkspaceType', 'gitRoot', 'gitBranch', 'gitHead', 'gitRemote', 'gitStatus', 'gitChanges']) {
    workspace$(id).textContent = '—';
  }
  workspace$('branchWarning').classList.add('hidden');
  workspace$('branchWarning').textContent = '';
  workspaceNotice();
  workspaceBadge('SEM WORKSPACE');
}

async function workspaceCollisions(state, agent, root) {
  const candidates = state.agents.filter((item) => item.id !== agent.id && item.repoPath);
  const results = await Promise.all(candidates.map(async (item) => {
    const info = await window.agentHub.gitInfo(item.repoPath);
    return info?.ok && workspacePathKey(info.root) === workspacePathKey(root) ? item : null;
  }));
  return results.filter(Boolean);
}

async function refreshWorkspace({ state, agent, persist, isActive }) {
  resetWorkspacePanel();
  workspace$('gitBranch').textContent = '...';
  workspace$('gitHead').textContent = '...';
  workspace$('gitStatus').textContent = '...';
  workspace$('gitChanges').textContent = '...';

  if (!agent.repoPath) {
    workspace$('gitStatus').textContent = 'sem workspace';
    workspace$('gitChanges').textContent = 'Selecione a raiz de um clone Git ou um worktree isolado.';
    return null;
  }

  const info = await window.agentHub.gitInfo(agent.repoPath);
  if (!isActive()) return null;

  if (!info.ok) {
    workspace$('gitBranch').textContent = 'erro';
    workspace$('gitHead').textContent = '—';
    workspace$('gitStatus').textContent = 'inválido';
    workspace$('gitChanges').textContent = info.error;
    workspaceBadge('WORKSPACE INVÁLIDO', 'bad');
    workspaceNotice('A pasta salva não é um checkout/worktree Git válido. Selecione novamente pelo botão ...', 'bad');
    return info;
  }

  if (info.isSubdirectorySelection && workspacePathKey(agent.repoPath) !== workspacePathKey(info.root)) {
    const previousPath = agent.repoPath;
    agent.repoPath = info.root;
    await persist();
    workspace$('repoPath').value = info.root;
    workspaceNotice(`Subpasta detectada (${previousPath}). O Agent Hub ajustou para a raiz Git: ${info.root}`, 'info');
  }

  workspace$('gitProject').textContent = info.projectName;
  workspace$('gitWorkspaceType').textContent = info.isLinkedWorktree ? 'worktree isolado' : 'checkout principal';
  workspace$('gitRoot').textContent = info.root;
  workspace$('gitBranch').textContent = info.branch;
  workspace$('gitHead').textContent = info.head;
  workspace$('gitRemote').textContent = info.remote || 'sem origin';
  workspace$('gitStatus').textContent = info.clean ? 'limpo' : `${info.changes.length} mudança(s)`;
  workspace$('gitChanges').textContent = info.clean ? 'Working tree limpo.' : info.changes.join('\n');

  const collisions = await workspaceCollisions(state, agent, info.root);
  if (!isActive()) return info;

  const branchMismatch = Boolean(agent.expectedBranch && info.branch !== agent.expectedBranch);
  if (info.isLinkedWorktree && !branchMismatch) workspaceBadge('✓ WORKTREE ISOLADO', 'good');
  else if (info.isLinkedWorktree) workspaceBadge('⚠ WORKTREE / BRANCH DIVERGENTE', 'warn');
  else if (collisions.length > 0) workspaceBadge('⚠ WORKSPACE COMPARTILHADO', 'warn');
  else workspaceBadge('CHECKOUT PRINCIPAL', 'neutral');

  const warnings = [];
  if (branchMismatch) {
    warnings.push(`Branch atual: ${info.branch}. Esta aba espera: ${agent.expectedBranch}.`);
    if (!info.isLinkedWorktree && !info.clean) {
      warnings.push(`Não troque a branch neste checkout: existem ${info.changes.length} mudanças locais. Para isolar este agente, aponte a aba para um git worktree separado.`);
    } else if (!info.isLinkedWorktree) {
      warnings.push('Para trabalho multiagente, prefira um git worktree separado em vez de reutilizar este checkout principal.');
    }
  }
  if (collisions.length > 0) {
    warnings.push(`Este workspace Git também está associado a: ${collisions.map((item) => item.name).join(', ')}. As abas enxergam a mesma branch e mudanças locais.`);
  }

  if (warnings.length > 0) {
    workspace$('branchWarning').textContent = warnings.join('\n\n');
    workspace$('branchWarning').classList.remove('hidden');
  }
  return info;
}

async function copyWorkspaceContext(agent) {
  const info = agent.repoPath ? await window.agentHub.gitInfo(agent.repoPath) : null;
  const text = [
    `AGENT=${agent.name}`,
    `ACCOUNT=${agent.accountLabel || ''}`,
    `REPO_PATH=${agent.repoPath || ''}`,
    `REPO_ROOT=${info?.ok ? info.root : ''}`,
    `PROJECT=${info?.ok ? info.projectName : ''}`,
    `WORKSPACE_TYPE=${info?.ok ? info.workspaceType : ''}`,
    `REMOTE=${info?.ok ? info.remote : ''}`,
    `EXPECTED_BRANCH=${agent.expectedBranch || ''}`,
    `CURRENT_BRANCH=${info?.ok ? info.branch : ''}`,
    `HEAD_SHA=${info?.ok ? info.head : ''}`,
    `LOCAL_CHANGES=${info?.ok ? info.changes.length : ''}`,
    '', 'MISSION:', agent.mission || ''
  ].join('\n');
  await navigator.clipboard.writeText(text);
}

async function openWorkspaceRemote(agent) {
  if (!agent?.repoPath) return { ok: false, error: 'Selecione um workspace Git.' };
  const info = await window.agentHub.gitInfo(agent.repoPath);
  if (!info?.ok || !info.remoteWebUrl) return { ok: false, error: 'Remote GitHub não encontrado ou não reconhecido.' };
  await window.agentHub.openExternal(info.remoteWebUrl);
  return { ok: true };
}

window.agentWorkspace = {
  refresh: refreshWorkspace,
  notice: workspaceNotice,
  copyContext: copyWorkspaceContext,
  openRemote: openWorkspaceRemote
};
