// 版本控制器
const config = require('../config/config');

exports.getLatestVersion = (req, res) => {
  res.json({
    success: true,
    data: {
      currentVersion: config.launcher.currentVersion,
      minVersion: config.launcher.minVersion,
      downloadUrl: config.launcher.downloadUrl,
      changelog: config.launcher.changelog
    }
  });
};

exports.checkUpdate = (req, res) => {
  const clientVersion = req.query.version || req.body.version;
  const hasUpdate = clientVersion !== config.launcher.currentVersion;

  res.json({
    success: true,
    data: {
      hasUpdate,
      currentVersion: config.launcher.currentVersion,
      clientVersion: clientVersion,
      downloadUrl: config.launcher.downloadUrl,
      latestChangelog: config.launcher.changelog[0]
    }
  });
};
