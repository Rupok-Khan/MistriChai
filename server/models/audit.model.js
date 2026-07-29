const pool = require("../config/db");

async function record({ actorUserId = null, actorRole = null, action, entityType, entityId = null, beforeData = null, afterData = null, requestId = null, ipAddress = null }) {
  await pool.query(
    `INSERT INTO audit_logs
      (actor_user_id, actor_role, action, entity_type, entity_id, before_json, after_json, request_id, ip_address)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [actorUserId, actorRole, action, entityType, entityId, beforeData ? JSON.stringify(beforeData) : null, afterData ? JSON.stringify(afterData) : null, requestId, ipAddress]
  );
}

module.exports = { record };
