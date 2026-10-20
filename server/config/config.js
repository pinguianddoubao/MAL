// MAL 服务端配置
module.exports = {
  port: process.env.PORT || 3000,

  launcher: {
    currentVersion: '2.0.0',
    minVersion: '1.0.0',
    downloadUrl: 'https://mal-launcher.example.com/download',
    changelog: [
      { version: '2.0.0', date: '2026-10-11', changes: ['添加开屏画面', 'AI 管理系统上线', '优化启动速度'] },
      { version: '1.5.0', date: '2026-09-15', changes: ['添加游戏运行窗口', '修复图标显示问题'] },
      { version: '1.0.0', date: '2026-09-01', changes: ['首次发布', '支持全版本', '模组中心上线'] }
    ]
  },

  ai: {
    enabled: true,
    autoUpdateCheck: true,
    autoMaintenance: true,
    updateCheckInterval: '0 */6 * * *',
    maintenanceInterval: '0 3 * * *',
    smartRecommendations: true,
    errorDiagnosis: true
  },

  mods: {
    modrinthApi: 'https://api.modrinth.com/v2',
    curseforgeApi: 'https://api.curseforge.com/v1',
    cacheDuration: 300000
  },

  analytics: {
    enabled: true,
    trackLaunches: true,
    trackMods: true,
    trackErrors: true
  }
};
