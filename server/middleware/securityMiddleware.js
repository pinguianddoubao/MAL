// 安全中间件 - 应用到所有请求
const security = require('../services/Security');

function requestGuard(req, res, next) {
  const result = security.inspect(req);
  if (!result.allowed) {
    return res.status(result.code).json({ success: false, error: result.reason });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!security.state.adminToken) return next();
  const token = req.headers['x-admin-token'] || (req.body && req.body.token) || req.query.token;
  const sessions = security.state.activeSessions || {};
  if (security.verifyAdminToken(token) || sessions[token]) return next();
  return res.status(401).json({ success: false, error: '需要管理员认证' });
}

function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'");
  next();
}

module.exports = { requestGuard, requireAdmin, securityHeaders };
