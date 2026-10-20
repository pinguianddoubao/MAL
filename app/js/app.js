// ===== 主应用控制（含 MAL 服务端 AI 管理）=====
class App {
  constructor() {
    this.currentPage = 'home';
    if (typeof i18n !== 'undefined') {
      i18n.apply();
      this.initLanguage();
    }
    this.init();
    this.initServerIntegration();
  }

  initLanguage() {
    const sel = document.getElementById('languageSelect');
    if (sel) {
      sel.value = i18n.lang;
      sel.addEventListener('change', () => {
        i18n.setLang(sel.value);
        const info = document.getElementById('nativeAccountInfo');
        if (info && this.nativeAccount) {
          info.textContent = i18n.t('current_account') + this.nativeAccount.username;
        }
      });
    }
  }

  init() {
    document.querySelectorAll('.nav-btn, .mobile-nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        if (page) this.switchPage(page);
      });
    });

    const launchBtn = document.getElementById('launchBtn');
    if (launchBtn) launchBtn.addEventListener('click', () => this.launchGame());

    if (window.MALBridge && window.MALBridge.isNative()) {
      this.initNative();
    }
  }

  initNative() {
    this.selectedVersion = '';
    document.getElementById('nativeAccount').classList.remove('hidden');

    const showAccount = () => {
      const acc = JSON.parse(window.MALBridge.getCurrentAccount() || 'null');
      const info = document.getElementById('nativeAccountInfo');
      if (acc) {
        info.textContent = i18n.t('current_account') + acc.username;
        this.nativeAccount = acc;
      }
    };
    showAccount();

    document.getElementById('nativeLoginBtn').addEventListener('click', () => {
      const name = document.getElementById('nativeUsername').value.trim();
      if (!/^[a-zA-Z0-9_]{3,16}$/.test(name)) {
        window.MALBridge.toast('用户名需为 3-16 位字母数字或下划线');
        return;
      }
      window.MALBridge.localLogin(name);
      showAccount();
    });

    document.getElementById('microsoftLoginBtn').addEventListener('click', () => {
      window.MALBridge.microsoftLogin();
    });

    window.MALAccountChanged = (json) => {
      const acc = JSON.parse(json || 'null');
      const info = document.getElementById('nativeAccountInfo');
      if (acc) {
        info.textContent = i18n.t('current_account') + acc.username;
        this.nativeAccount = acc;
      }
    };

    const dropdown = document.getElementById('versionDropdown');
    window.MALBridge.requestVersions('versions');
    window.MALBridgeCallback = (id, versions) => {
      if (id !== 'versions' || !versions) return;
      dropdown.innerHTML = '';
      versions.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.id;
        opt.textContent = v.id + (v.type === 'release' ? '' : ' (' + v.type + ')');
        dropdown.appendChild(opt);
      });
      this.selectedVersion = dropdown.value;
    };
    dropdown.addEventListener('change', () => { this.selectedVersion = dropdown.value; });
  }

  switchPage(page) {
    this.currentPage = page;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById('page-' + page);
    if (target) target.classList.add('active');
    document.querySelectorAll('.nav-btn, .mobile-nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.page === page);
    });
    if (page === 'ai') this.refreshAIStatus();
  }

  launchGame() {
    if (window.MALBridge && window.MALBridge.isNative()) {
      const version = this.selectedVersion || '';
      malServer.reportLaunch({ action: 'game_launch' });
      window.MALBridge.launchGame(version);
      return;
    }
    const btn = document.getElementById('launchBtn');
    const textEl = btn.querySelector('.launch-text');
    const original = textEl.textContent;
    textEl.textContent = '启动中...';
    btn.style.opacity = '0.7';
    btn.style.pointerEvents = 'none';

    malServer.reportLaunch({ action: 'game_launch' });

    setTimeout(() => {
      textEl.textContent = original;
      btn.style.opacity = '1';
      btn.style.pointerEvents = '';
      this.showGameWindow();
    }, 1500);
  }

  showGameWindow() {
    let overlay = document.getElementById('gameWindowOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'gameWindowOverlay';
      overlay.className = 'game-window-overlay';
      overlay.innerHTML = `
        <div class="game-window">
          <div class="game-window-bar">
            <span class="game-window-title">Minecraft</span>
            <button class="game-window-close" id="gameWindowClose">✕</button>
          </div>
          <div class="game-window-content">
            <div class="game-mc-title">Minecraft</div>
            <div class="game-menu-buttons">
              <button class="game-menu-btn">单人游戏</button>
              <button class="game-menu-btn">多人游戏</button>
              <button class="game-menu-btn">选项...</button>
              <button class="game-menu-btn" id="gameQuitBtn">退出游戏</button>
            </div>
            <div class="game-splash-text">MAL 已启动游戏</div>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      document.getElementById('gameWindowClose').onclick = () => overlay.remove();
      document.getElementById('gameQuitBtn').onclick = () => overlay.remove();
      overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    }
    overlay.style.display = 'flex';
  }

  async initServerIntegration() {
    const urlInput = document.getElementById('serverUrlInput');
    if (urlInput) urlInput.value = malServer.serverUrl;

    const modeBtns = document.querySelectorAll('.mode-btn');
    const applyModeUI = (mode) => {
      modeBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
      document.getElementById('serverUrlRow').style.display = mode === 'remote' ? 'flex' : 'none';
    };
    modeBtns.forEach(b => b.addEventListener('click', () => {
      malServer.setMode(b.dataset.mode);
      applyModeUI(b.dataset.mode);
    }));
    applyModeUI(malServer.mode);

    document.getElementById('saveServerBtn')?.addEventListener('click', async () => {
      if (malServer.mode === 'remote') {
        const url = document.getElementById('serverUrlInput').value.trim();
        if (url) malServer.setServerUrl(url);
      }
      localStorage.setItem('mal_auto_update', document.getElementById('autoUpdateSwitch').checked);
      await this.connectServer();
      alert('已保存');
    });

    document.getElementById('reconnectBtn')?.addEventListener('click', () => this.connectServer());

    document.getElementById('featureUpdates')?.addEventListener('click', () => this.aiCheckUpdates());
    document.getElementById('featureMaintenance')?.addEventListener('click', () => this.aiMaintenance());
    document.getElementById('featureRecommend')?.addEventListener('click', () => this.aiRecommend());
    document.getElementById('featureDiagnose')?.addEventListener('click', () => this.aiDiagnose());
    document.getElementById('aiResultClose')?.addEventListener('click', () => {
      document.getElementById('aiResultPanel').classList.remove('show');
    });
    document.getElementById('updateBannerBtn')?.addEventListener('click', () => this.switchPage('ai'));

    await this.connectServer();

    if (malServer.autoUpdate) {
      setTimeout(() => this.autoCheckUpdates(), 2000);
    }

    setInterval(() => { if (this.currentPage === 'ai') this.refreshAIStatus(); }, 15000);
  }

  async connectServer() {
    const indicator = document.getElementById('connIndicator');
    const title = document.getElementById('connTitle');
    const urlEl = document.getElementById('connUrl');

    indicator.className = 'conn-indicator connecting';
    title.textContent = '正在启动 MAL 服务端...';
    urlEl.textContent = malServer.mode === 'local' ? '本机运行（数据存于本设备）' : malServer.serverUrl;

    const ok = await malServer.connect();

    if (ok) {
      indicator.className = 'conn-indicator online';
      title.textContent = malServer.mode === 'local'
        ? '本地服务端运行中 · AI 管理与进化已启用'
        : '已连接远程服务端 · AI 管理运行中';
      this.refreshAIStatus();
    } else {
      indicator.className = 'conn-indicator offline';
      title.textContent = '远程服务端连接失败';
    }
  }

  async refreshAIStatus() {
    const status = await malServer.getStatus();
    if (!status) return;
    document.getElementById('statUptime').textContent = Math.floor(status.uptime) + 's';
    document.getElementById('statLaunches').textContent = status.stats.totalLaunches;
    document.getElementById('statUpdates').textContent = status.updatesAvailable.length;

    const evo = await malServer.getEvolution();
    const sec = await malServer.getSecurity();
    if (evo) {
      document.getElementById('statHealth').textContent = 'G' + evo.generation + '·' + evo.intelligenceLevel;
      const urlEl = document.getElementById('connUrl');
      if (urlEl && malServer.mode === 'local') {
        urlEl.textContent = `第${evo.generation}代 · 智能${evo.intelligenceLevel} · 安全${sec?sec.securityScore:''}分 · ${evo.daysUntilEvolution}天后进化`;
      }
    } else {
      document.getElementById('statHealth').textContent = status.systemHealth;
    }
  }

  showResult(title, html) {
    document.getElementById('aiResultTitle').textContent = title;
    document.getElementById('aiResultBody').innerHTML = html;
    document.getElementById('aiResultPanel').classList.add('show');
  }

  async aiCheckUpdates() {
    this.showResult('检查更新', '<div class="loading-text">AI 正在检查启动器与模组更新...</div>');
    const data = await malServer.checkUpdates();
    if (!data) {
      this.showResult('检查更新', '<p>服务端离线，无法检查</p>');
      return;
    }
    const all = [...data.launcher, ...data.mods];
    if (all.length === 0) {
      this.showResult('检查更新', '<p>✅ 所有组件均为最新版本</p>');
    } else {
      this.showResult(`发现 ${all.length} 个更新`, all.map(u => `
        <div class="result-item">
          <h4>${u.modName || '启动器'} ${u.currentVersion || ''} → ${u.latestVersion}</h4>
          <p>${(u.changelog || []).join('、')}</p>
        </div>`).join(''));
    }
    this.refreshAIStatus();
  }

  async aiMaintenance() {
    this.showResult('系统维护', '<div class="loading-text">AI 正在执行系统维护（清理缓存、优化、备份）...</div>');
    const tasks = await malServer.runMaintenance();
    if (!tasks) {
      this.showResult('系统维护', '<p>服务端离线，无法维护</p>');
      return;
    }
    this.showResult('维护完成', tasks.map(t => `
      <div class="result-item"><h4>✅ ${t.name}</h4><p>状态: ${t.status}</p></div>`).join(''));
    this.refreshAIStatus();
  }

  async aiRecommend() {
    this.showResult('智能推荐', '<div class="loading-text">AI 正在分析你的使用习惯与硬件配置...</div>');
    const prefs = { lowEndPC: navigator.deviceMemory ? navigator.deviceMemory <= 4 : false };
    const recs = await malServer.getRecommendations(prefs);
    if (recs.length === 0) {
      this.showResult('智能推荐', '<p>服务端离线，暂无推荐</p>');
      return;
    }
    this.showResult('为你推荐', recs.map(r => `
      <div class="result-item">
        <h4>${r.name} <span class="confidence">${Math.round(r.confidence*100)}% 匹配</span></h4>
        <p class="result-reason">${r.reason}</p>
      </div>`).join(''));
  }

  async aiDiagnose() {
    const err = prompt('请粘贴错误信息（或输入关键词，如 OutOfMemory）：', 'java.lang.OutOfMemoryError');
    if (!err) return;
    this.showResult('错误诊断', '<div class="loading-text">AI 正在诊断错误原因...</div>');
    const diag = await malServer.diagnose(err);
    if (!diag) {
      this.showResult('错误诊断', '<p>服务端离线，无法诊断</p>');
      return;
    }
    this.showResult('诊断结果', `
      <div class="result-item">
        <h4>原因：${diag.cause}</h4>
        <p>严重程度：${diag.severity === 'high' ? '高' : diag.severity === 'medium' ? '中' : '低'}</p>
        <p class="result-reason">解决方案：${diag.solution}</p>
        ${diag.relatedMods.length ? '<p class="result-reason">相关模组：' + diag.relatedMods.join('、') + '</p>' : ''}
      </div>`);
  }

  async autoCheckUpdates() {
    const data = await malServer.checkUpdates();
    if (!data) return;
    const total = data.launcher.length + data.mods.length;
    if (total > 0) {
      const banner = document.getElementById('updateBanner');
      const parts = [];
      if (data.launcher.length) parts.push(`启动器 v${data.launcher[0].latestVersion}`);
      if (data.mods.length) parts.push(`${data.mods.length} 个模组`);
      document.getElementById('updateBannerText').textContent = `AI 发现更新：${parts.join('，')}`;
      banner.classList.remove('hidden');
    }
  }
}

const observer = new MutationObserver(() => {
  const mainApp = document.getElementById('mainApp');
  if (mainApp && !mainApp.classList.contains('hidden')) {
    observer.disconnect();
    new App();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const mainApp = document.getElementById('mainApp');
  if (mainApp) observer.observe(mainApp, { attributes: true, attributeFilter: ['class'] });
});
