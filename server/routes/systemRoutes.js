// 进化与安全路由
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/systemController');
const { requireAdmin } = require('../middleware/securityMiddleware');

router.get('/evolution', ctrl.getEvolutionStatus);
router.post('/evolution/trigger', requireAdmin, ctrl.triggerEvolution);
router.post('/evolution/learn', ctrl.submitLearning);

router.get('/security', ctrl.getSecurityStatus);
router.post('/security/integrity', requireAdmin, ctrl.integrityCheck);
router.post('/security/baseline', requireAdmin, ctrl.establishBaseline);
router.post('/security/unblock', requireAdmin, ctrl.unblockIP);

router.post('/auth/password', requireAdmin, ctrl.setAdminPassword);
router.post('/auth/login', ctrl.adminLogin);

module.exports = router;
