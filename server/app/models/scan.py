"""
app/models/scan.py
==================
Records every product scan event per user.
Stores both the base score and the personalised score
(which may differ if the user has health conditions).
"""

import uuid
from datetime import datetime, timezone
from app import db


class Scan(db.Model):
    __tablename__ = "scans"

    id                 = db.Column(db.String(36), primary_key=True,
                                   default=lambda: str(uuid.uuid4()))
    user_id            = db.Column(db.String(36), db.ForeignKey("users.id"),
                                   nullable=True, index=True)
    barcode            = db.Column(db.String(20), db.ForeignKey("products.barcode"),
                                   nullable=True)
    product_name       = db.Column(db.String(500), nullable=True)
    category           = db.Column(db.String(50), nullable=True)
    input_method       = db.Column(db.String(20), nullable=True)  # barcode/photo/link
    platform           = db.Column(db.String(20), nullable=True)  # blinkit/bigbasket/null
    base_score         = db.Column(db.Integer, nullable=True)
    personalised_score = db.Column(db.Integer, nullable=True)
    verdict_text       = db.Column(db.Text, nullable=True)
    image_url          = db.Column(db.String(500), nullable=True)  # Cloudinary CDN URL (optional)
    created_at         = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    user    = db.relationship("User",    back_populates="scans")
    product = db.relationship("Product", back_populates="scans")

    def to_dict(self):
        return {
            "id":                 self.id,
            "barcode":            self.barcode,
            "product_name":       self.product_name,
            "category":           self.category,
            "input_method":       self.input_method,
            "base_score":         self.base_score,
            "personalised_score": self.personalised_score,
            "scan_image_url":     self.image_url,
            "created_at":         self.created_at.isoformat(),
        }
