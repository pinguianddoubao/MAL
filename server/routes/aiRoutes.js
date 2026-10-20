// AI 管理路由
const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

router.get('/updates', aiController.checkUpdates);
router.get('/status', aiController.getAIStatus);
router.post('/maintenance', aiController.triggerMaintenance);
router.post('/recommendations', aiController.getRecommendations);
router.post('/diagnose', aiController.diagnoseError);
router.post('/launch', aiController.recordLaunch);

module.exports = router;
