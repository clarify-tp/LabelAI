"""
app/models/cache.py
===================
URLCache        — caches scraped Blinkit/BigBasket product data for 30 days.
ComparisonCache — caches product comparison results for 30 days.
                  Key is MD5 hash of sorted barcodes joined by underscore.
"""

import uuid
from datetime import datetime, timezone, timedelta
from app import db


class URLCache(db.Model):
    __tablename__ = "url_cache"

    url_hash     = db.Column(db.String(64), primary_key=True)
    url          = db.Column(db.Text, nullable=False)
    platform     = db.Column(db.String(20), nullable=True)
    product_data = db.Column(db.Text, nullable=True)   # JSON string
    barcode      = db.Column(db.String(20), nullable=True)
    score        = db.Column(db.Integer, nullable=True)
    verdict      = db.Column(db.Text, nullable=True)
    scraped_at   = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at   = db.Column(db.DateTime,
                             default=lambda: datetime.now(timezone.utc) + timedelta(days=30))

    def is_expired(self):
        return datetime.now(timezone.utc) > self.expires_at.replace(tzinfo=timezone.utc)


class ComparisonCache(db.Model):
    __tablename__ = "comparison_cache"

    cache_key    = db.Column(db.String(64), primary_key=True)  # MD5 of sorted barcodes
    barcodes     = db.Column(db.Text, nullable=False)           # comma-separated
    verdict_text = db.Column(db.Text, nullable=True)
    winner_barcode = db.Column(db.String(20), nullable=True)
    result_json  = db.Column(db.Text, nullable=True)            # full comparison result
    created_at   = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at   = db.Column(db.DateTime,
                             default=lambda: datetime.now(timezone.utc) + timedelta(days=30))

    def is_expired(self):
        return datetime.now(timezone.utc) > self.expires_at.replace(tzinfo=timezone.utc)
