"""
app/models/ingredient.py
========================
Ingredient   — FSSAI additive database (loaded from our CSV).
               475 additives with harm levels, harm reasons, and side effects.
               Also includes custom entries: MAIDA, PALM_OIL, HYDRO_VEG_OIL.

UnknownIngredient — review queue for ingredients not found in the FSSAI DB.
                    scan_count increments on each new occurrence.
                    When scan_count >= 5 it surfaces in the admin dashboard.
"""

import uuid
from datetime import datetime, timezone
from app import db


class Ingredient(db.Model):
    __tablename__ = "ingredients"

    ins_no           = db.Column(db.String(20), primary_key=True)  # e.g. "211", "MAIDA"
    e_number         = db.Column(db.String(20), nullable=True)      # e.g. "E211"
    name_english     = db.Column(db.String(255), nullable=False)
    name_hindi       = db.Column(db.String(255), nullable=True)
    functional_class = db.Column(db.String(100), nullable=True)
    harm_level       = db.Column(db.Integer, nullable=False, default=1)  # 1-4
    harm_severity    = db.Column(db.String(20), nullable=True)     # LOW/MEDIUM-HIGH/HIGH
    color_code       = db.Column(db.String(10), nullable=True)     # GREEN/YELLOW/ORANGE/RED
    harm_reason      = db.Column(db.Text, nullable=True)
    revant_concern   = db.Column(db.String(3), default="NO")       # YES/NO
    side_effects     = db.Column(db.Text, nullable=True)           # JSON string
    fssai_permitted  = db.Column(db.Boolean, default=True)
    source           = db.Column(db.String(200), nullable=True)
    created_at       = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        import json
        side_effects = []
        if self.side_effects:
            try:
                side_effects = json.loads(self.side_effects)
            except Exception:
                pass
        return {
            "ins_no":           self.ins_no,
            "e_number":         self.e_number,
            "name_english":     self.name_english,
            "name_hindi":       self.name_hindi,
            "functional_class": self.functional_class,
            "harm_level":       self.harm_level,
            "harm_severity":    self.harm_severity,
            "color_code":       self.color_code,
            "harm_reason":      self.harm_reason,
            "revant_concern":   self.revant_concern,
            "side_effects":     side_effects,
        }


class UnknownIngredient(db.Model):
    """
    Review queue for ingredients the matcher couldn't identify.
    When scan_count reaches 5 it surfaces in admin for manual DB addition.
    """
    __tablename__ = "unknown_ingredients"

    id              = db.Column(db.String(36), primary_key=True,
                                default=lambda: str(uuid.uuid4()))
    name_as_found   = db.Column(db.String(255), unique=True, nullable=False)
    product_barcode = db.Column(db.String(20), nullable=True)
    scan_count      = db.Column(db.Integer, default=1)
    status          = db.Column(db.String(20), default="PENDING")  # PENDING/ADDED/IGNORED
    created_at      = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
