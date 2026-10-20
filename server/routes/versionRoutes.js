// 版本路由
const express = require('express');
const router = express.Router();
const versionController = require('../controllers/versionController');

router.get('/latest', versionController.getLatestVersion);
router.get('/check', versionController.checkUpdate);

module.exports = router;
