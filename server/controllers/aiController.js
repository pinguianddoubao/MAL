// AI 管理控制器
const aiManager = require('../services/AIManager');
const config = require('../config/config');

exports.checkUpdates = async (req, res) => {
  try {
    const launcherUpdates = await aiManager.checkLauncherUpdates();
    const modUpdates = await aiManager.checkModUpdates();
    res.json({
      success: true,
      data: {
        launcher: launcherUpdates,
        mods: modUpdates,
        total: launcherUpdates.length + modUpdates.length,
        checkTime: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getAIStatus = (req, res) => {
  try {
    res.json({
      success: true,
      data: aiManager.getStatus()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.triggerMaintenance = async (req, res) => {
  try {
    const tasks = await aiManager.performMaintenance();
    res.json({
      success: true,
      message: '维护完成',
      data: tasks
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getRecommendations = async (req, res) => {
  try {
    const preferences = req.body || {};
    const recommendations = await aiManager.recommendMods(preferences);
    require('../services/AIEvolution').learn({ type: 'recommendation' });
    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.diagnoseError = async (req, res) => {
  try {
    const errorInfo = req.body || {};
    const diagnosis = await aiManager.diagnoseError(errorInfo);
    require('../services/AIEvolution').learn({
      type: 'diagnosis',
      pattern: errorInfo.message || 'unknown',
      solution: diagnosis.solution
    });
    res.json({
      success: true,
      data: diagnosis
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.recordLaunch = (req, res) => {
  try {
    aiManager.recordLaunch(req.body || {});
    res.json({ success: true, message: '已记录' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
