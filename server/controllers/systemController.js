// 进化与安全控制器
const evolution = require('../services/AIEvolution');
const security = require('../services/Security');

exports.getEvolutionStatus = (req, res) => {
  res.json({ success: true, data: evolution.getStatus() });
};

exports.triggerEvolution = async (req, res) => {
  try {
    const result = await evolution.evolve();
    res.json({ success: true, message: `已进化到第 ${result.generation} 代`, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

exports.submitLearning = (req, res) => {
  evolution.learn(req.body || {});
  res.json({ success: true, message: 'AI 已学习' });
};

exports.getSecurityStatus = (req, res) => {
  res.json({ success: true, data: security.getStatus() });
};

exports.integrityCheck = (req, res) => {
  const result = security.checkIntegrity();
  res.json({ success: result.ok, data: result });
};

exports.establishBaseline = (req, res) => {
  const count = security.establishBaselines();
  res.json({ success: true, message: `已为 ${count} 个核心文件建立基线` });
};

exports.setAdminPassword = (req, res) => {
  const { password } = req.body || {};
  if (!password) return res.status(400).json({ success: false, error: '需要密码' });
  security.setAdminPassword(password);
  res.json({ success: true, message: '管理员密码已设置，管理接口已受保护' });
};

exports.adminLogin = (req, res) => {
  const { password } = req.body || {};
  const token = security.login(password);
  if (token) return res.json({ success: true, data: { token } });
  res.status(401).json({ success: false, error: '密码错误' });
};

exports.unblockIP = (req, res) => {
  const { ip } = req.body || {};
  security.unblockIP(ip);
  res.json({ success: true, message: `已解封 ${ip}` });
};
