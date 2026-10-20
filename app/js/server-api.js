// ===== MAL 服务端对接（支持本地模式 / 远程模式）=====
class MALServer {
  constructor() {
    this.mode = localStorage.getItem('mal_server_mode') || 'local';
    this.serverUrl = localStorage.getItem('mal_server_url') || 'http://localhost:3000';
    this.connected = false;
    this.serverStatus = null;
    this.autoUpdate = localStorage.getItem('mal_auto_update') !== 'false';
    this.clientVersion = '2.1.0';
  }

  setMode(mode) {
    this.mode = mode;
    localStorage.setItem('mal_server_mode', mode);
  }

  setServerUrl(url) {
    this.serverUrl = url.replace(/\/$/, '');
    localStorage.setItem('mal_server_url', this.serverUrl);
  }

  async remoteRequest(endpoint, options={}) {
    try {
      const res = await fetch(this.serverUrl + endpoint, {
        headers:{'Content-Type':'application/json'}, ...options
      });
      if (!res.ok) throw new Error('HTTP '+res.status);
      return await res.json();
    } catch(e) {
      console.warn('[远程] 请求失败:', e.message);
      return { success:false, error:e.message, offline:true };
    }
  }

  async connect() {
    if (this.mode === 'local') {
      this.connected = true;
      return true;
    }
    const r = await this.remoteRequest('/api/ai/status');
    this.connected = r.success;
    if (r.success) this.serverStatus = r.data;
    return this.connected;
  }

  async checkUpdates() {
    if (this.mode === 'local') return await LocalServer.checkUpdates();
    const r = await this.remoteRequest('/api/ai/updates');
    return r.success ? r.data : null;
  }

  async getRecommendations(prefs={}) {
    if (this.mode === 'local') return await LocalServer.getRecommendations(prefs);
    const r = await this.remoteRequest('/api/ai/recommendations',
      {method:'POST', body:JSON.stringify(prefs)});
    return r.success ? r.data : [];
  }

  async diagnose(message) {
    if (this.mode === 'local') return await LocalServer.diagnose({message});
    const r = await this.remoteRequest('/api/ai/diagnose',
      {method:'POST', body:JSON.stringify({message})});
    return r.success ? r.data : null;
  }

  async runMaintenance() {
    if (this.mode === 'local') return await LocalServer.runMaintenance();
    const r = await this.remoteRequest('/api/ai/maintenance',{method:'POST'});
    return r.success ? r.data : null;
  }

  reportLaunch(data={}) {
    if (this.mode === 'local') return LocalServer.reportLaunch(data);
    return this.remoteRequest('/api/ai/launch',
      {method:'POST', body:JSON.stringify({version:this.clientVersion, ...data})});
  }

  async getStatus() {
    if (this.mode === 'local') return LocalServer.getAIStatus();
    const r = await this.remoteRequest('/api/ai/status');
    return r.success ? r.data : null;
  }

  async getEvolution() {
    if (this.mode === 'local') return LocalServer.getEvolutionStatus();
    const r = await this.remoteRequest('/api/system/evolution');
    return r.success ? r.data : null;
  }
  async triggerEvolution() {
    if (this.mode === 'local') return await LocalServer.evolve();
    const r = await this.remoteRequest('/api/system/evolution/trigger',{method:'POST'});
    return r.success ? r.data : null;
  }

  async getSecurity() {
    if (this.mode === 'local') return LocalServer.getSecurityStatus();
    const r = await this.remoteRequest('/api/system/security');
    return r.success ? r.data : null;
  }
  async integrityCheck() {
    if (this.mode === 'local') return LocalServer.checkIntegrity();
    const r = await this.remoteRequest('/api/system/security/integrity',{method:'POST'});
    return r.success ? r.data : null;
  }
  async establishBaseline() {
    if (this.mode === 'local') return LocalServer.establishBaseline();
    const r = await this.remoteRequest('/api/system/security/baseline',{method:'POST'});
    return r.success;
  }
}

const malServer = new MALServer();
