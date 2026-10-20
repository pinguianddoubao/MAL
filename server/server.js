// MAL Launcher 服务端 - AI 管理更新维护 + AI 进化 + 安全防护
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const config = require('./config/config');
const aiManager = require('./services/AIManager');
const evolution = require('./services/AIEvolution');
const security = require('./services/Security');
const { requestGuard, securityHeaders } = require('./middleware/securityMiddleware');

const aiRoutes = require('./routes/aiRoutes');
const versionRoutes = require('./routes/versionRoutes');
const systemRoutes = require('./routes/systemRoutes');

const app = express();

app.set('trust proxy', 1);

app.use(cors());
app.use(securityHeaders);
app.use(express.json({ limit: '100kb' }));
app.use(requestGuard);
app.use(express.static('public'));

app.use('/api/ai', aiRoutes);
app.use('/api/version', versionRoutes);
app.use('/api/system', systemRoutes);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/status.html');
});

function startScheduledTasks() {
  console.log('[AI] 定时任务已启动');

  if (config.ai.autoUpdateCheck) {
    cron.schedule(config.ai.updateCheckInterval, async () => {
      console.log('[定时] 检查更新...');
      await aiManager.checkLauncherUpdates();
      await aiManager.checkModUpdates();
    });
  }

  if (config.ai.autoMaintenance) {
    cron.schedule(config.ai.maintenanceInterval, async () => {
      console.log('[定时] 系统维护...');
      await aiManager.performMaintenance();
    });
  }

  cron.schedule('5 0 1 * *', async () => {
    console.log('[定时] 月度 AI 进化...');
    const result = await evolution.checkAndEvolve();
    if (result) console.log(`[进化] 已进入第 ${result.generation} 代`);
  });

  cron.schedule('0 */6 * * *', () => {
    console.log('[安全] 文件完整性检查...');
    const result = security.checkIntegrity();
    if (!result.ok) console.error('[安全警告] 检测到篡改:', result.tampered);
  });

  console.log('[进化] 每月1号 00:05 自动进化');
  console.log('[安全] 每6小时完整性校验');
}

app.listen(config.port, () => {
  console.log('========================================');
  console.log('  MAL Launcher Server 已启动');
  console.log('  端口: ' + config.port + ' | 版本: v' + config.launcher.currentVersion);
  console.log('  AI 进化: 第 ' + evolution.state.generation + ' 代 (智能 ' + evolution.state.intelligenceLevel + ')');
  console.log('  安全防护: ' + (security.state.enabled ? '已启用' : '未启用'));
  console.log('========================================');

  startScheduledTasks();

  setTimeout(async () => {
    if (Object.keys(security.state.fileBaselines).length === 0) {
      const n = security.establishBaselines();
      console.log(`[安全] 已为 ${n} 个核心文件建立完整性基线`);
    }
    await aiManager.checkLauncherUpdates();
  }, 1500);
});

module.exports = app;
