const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { execFile } = require('child_process');
const util = require('util');

const execFileAsync = util.promisify(execFile);
const STATE_VERSION = 2;
const RELEASES_API = '/repos/washingtonmsdj/ordax-agent-hub/releases?per_page=20';

let mainWindow;

function statePath() {
  return path.join(app.getPath('userData'), 'agents.json');
}

function backupStatePath() {
  return path.join(app.getPath('userData'), 'agents.json.bak');
}

function defaultState() {
  return {
    version: STATE_VERSION,
    agents: [
      {
        id: 'foundation',
        name: 'Foundation',
        accountLabel: 'Conta GPT 1',
        profileId: 'foundation',
        repoPath: '',
        expectedBranch: 'codex/foundation-vnext',
        mission: 'Foundation vNext / PR #79',
        lastUrl: 'https://chatgpt.com/'
      },
      {
        id: 'app-platform',
        name: 'App Platform',
        accountLabel: 'Conta GPT 2',
        profileId: 'app-platform',
        repoPath: '',
        expectedBranch: 'agent/app-platform',
        mission: 'App Runtime / SDK / capabilities',
        lastUrl: 'https://chatgpt.com/'
      },
      {
        id: 'core-apps',
        name: 'Core Apps',
        accountLabel: 'Conta GPT 3',
        profileId: 'core-apps',
        repoPath: '',
        expectedBranch: 'agent/core-apps',
        mission: 'Calculator, Notes, Clock e apps userland',
        lastUrl: 'https://chatgpt.com/'
      },
      {
        id: 'qa-tools',
        name: 'QA / Tools',
        accountLabel: 'Conta GPT 4',
        profileId: 'qa-tools',
        repoPath: '',
        expectedBranch: 'agent/qa-tools',
        mission: 'QA, test harness, manifests e CI',
        lastUrl: 'https://chatgpt.com/'
      }
    ],
    activeAgentId: 'foundation',
    suspendAfterMinutes: 10
  };
}

function migrateState(parsed) {
  if (!parsed || !Array.isArray(parsed.agents)) throw new Error('Estado inválido.');
  const defaults = defaultState();
  const agents = parsed.agents.map((agent, index) => ({
    id: agent.id || `agent-${index + 1}`,
    name: agent.name || `Agente ${index + 1}`,
    accountLabel: agent.accountLabel || '',
    profileId: agent.profileId || agent.id || `agent-${index + 1}`,
    repoPath: agent.repoPath || '',
    expectedBranch: agent.expectedBranch || '',
    mission: agent.mission || '',
    lastUrl: agent.lastUrl || 'https://chatgpt.com/'
  }));

  return {
    ...defaults,
    ...parsed,
    version: STATE_VERSION,
    agents,
    activeAgentId: agents.some((agent) => agent.id === parsed.activeAgentId)
      ? parsed.activeAgentId
      : agents[0]?.id || defaults.activeAgentId
  };
}

function writeState(state, { backupExisting = true } = {}) {
  const target = statePath();
  const backup = backupStatePath();
  fs.mkdirSync(path.dirname(target), { recursive: true });

  if (backupExisting && fs.existsSync(target)) {
    fs.copyFileSync(target, backup);
  }

  const temp = `${target}.tmp`;
  const fd = fs.openSync(temp, 'w');
  try {
    fs.writeFileSync(fd, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(temp, target);
}

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readState() {
  const target = statePath();
  const backup = backupStatePath();

  try {
    const parsed = readJsonFile(target);
    const migrated = migrateState(parsed);
    if (parsed.version !== STATE_VERSION) writeState(migrated);
    return migrated;
  } catch (primaryError) {
    try {
      const migratedBackup = migrateState(readJsonFile(backup));
      writeState(migratedBackup, { backupExisting: false });
      return migratedBackup;
    } catch {
      const initial = defaultState();
      writeState(initial, { backupExisting: false });
      return initial;
    }
  }
}

async function runGit(repoPath, args) {
  if (!repoPath) throw new Error('Workspace Git não selecionado.');
  const { stdout } = await execFileAsync('git', ['-C', repoPath, ...args], {
    windowsHide: true,
    timeout: 8000,
    maxBuffer: 1024 * 1024 * 4
  });
  return stdout.trim();
}

function comparablePath(value) {
  const normalized = path.resolve(value).replace(/[\\/]+$/, '');
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

function remoteToWebUrl(remote) {
  if (!remote) return '';
  let url = remote.trim().replace(/\.git$/, '');
  if (url.startsWith('git@github.com:')) url = `https://github.com/${url.slice('git@github.com:'.length)}`;
  if (url.startsWith('ssh://git@github.com/')) url = `https://github.com/${url.slice('ssh://git@github.com/'.length)}`;
  return /^https:\/\/github\.com\//i.test(url) ? url : '';
}

async function absoluteGitPath(root, selector) {
  try {
    return await runGit(root, ['rev-parse', '--path-format=absolute', selector]);
  } catch {
    const raw = await runGit(root, ['rev-parse', selector]);
    return path.isAbsolute(raw) ? path.normalize(raw) : path.resolve(root, raw);
  }
}

async function getGitInfo(repoPath) {
  try {
    const selectedPath = path.resolve(repoPath);
    const root = path.resolve(await runGit(selectedPath, ['rev-parse', '--show-toplevel']));
    const [branch, head, status, remote, upstream, gitDir, commonDir] = await Promise.all([
      runGit(root, ['branch', '--show-current']),
      runGit(root, ['rev-parse', '--short=12', 'HEAD']),
      runGit(root, ['status', '--short']),
      runGit(root, ['remote', 'get-url', 'origin']).catch(() => ''),
      runGit(root, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']).catch(() => ''),
      absoluteGitPath(root, '--git-dir'),
      absoluteGitPath(root, '--git-common-dir')
    ]);

    const changes = status ? status.split(/\r?\n/).filter(Boolean) : [];
    const isLinkedWorktree = comparablePath(gitDir) !== comparablePath(commonDir);
    const isSubdirectorySelection = comparablePath(selectedPath) !== comparablePath(root);
    const remoteWebUrl = remoteToWebUrl(remote);

    return {
      ok: true,
      selectedPath,
      root,
      projectName: path.basename(root),
      branch: branch || '(detached HEAD)',
      expectedUpstream: upstream,
      head,
      remote,
      remoteWebUrl,
      gitDir,
      commonDir,
      isLinkedWorktree,
      isSubdirectorySelection,
      workspaceType: isLinkedWorktree ? 'linked-worktree' : 'primary-checkout',
      changes,
      clean: changes.length === 0
    };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

function githubJson(apiPath) {
  return new Promise((resolve, reject) => {
    const request = https.request({
      hostname: 'api.github.com',
      path: apiPath,
      method: 'GET',
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': `OrdaX-Agent-Hub/${app.getVersion()}`,
        'X-GitHub-Api-Version': '2022-11-28'
      },
      timeout: 8000
    }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`GitHub respondeu HTTP ${response.statusCode}.`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch {
          reject(new Error('Resposta de atualização inválida.'));
        }
      });
    });
    request.on('timeout', () => request.destroy(new Error('Tempo esgotado ao verificar atualização.')));
    request.on('error', reject);
    request.end();
  });
}

function parseVersion(value) {
  const clean = String(value || '').trim().replace(/^v/i, '');
  const [core, prerelease = ''] = clean.split('-', 2);
  const numbers = core.split('.').map((part) => Number.parseInt(part, 10) || 0);
  return { numbers: [numbers[0] || 0, numbers[1] || 0, numbers[2] || 0], prerelease };
}

function compareVersions(left, right) {
  const a = parseVersion(left);
  const b = parseVersion(right);
  for (let index = 0; index < 3; index += 1) {
    if (a.numbers[index] !== b.numbers[index]) return a.numbers[index] > b.numbers[index] ? 1 : -1;
  }
  if (a.prerelease === b.prerelease) return 0;
  if (!a.prerelease) return 1;
  if (!b.prerelease) return -1;
  return a.prerelease.localeCompare(b.prerelease, undefined, { numeric: true });
}

async function checkForUpdates() {
  try {
    const releases = await githubJson(RELEASES_API);
    const latest = Array.isArray(releases) ? releases.find((release) => !release.draft) : null;
    const currentVersion = app.getVersion();
    if (!latest) return { ok: true, currentVersion, hasUpdate: false, latestVersion: null };
    const latestVersion = String(latest.tag_name || latest.name || '').replace(/^v/i, '');
    return {
      ok: true,
      currentVersion,
      latestVersion,
      hasUpdate: compareVersions(latestVersion, currentVersion) > 0,
      url: latest.html_url || 'https://github.com/washingtonmsdj/ordax-agent-hub/releases',
      prerelease: Boolean(latest.prerelease),
      releaseName: latest.name || latest.tag_name || latestVersion
    };
  } catch (error) {
    return { ok: false, currentVersion: app.getVersion(), error: error.message || String(error) };
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1540,
    height: 980,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: '#0f1115',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => {
  ipcMain.handle('state:get', () => readState());
  ipcMain.handle('state:set', (_event, state) => {
    writeState(migrateState(state));
    return { ok: true };
  });

  ipcMain.handle('repo:pick', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Selecione um checkout ou worktree Git',
      properties: ['openDirectory']
    });
    if (result.canceled) return null;

    const selectedPath = result.filePaths[0];
    const info = await getGitInfo(selectedPath);
    if (!info.ok) {
      await dialog.showMessageBox(mainWindow, {
        type: 'warning',
        title: 'Pasta não é um workspace Git',
        message: 'A pasta selecionada não pertence a um repositório Git.',
        detail: 'Selecione a raiz de um clone ou um git worktree. Nenhuma configuração foi alterada.'
      });
      return { ok: false, error: info.error };
    }

    return {
      ok: true,
      path: info.root,
      info,
      normalizedFrom: info.isSubdirectorySelection ? selectedPath : null
    };
  });

  ipcMain.handle('repo:gitInfo', (_event, repoPath) => getGitInfo(repoPath));
  ipcMain.handle('repo:openFolder', async (_event, repoPath) => {
    if (!repoPath) return { ok: false, error: 'Sem workspace.' };
    const info = await getGitInfo(repoPath);
    const target = info.ok ? info.root : repoPath;
    const error = await shell.openPath(target);
    return error ? { ok: false, error } : { ok: true };
  });

  ipcMain.handle('app:getVersion', () => app.getVersion());
  ipcMain.handle('app:checkUpdates', () => checkForUpdates());
  ipcMain.handle('external:open', (_event, url) => shell.openExternal(url));

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
