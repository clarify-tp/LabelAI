"""
app/models/chat.py
==================
Chat message history.
One row per message (user or assistant).
Grouped into sessions by session_id (UUID generated on the frontend).
The full conversation history is fetched by session and sent to the
frontend, which then includes it in every subsequent API call.
Flask is stateless — all session state lives here or in React state.
"""

import uuid
from datetime import datetime, timezone
from app import db


class ChatMessage(db.Model):
    __tablename__ = "chat_messages"

    id               = db.Column(db.String(36), primary_key=True,
                                 default=lambda: str(uuid.uuid4()))
    user_id          = db.Column(db.String(36), db.ForeignKey("users.id"),
                                 nullable=True, index=True)
    session_id       = db.Column(db.String(36), nullable=False, index=True)
    product_barcode  = db.Column(db.String(20), nullable=True)  # product being discussed
    role             = db.Column(db.String(15), nullable=False)  # user / assistant
    content          = db.Column(db.Text, nullable=False)
    context_subject  = db.Column(db.String(20), nullable=True)  # self/child/elderly/other
    created_at       = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    user = db.relationship("User", back_populates="messages")

    def to_dict(self):
        return {
            "id":              self.id,
            "session_id":      self.session_id,
            "product_barcode": self.product_barcode,
            "role":            self.role,
            "content":         self.content,
            "context_subject": self.context_subject,
            "created_at":      self.created_at.isoformat(),
        }
