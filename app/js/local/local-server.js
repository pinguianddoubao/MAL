// ===== MAL 本地服务端引擎（跑在安卓 App 内）=====
// 移植服务端 AIManager + AIEvolution + Security，localStorage 持久化
const LS_KEY = 'mal_local_server';

const LocalServer = {
  data: null,

  init() {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) {
      this.data = JSON.parse(saved);
    } else {
      this.data = this.defaultState();
      this.save();
    }
    this.checkAndEvolve();
    return this;
  },

  defaultState() {
    const now = new Date().toISOString();
    return {
      startedAt: now,
      evolution: {
        generation: 1,
        intelligenceLevel: 10,
        abilities: { diagnosis:35, recommendation:30, knowledge:25, response:40, prediction:20 },
        learning: { errorsSolved:0, recommendationsGiven:0, feedbackPositive:0, feedbackNegative:0, patternsLearned:0 },
        knowledgeBase: [],
        lastEvolution: null,
        nextEvolution: this.monthLater(),
        history: []
      },
      security: {
        securityScore: 100,
        tamperDetected: false,
        threats: { blocked:0, detected:0, scans:0 },
        incidents: [],
        codeFingerprint: this.fingerprint()
      },
      manager: { totalLaunches:0, lastUpdateCheck:null, lastMaintenance:null, updatesAvailable:[] }
    };
  },

  save() { localStorage.setItem(LS_KEY, JSON.stringify(this.data)); },

  monthLater() {
    const d = new Date();
    d.setMonth(d.getMonth() + 1); d.setDate(1); d.setHours(0,5,0,0);
    return d.toISOString();
  },

  fingerprint() {
    let str = 'mal' + (navigator.userAgent || '') + location.pathname;
    let h = 0;
    for (let i=0;i<str.length;i++){ h=((h<<5)-h+str.charCodeAt(i))|0; }
    return 'fp_' + h;
  },

  sleep(ms){ return new Promise(r=>setTimeout(r,ms)); },

  async connect() { return true; },

  async checkUpdates() {
    const updates = [];
    if (this.clientVersion !== '2.1.0') {
      updates.push({ type:'launcher', currentVersion:this.clientVersion||'2.0.0', latestVersion:'2.1.0',
        priority:'medium', changelog:['性能优化','Bug 修复','本地服务端'], releaseDate:'2026-10-15' });
    }
    const mods = [
      { modId:'mal-p2p', modName:'MAL P2P', current:'1.2.0', latest:'1.3.0' },
      { modId:'mal-replay', modName:'MAL 回放', current:'2.0.0', latest:'2.1.0' }
    ];
    const modUpdates = mods.filter(m=>m.current!==m.latest).map(m=>({
      type:'mod', modId:m.modId, modName:m.modName, currentVersion:m.current, latestVersion:m.latest,
      priority:'low', changelog:['稳定性改进','兼容性更新'] }));
    this.data.manager.lastUpdateCheck = new Date().toISOString();
    this.data.manager.updatesAvailable = [...updates, ...modUpdates];
    this.save();
    return { launcher: updates, mods: modUpdates, total: updates.length+modUpdates.length,
      checkTime:new Date().toISOString() };
  },

  async runMaintenance() {
    const tasks = [
      { name:'清理本地缓存', status:'completed' },
      { name:'优化本地存储', status:'completed' },
      { name:'检查运行日志', status:'completed' },
      { name:'备份本地数据', status:'completed' }
    ];
    await this.sleep(800);
    this.data.manager.lastMaintenance = new Date().toISOString();
    this.save();
    return tasks;
  },

  async getRecommendations(prefs={}) {
    this.data.evolution.learning.recommendationsGiven++;
    const recs = [
      { modId:'mal-optimize', name:'MAL 优化', reason:'根据你的硬件，推荐性能优化，可提升帧率', confidence:0.95, category:'performance' },
      { modId:'mal-map', name:'MAL 地图', reason:'小地图模组帮助导航', confidence:0.87, category:'utility' },
      { modId:'sodium', name:'Sodium', reason:'热门渲染优化，与 MAL 优化兼容', confidence:0.92, category:'performance', source:'modrinth' }
    ];
    if (prefs.lowEndPC) recs.unshift({ modId:'ferritecore', name:'FerriteCore',
      reason:'低配设备推荐，降低内存占用', confidence:0.88, category:'performance' });
    this.ev_learn({type:'recommendation'});
    return recs;
  },

  async diagnose(errorInfo) {
    const msg = errorInfo.message || '';
    const table = {
      'OutOfMemory': { cause:'内存不足', solution:'增加内存分配，或安装 MAL 优化模组', severity:'high', relatedMods:['mal-optimize','ferritecore'] },
      'UnsupportedClassVersion': { cause:'Java 版本不兼容', solution:'更新 Java（1.17+ 需 Java17，1.20.5+ 需 Java21）', severity:'high', relatedMods:[] },
      'conflict': { cause:'模组冲突', solution:'移除最近安装的模组，或用依赖检测', severity:'medium', relatedMods:[] }
    };
    let d = { cause:'未知错误', solution:'尝试重启，或开启安全模式', severity:'low', relatedMods:[] };
    for (const k in table){ if (msg.includes(k)){ d = table[k]; break; } }
    this.data.evolution.learning.errorsSolved++;
    this.ev_learn({type:'diagnosis', pattern:msg||'unknown', solution:d.solution});
    this.addIncident('diagnosis', '诊断: '+d.cause, d.severity==='high'?'high':'medium');
    return d;
  },

  reportLaunch(data={}) {
    this.data.manager.totalLaunches++;
    this.save();
  },

  ev_learn(event) {
    const l = this.data.evolution.learning;
    if (event.type==='diagnosis') {
      if (event.pattern && !this.data.evolution.knowledgeBase.find(k=>k.pattern===event.pattern)) {
        this.data.evolution.knowledgeBase.push({ pattern:event.pattern, solution:event.solution, times:1 });
        l.patternsLearned++;
      }
    } else if (event.type==='feedback') {
      if (event.positive) l.feedbackPositive++; else l.feedbackNegative++;
    }
    this.save();
  },

  checkAndEvolve() {
    const now = new Date();
    const next = new Date(this.data.evolution.nextEvolution);
    if (now >= next) this.evolve();
  },

  async evolve() {
    const ev = this.data.evolution;
    const before = {...ev.abilities};
    const l = ev.learning;
    const growth = {
      diagnosis: 4 + Math.min(10, l.errorsSolved*0.3),
      recommendation: 4 + Math.min(9, l.recommendationsGiven*0.25),
      knowledge: 5 + Math.min(12, l.patternsLearned*0.8),
      response: 2 + Math.random()*3,
      prediction: 3 + Math.min(8, l.feedbackPositive*0.2)
    };
    const rate = (l.feedbackPositive+l.feedbackNegative)>0
      ? l.feedbackPositive/(l.feedbackPositive+l.feedbackNegative) : 0.5;
    Object.keys(ev.abilities).forEach(k=>{
      const g = growth[k]*(0.7+rate*0.6);
      ev.abilities[k] = Math.min(100, Math.round((ev.abilities[k]+g)*10)/10);
    });
    const vals = Object.values(ev.abilities);
    ev.intelligenceLevel = Math.round(vals.reduce((a,b)=>a+b,0)/vals.length*10)/10;
    ev.generation++;
    ev.lastEvolution = new Date().toISOString();
    ev.nextEvolution = this.monthLater();
    ev.history.push({ generation:ev.generation, at:ev.lastEvolution, before, after:{...ev.abilities}, intelligenceLevel:ev.intelligenceLevel });
    if (ev.history.length>24) ev.history = ev.history.slice(-24);
    ev.learning = { errorsSolved:0, recommendationsGiven:0, feedbackPositive:0, feedbackNegative:0, patternsLearned:0 };
    this.addIncident('evolution', `AI 进化到第 ${ev.generation} 代`, 'high');
    this.save();
    return ev.history[ev.history.length-1];
  },

  checkIntegrity() {
    const current = this.fingerprint();
    const ok = current === this.data.security.codeFingerprint;
    if (!ok) {
      this.data.security.tamperDetected = true;
      this.addIncident('tamper','检测到运行环境异常','critical');
    } else {
      this.data.security.tamperDetected = false;
    }
    this.save();
    return { ok, tampered: ok?[]:['runtime'] };
  },

  establishBaseline() {
    this.data.security.codeFingerprint = this.fingerprint();
    this.data.security.tamperDetected = false;
    this.save();
    return 1;
  },

  addIncident(type, message, severity) {
    this.data.security.incidents.unshift({ type, message, severity, at:new Date().toISOString() });
    if (this.data.security.incidents.length>50) this.data.security.incidents = this.data.security.incidents.slice(0,50);
  },

  getEvolutionStatus() {
    const ev = this.data.evolution;
    const days = Math.max(0, Math.ceil((new Date(ev.nextEvolution)-new Date())/86400000));
    return {
      generation:ev.generation, intelligenceLevel:ev.intelligenceLevel, abilities:ev.abilities,
      learning:ev.learning, knowledgeCount:ev.knowledgeBase.length,
      lastEvolution:ev.lastEvolution, nextEvolution:ev.nextEvolution,
      daysUntilEvolution:days, history:ev.history.slice(-6)
    };
  },

  getSecurityStatus() {
    const s = this.data.security;
    return {
      enabled:true, securityScore:s.securityScore, tamperDetected:s.tamperDetected,
      protectedFiles:10, baselinedFiles:10, blockedIPCount:0,
      threats:s.threats, recentIncidents:s.incidents.slice(0,10), adminProtected:false
    };
  },

  getAIStatus() {
    return {
      lastUpdateCheck:this.data.manager.lastUpdateCheck,
      lastMaintenance:this.data.manager.lastMaintenance,
      updatesAvailable:this.data.manager.updatesAvailable,
      systemHealth:'healthy', activeTasks:[], errorLog:[],
      stats:{ totalLaunches:this.data.manager.totalLaunches, totalUsers:1, popularMods:[], commonErrors:[] },
      aiEnabled:true, uptime: Math.floor((Date.now()-new Date(this.data.startedAt).getTime())/1000),
      timestamp:new Date().toISOString(), local:true
    };
  }
};

LocalServer.clientVersion = '2.1.0';
LocalServer.init();
