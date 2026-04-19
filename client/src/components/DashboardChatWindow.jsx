import React from "react";

export default function DashboardChatWindow({
  title,
  visible,
  messages,
  messageText,
  onChangeMessage,
  onSend,
  onClose,
  attachment,
  onChangeAttachment,
  apiBase
}) {
  if (!visible) {
    return null;
  }

  return (
    <div className="dashboard-chat-window">
      <div className="dashboard-chat-card">
        <div className="dashboard-chat-header">
          <div>
            <div className="fw-bold">{title}</div>
            <div className="small-muted">Direct customer and technician communication</div>
          </div>
          <button type="button" className="btn btn-sm eco-btn-outline" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="dashboard-chat-body">
          {messages.length === 0 ? (
            <div className="small-muted">No messages yet.</div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="dashboard-chat-message">
                <div className="dashboard-chat-name">{msg.sender_name}</div>
                {msg.message_text && <div className="dashboard-chat-bubble">{msg.message_text}</div>}
                {msg.attachment_url && (
                  <div className="dashboard-chat-attachment">
                    {String(msg.attachment_type || "").startsWith("image/") ? (
                      <a href={`${apiBase}${msg.attachment_url}`} target="_blank" rel="noreferrer">
                        <img
                          className="dashboard-chat-image"
                          src={`${apiBase}${msg.attachment_url}`}
                          alt={msg.attachment_name || "attachment"}
                        />
                      </a>
                    ) : (
                      <a href={`${apiBase}${msg.attachment_url}`} target="_blank" rel="noreferrer" className="dashboard-chat-file">
                        {msg.attachment_name || "Attached file"}
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <form className="dashboard-chat-form" onSubmit={onSend}>
          <div className="dashboard-chat-inputs">
            <input
              className="form-control"
              value={messageText}
              onChange={(e) => onChangeMessage(e.target.value)}
              placeholder="Write a message"
            />
            <input
              type="file"
              className="form-control"
              accept="image/*,.pdf,.doc,.docx,.txt"
              onChange={(e) => onChangeAttachment(e.target.files?.[0] || null)}
            />
            {attachment && (
              <div className="dashboard-chat-selected small-muted">
                Selected: {attachment.name}
              </div>
            )}
          </div>
          <button className="btn eco-btn">Send</button>
        </form>
      </div>
    </div>
  );
}
