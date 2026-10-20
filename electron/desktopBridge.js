// 桌面版 IPC 桥接：账号 / 版本 / 游戏启动
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const gameLauncher = require('./gameLauncher');

function get(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { headers: { 'User-Agent': 'MAL-Launcher' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(get(res.headers.location, headers));
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('HTTP ' + res.statusCode)); }
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(30000, () => req.destroy(new Error('timeout')));
  });
}

function getJson(url) {
  return get(url).then((s) => JSON.parse(s));
}

module.exports = {
  register(ipcMain, ctx) {
    const { MAL_HOME } = ctx;
    const accountsFile = path.join(MAL_HOME, 'mal-accounts.json');
    const currentAccountFile = path.join(MAL_HOME, 'mal-current.json');

    const loadAccounts = () => {
      try { return JSON.parse(fs.readFileSync(accountsFile, 'utf8')); } catch { return []; }
    };
    const saveAccounts = (list) => fs.writeFileSync(accountsFile, JSON.stringify(list, null, 2));

    ipcMain.handle('toast', () => {});
    ipcMain.handle('getGameDir', () => path.join(MAL_HOME, 'minecraft'));
    ipcMain.handle('getDataDir', () => MAL_HOME);

    ipcMain.handle('localLogin', (_e, username) => {
      const list = loadAccounts();
      let acc = list.find((a) => a.username === username);
      if (!acc) {
        acc = { username, type: 'offline' };
        list.push(acc);
        saveAccounts(list);
      }
      fs.writeFileSync(currentAccountFile, JSON.stringify(acc));
      return acc;
    });

    ipcMain.handle('getCurrentAccount', () => {
      try { return JSON.parse(fs.readFileSync(currentAccountFile, 'utf8')); } catch { return null; }
    });

    ipcMain.handle('getAccountList', () => loadAccounts());

    ipcMain.handle('microsoftLogin', async () => {
      return { ok: false, message: '桌面端微软登录将在后续版本接入，请先用离线登录' };
    });

    ipcMain.handle('requestVersions', async () => {
      try {
        const manifest = await getJson('https://launchermeta.mojang.com/mc/game/version_manifest_v2.json');
        return manifest.versions.map((v) => ({ id: v.id, type: v.type, url: v.url }));
      } catch (e) {
        return [];
      }
    });

    ipcMain.handle('launchGame', async (_e, version) => {
      let acc = null;
      try { acc = JSON.parse(fs.readFileSync(currentAccountFile, 'utf8')); } catch {}
      if (!acc) return { ok: false, error: '请先登录（创建账号）' };

      const win = ctx.getWindow();
      const progress = (pct, text) => {
        win && win.webContents.send('launchProgress', { pct, text });
      };

      try {
        const result = await gameLauncher.launch({
          gameDir: path.join(MAL_HOME, 'minecraft'),
          malHome: MAL_HOME,
          version,
          username: acc.username,
          onProgress: progress,
        });
        return { ok: true, pid: result.pid };
      } catch (err) {
        progress(0, '启动失败：' + err.message);
        return { ok: false, error: err.message };
      }
    });
  },
};
