import React, { useEffect, useRef } from "react";

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
  apiBase,
  currentUserId
}) {
  const bodyRef = useRef(null);

  useEffect(() => {
    if (visible && bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, visible]);

  if (!visible) {
    return null;
  }

  const attachmentUrl = (value) => /^https?:\/\//i.test(String(value || "")) ? value : `${apiBase}${value}`;
  const formatTime = (value) => {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="dashboard-chat-window">
      <div className="dashboard-chat-card">
        <div className="dashboard-chat-header">
          <div className="dashboard-chat-person">
            <span className="dashboard-chat-avatar">{String(title || "C").charAt(0)}</span>
            <div>
              <div className="dashboard-chat-title">{title}</div>
              <div className="dashboard-chat-status"><i /> Secure conversation</div>
            </div>
          </div>
          <button type="button" className="dashboard-chat-close" onClick={onClose} aria-label="Close chat">
            ×
          </button>
        </div>

        <div className="dashboard-chat-body" ref={bodyRef}>
          {messages.length === 0 ? (
            <div className="dashboard-chat-empty"><span>✦</span><strong>Start the conversation</strong><small>Send a message or attachment below.</small></div>
          ) : (
            messages.map((msg) => {
              const isOwn = Number(msg.sender_user_id) === Number(currentUserId);
              return <div key={msg.id} className={`dashboard-chat-message ${isOwn ? "is-own" : "is-other"}`}>
                <div className="dashboard-chat-meta"><span>{isOwn ? "You" : msg.sender_name}</span><time>{formatTime(msg.created_at)}</time></div>
                <div className="dashboard-chat-bubble-wrap">
                {msg.message_text && <div className="dashboard-chat-bubble">{msg.message_text}</div>}
                {msg.attachment_url && (
                  <div className="dashboard-chat-attachment">
                    {String(msg.attachment_type || "").startsWith("image/") ? (
                      <a href={attachmentUrl(msg.attachment_url)} target="_blank" rel="noreferrer">
                        <img
                          className="dashboard-chat-image"
                          src={attachmentUrl(msg.attachment_url)}
                          alt={msg.attachment_name || "attachment"}
                        />
                      </a>
                    ) : (
                      <a href={attachmentUrl(msg.attachment_url)} target="_blank" rel="noreferrer" className="dashboard-chat-file">
                        <span>↗</span>{msg.attachment_name || "Open attached file"}
                      </a>
                    )}
                  </div>
                )}
                </div>
              </div>
            })
          )}
        </div>

        <form className="dashboard-chat-form" onSubmit={onSend}>
          <div className="dashboard-chat-inputs">
            <textarea
              className="dashboard-chat-textarea"
              value={messageText}
              onChange={(e) => onChangeMessage(e.target.value)}
              placeholder="Type your message..."
              rows="1"
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }}
            />
            {attachment && (
              <div className="dashboard-chat-selected"><span>Attachment</span><b>{attachment.name}</b><button type="button" onClick={() => onChangeAttachment(null)} aria-label="Remove attachment">×</button></div>
            )}
            <div className="dashboard-chat-tools">
              <label className="dashboard-chat-attach">＋ <span>Add file</span><input type="file" accept="image/*,.pdf,.doc,.docx,.txt" onChange={(e) => onChangeAttachment(e.target.files?.[0] || null)} /></label>
              <small>Enter to send · Shift + Enter for new line</small>
            </div>
          </div>
          <button className="dashboard-chat-send" disabled={!messageText.trim() && !attachment} aria-label="Send message">➤</button>
        </form>
      </div>
    </div>
  );
}
