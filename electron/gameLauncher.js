// 桌面版 Minecraft Java 版启动核心
// 下载版本/库/资源，定位 Java，拼参启动真正的 Java 版游戏
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const crypto = require('crypto');
const zlib = require('zlib');
const { spawn } = require('child_process');
const { execSync } = require('child_process');

const VERSION_MANIFEST = 'https://launchermeta.mojang.com/mc/game/version_manifest_v2.json';
const RESOURCES = 'https://resources.download.minecraft.net';

function followGet(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { headers: { 'User-Agent': 'MAL-Launcher' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return resolve(followGet(res.headers.location));
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('HTTP ' + res.statusCode + ' ' + url)); }
      resolve(res);
    });
    req.on('error', reject);
    req.setTimeout(60000, () => req.destroy(new Error('timeout ' + url)));
  });
}

function getJson(url) {
  return followGet(url).then((res) => new Promise((resolve, reject) => {
    let d = '';
    res.on('data', (c) => (d += c));
    res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
  }));
}

function download(url, dest, sha1) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest) && (!sha1 || fileSha1(dest) === sha1)) return resolve(dest);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const tmp = dest + '.part';
    followGet(url).then((res) => {
      const out = fs.createWriteStream(tmp);
      res.pipe(out);
      out.on('finish', () => {
        out.close(() => {
          if (sha1 && fileSha1(tmp) !== sha1) {
            fs.unlink(tmp, () => {});
            return reject(new Error('校验失败 ' + path.basename(dest)));
          }
          fs.renameSync(tmp, dest);
          resolve(dest);
        });
      });
      out.on('error', reject);
    }).catch(reject);
  });
}

function fileSha1(p) {
  return crypto.createHash('sha1').update(fs.readFileSync(p)).digest('hex');
}

function offlineUUID(username) {
  const hash = crypto.createHash('md5').update('OfflinePlayer:' + username).digest();
  hash[6] = (hash[6] & 0x0f) | 0x30;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.toString('hex');
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
}

function findJava() {
  const home = process.env.JAVA_HOME;
  if (home) {
    const exe = path.join(home, 'bin', process.platform === 'win32' ? 'java.exe' : 'java');
    if (fs.existsSync(exe)) return exe;
  }
  try {
    const found = execSync(process.platform === 'win32' ? 'where java' : 'command -v java').toString().trim().split(/\r?\n/)[0];
    if (found) return found;
  } catch {}
  return null;
}

function nativesSuffix() {
  if (process.platform === 'win32') return 'natives-windows';
  if (process.platform === 'darwin') return 'natives-macos';
  return 'natives-linux';
}

async function prepare(versionId, gameDir, onProgress) {
  const manifest = await getJson(VERSION_MANIFEST);
  const entry = manifest.versions.find((v) => v.id === versionId);
  if (!entry) throw new Error('未找到版本：' + versionId);

  const vDir = path.join(gameDir, 'versions', versionId);
  const vJsonPath = path.join(vDir, versionId + '.json');
  const versionJson = await getJson(entry.url);
  fs.mkdirSync(vDir, { recursive: true });
  fs.writeFileSync(vJsonPath, JSON.stringify(versionJson, null, 2));

  const clientPath = path.join(vDir, versionId + '.jar');
  if (versionJson.downloads && versionJson.downloads.client) {
    const c = versionJson.downloads.client;
    await download(c.url, clientPath, c.sha1);
  }

  const libs = versionJson.libraries || [];
  const classpath = [clientPath];
  const nativeJars = [];
  for (let i = 0; i < libs.length; i++) {
    const lib = libs[i];
    if (lib.rules && !allowRules(lib.rules)) continue;
    const dl = lib.downloads || {};
    const suf = nativesSuffix();
    if (dl.artifact && dl.artifact.path) {
      const p = path.join(gameDir, 'libraries', dl.artifact.path);
      await download(dl.artifact.url, p, dl.artifact.sha1);
      classpath.push(p);
      if (dl.artifact.path.endsWith('.jar') && /natives|lwjgl/.test(dl.artifact.path)) {
        if (await jarHasNative(p)) nativeJars.push(p);
      }
    }
    if (dl.classifiers && dl.classifiers[suf]) {
      const n = dl.classifiers[suf];
      const p = path.join(gameDir, 'libraries', n.path);
      await download(n.url, p, n.sha1);
      nativeJars.push(p);
    }
    onProgress(Math.round((i / libs.length) * 60), '下载依赖库 ' + (lib.name || ''));
  }

  const assetIndex = versionJson.assetIndex;
  if (assetIndex) {
    const idxPath = path.join(gameDir, 'assets', 'indexes', assetIndex.id + '.json');
    await download(assetIndex.url, idxPath, assetIndex.sha1);
    const idx = JSON.parse(fs.readFileSync(idxPath, 'utf8'));
    const objs = Object.values(idx.objects || {});
    for (let i = 0; i < objs.length; i++) {
      const o = objs[i];
      const sub = o.hash.slice(0, 2);
      const p = path.join(gameDir, 'assets', 'objects', sub, o.hash);
      if (!fs.existsSync(p)) await download(RESOURCES + '/' + sub + '/' + o.hash, p, o.hash);
      if (i % 50 === 0) onProgress(60 + Math.round((i / objs.length) * 35), '下载资源文件 ' + i + '/' + objs.length);
    }
    onProgress(95, '资源文件完成');
  }

  return { versionJson, classpath, nativeJars, vDir };
}

function allowRules(rules) {
  let allow = false;
  for (const r of rules) {
    let applies = true;
    if (r.os) {
      const osName = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'osx' : 'linux';
      applies = r.os.name === osName;
    }
    if (applies) allow = r.action === 'allow';
  }
  return allow;
}

async function jarHasNative(jar) {
  const data = fs.readFileSync(jar);
  return data.includes(Buffer.from('.so')) || data.includes(Buffer.from('.dll')) || data.includes(Buffer.from('.dylib'));
}

async function launch({ gameDir, malHome, version, username, onProgress }) {
  onProgress(0, '准备游戏环境');
  const { versionJson, classpath, nativeJars, vDir } = await prepare(version, gameDir, onProgress);

  const nativeDir = path.join(vDir, 'natives');
  fs.mkdirSync(nativeDir, { recursive: true });
  for (const jar of nativeJars) await extractNatives(jar, nativeDir);

  const java = findJava();
  if (!java) {
    throw new Error('未找到 Java。请安装 Java 17/21 或设置 JAVA_HOME，然后重试。');
  }

  const uuid = offlineUUID(username);
  const cp = classpath.join(process.platform === 'win32' ? ';' : ':');
  const args = [
    `-Djava.library.path=${nativeDir}`,
    '-Dminecraft.launcher.brand=MAL',
    '-Xmx2G', '-Xms512M',
    '-cp', cp,
    versionJson.mainClass,
    '--username', username,
    '--version', version,
    '--gameDir', gameDir,
    '--assetsDir', path.join(gameDir, 'assets'),
    '--assetIndex', versionJson.assets || (versionJson.assetIndex && versionJson.assetIndex.id),
    '--uuid', uuid,
    '--accessToken', '0',
    '--userType', 'legacy',
    '--versionType', 'release',
  ].filter(Boolean);

  onProgress(100, '启动游戏');
  const child = spawn(java, args, { cwd: gameDir, stdio: 'inherit' });
  return { pid: child.pid };
}

async function extractNatives(jar, destDir) {
  const buf = fs.readFileSync(jar);
  let off = 0;
  const files = [];
  while (off < buf.length - 4) {
    const sig = buf.readUInt32LE(off);
    if (sig !== 0x04034b50) break;
    const method = buf.readUInt16LE(off + 8);
    const compSize = buf.readUInt32LE(off + 18);
    const nameLen = buf.readUInt16LE(off + 26);
    const extraLen = buf.readUInt16LE(off + 28);
    const name = buf.slice(off + 30, off + 30 + nameLen).toString('utf8');
    const dataStart = off + 30 + nameLen + extraLen;
    const data = buf.slice(dataStart, dataStart + compSize);
    if (/\.(so|dll|dylib)$/.test(name) && !name.includes('..')) {
      files.push({ name, method, data });
    }
    off = dataStart + compSize;
  }
  for (const f of files) {
    const out = path.join(destDir, path.basename(f.name));
    let content = f.data;
    if (f.method === 8) {
      try { content = zlib.inflateRawSync(f.data); } catch { continue; }
    }
    fs.writeFileSync(out, content);
  }
}

module.exports = { launch };
