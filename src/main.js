const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const util = require('util');

const execFileAsync = util.promisify(execFile);

let mainWindow;

function statePath() {
  return path.join(app.getPath('userData'), 'agents.json');
}

function defaultState() {
  return {
    version: 1,
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

function readState() {
  try {
    const raw = fs.readFileSync(statePath(), 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.agents)) return defaultState();
    return { ...defaultState(), ...parsed };
  } catch {
    const initial = defaultState();
    writeState(initial);
    return initial;
  }
}

function writeState(state) {
  const target = statePath();
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temp = `${target}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(temp, target);
}

async function runGit(repoPath, args) {
  if (!repoPath) throw new Error('Repositório não selecionado.');
  const { stdout } = await execFileAsync('git', ['-C', repoPath, ...args], {
    windowsHide: true,
    timeout: 8000,
    maxBuffer: 1024 * 1024 * 4
  });
  return stdout.trim();
}

async function getGitInfo(repoPath) {
  try {
    const [root, branch, head, status, remote] = await Promise.all([
      runGit(repoPath, ['rev-parse', '--show-toplevel']),
      runGit(repoPath, ['branch', '--show-current']),
      runGit(repoPath, ['rev-parse', '--short=12', 'HEAD']),
      runGit(repoPath, ['status', '--short']),
      runGit(repoPath, ['remote', 'get-url', 'origin']).catch(() => '')
    ]);

    const changes = status ? status.split(/\r?\n/).filter(Boolean) : [];
    return {
      ok: true,
      root,
      branch: branch || '(detached HEAD)',
      head,
      remote,
      changes,
      clean: changes.length === 0
    };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1500,
    height: 950,
    minWidth: 1050,
    minHeight: 700,
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
    writeState(state);
    return { ok: true };
  });

  ipcMain.handle('repo:pick', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Selecione o repositório Git',
      properties: ['openDirectory']
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('repo:gitInfo', (_event, repoPath) => getGitInfo(repoPath));
  ipcMain.handle('repo:openFolder', async (_event, repoPath) => {
    if (!repoPath) return { ok: false, error: 'Sem repositório.' };
    const error = await shell.openPath(repoPath);
    return error ? { ok: false, error } : { ok: true };
  });

  ipcMain.handle('external:open', (_event, url) => shell.openExternal(url));

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
