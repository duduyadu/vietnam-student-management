const db = require('../config/database');

const logAction = async (req, action, entityType, entityId, oldValues = null, newValues = null, isSensitive = false) => {
  try {
    await db('audit_logs').insert({
      user_id: req.user?.user_id,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_values: oldValues ? JSON.stringify(oldValues) : null,
      new_values: newValues ? JSON.stringify(newValues) : null,
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.headers['user-agent'],
      is_sensitive_access: isSensitive
    });
  } catch (error) {
    console.error('Audit log error:', error);
    // 로그 실패가 메인 작업을 방해하지 않도록 함
  }
};

// 민감정보 접근 로깅 미들웨어
const logSensitiveAccess = (entityType) => {
  return async (req, res, next) => {
    // Response 완료 후 로깅
    res.on('finish', () => {
      if (res.statusCode === 200) {
        logAction(req, 'READ', entityType, req.params.id || null, null, null, true);
      }
    });
    next();
  };
};

module.exports = {
  logAction,
  logSensitiveAccess
};