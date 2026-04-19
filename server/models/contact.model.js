const db = require("../config/db");

async function createContact({ userId, userRole, name, email, message }) {
  const [result] = await db.execute(
    "INSERT INTO contact_messages (user_id, user_role, name, email, message) VALUES (?, ?, ?, ?, ?)",
    [userId, userRole, name, email, message]
  );
  return result.insertId;
}

async function getAllContacts() {
  const [rows] = await db.execute(
    `SELECT cm.id, cm.user_id, cm.user_role, cm.name, cm.email, cm.message, cm.created_at,
            u.mobile
     FROM contact_messages cm
     LEFT JOIN users u ON u.id = cm.user_id
     ORDER BY cm.created_at DESC`
  );
  return rows;
}

async function getContactsByUser(userId) {
  const [rows] = await db.execute(
    `SELECT cm.id, cm.user_id, cm.user_role, cm.name, cm.email, cm.message, cm.created_at
     FROM contact_messages cm
     WHERE cm.user_id = ?
     ORDER BY cm.created_at DESC`,
    [userId]
  );
  return rows;
}

async function getRepliesByContactIds(contactIds) {
  if (!Array.isArray(contactIds) || contactIds.length === 0) {
    return [];
  }

  const placeholders = contactIds.map(() => "?").join(",");
  const [rows] = await db.execute(
    `SELECT id, contact_message_id, reply_text, replied_by, replied_by_email, created_at
     FROM contact_message_replies
     WHERE contact_message_id IN (${placeholders})
     ORDER BY created_at ASC`,
    contactIds
  );
  return rows;
}

async function addReply({ contactMessageId, replyText, repliedByEmail }) {
  const [result] = await db.execute(
    `INSERT INTO contact_message_replies (contact_message_id, reply_text, replied_by, replied_by_email)
     VALUES (?, ?, 'ADMIN', ?)`,
    [contactMessageId, replyText, repliedByEmail || null]
  );
  return result.insertId;
}

async function deleteContact(id) {
  const [result] = await db.execute("DELETE FROM contact_messages WHERE id = ?", [id]);
  return result.affectedRows;
}

module.exports = {
  createContact,
  getAllContacts,
  getContactsByUser,
  getRepliesByContactIds,
  addReply,
  deleteContact,
};
