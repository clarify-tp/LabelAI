"""
app/models/product.py  (FIXED VERSION)
=======================================
Fix: nutriscore_grade changed from String(1) to String(20).
     Open Food Facts returns values like 'unknown', 'not-applicable'
     which exceeded the 1-character limit and crashed seed.py.

After copying this file, run:
    flask db migrate -m "widen nutriscore_grade"
    flask db upgrade
"""

import hashlib
from datetime import datetime, timezone
from app import db


class Product(db.Model):
    """
    Central product table.
    Nutrition values stored per-100g as Open Food Facts provides.
    Per-serving calculations happen at runtime using serving_size_g.
    verdict_text (Groq output) cached against ingredients_hash.
    If ingredients change, verdict_text is cleared and regenerated next scan.
    """
    __tablename__ = "products"

    # ── Identity ──────────────────────────────────────────────────────────────
    barcode           = db.Column(db.String(20),  primary_key=True)
    product_name      = db.Column(db.String(500), nullable=True)
    brand             = db.Column(db.String(255), nullable=True)
    quantity          = db.Column(db.String(100), nullable=True)

    # ── Ingredients ───────────────────────────────────────────────────────────
    ingredients_text  = db.Column(db.Text,        nullable=True)
    ingredients_hash  = db.Column(db.String(64),  nullable=True)
    additives_tags    = db.Column(db.Text,        nullable=True)   # comma-separated

    # ── Processing classification ─────────────────────────────────────────────
    nova_group        = db.Column(db.Integer,     nullable=True)   # 1-4
    nutriscore_grade  = db.Column(db.String(20),  nullable=True)   # FIX: was String(1), now String(20)
                                                                    # OFF returns 'unknown', 'not-applicable', etc.

    # ── Nutrition per 100g ────────────────────────────────────────────────────
    energy_kcal_100g    = db.Column(db.Float, nullable=True)
    protein_100g        = db.Column(db.Float, nullable=True)
    fat_100g            = db.Column(db.Float, nullable=True)
    saturated_fat_100g  = db.Column(db.Float, nullable=True)
    trans_fat_100g      = db.Column(db.Float, nullable=True)
    sugars_100g         = db.Column(db.Float, nullable=True)
    sodium_100g         = db.Column(db.Float, nullable=True)   # stored as g/100g from OFF
    fiber_100g          = db.Column(db.Float, nullable=True)
    serving_size_g      = db.Column(db.Float, nullable=True)

    # ── Allergens & categories ────────────────────────────────────────────────
    allergens         = db.Column(db.Text,        nullable=True)
    categories        = db.Column(db.Text,        nullable=True)

    # ── Richer OpenFoodFacts metadata (Task 3B) ───────────────────────────────
    packaging            = db.Column(db.String(200), nullable=True)
    manufacturing_places = db.Column(db.String(200), nullable=True)
    origins              = db.Column(db.String(200), nullable=True)
    labels_tags          = db.Column(db.String(500), nullable=True)  # organic,vegan,halal,...

    # ── Computed score (cached) ───────────────────────────────────────────────
    food_pharmer_score = db.Column(db.Integer,    nullable=True)
    score_band         = db.Column(db.String(10), nullable=True)   # GREEN/ORANGE/RED
    verdict_text       = db.Column(db.Text,       nullable=True)   # cached Groq output

    # ── Metadata ──────────────────────────────────────────────────────────────
    source             = db.Column(db.String(30), default="off_json")
    data_verified      = db.Column(db.Boolean,    default=False)
    last_scanned_at    = db.Column(db.DateTime,   nullable=True)
    created_at         = db.Column(db.DateTime,
                                   default=lambda: datetime.now(timezone.utc))

    # ── Relationships ─────────────────────────────────────────────────────────
    scans   = db.relationship("Scan",             back_populates="product")
    changes = db.relationship("IngredientChange", back_populates="product",
                               cascade="all, delete-orphan")

    @staticmethod
    def compute_hash(ingredients_text: str) -> str:
        """MD5 of lowercased, stripped ingredients text — for change detection."""
        return hashlib.md5(
            ingredients_text.lower().strip().encode()
        ).hexdigest()

    def additives_list(self):
        if not self.additives_tags:
            return []
        return [a.strip() for a in self.additives_tags.split(",") if a.strip()]

    def to_dict(self, include_verdict=True):
        d = {
            "barcode":            self.barcode,
            "product_name":       self.product_name,
            "brand":              self.brand,
            "quantity":           self.quantity,
            "ingredients_text":   self.ingredients_text,
            "additives_tags":     self.additives_list(),
            "nova_group":         self.nova_group,
            "nutriscore_grade":   self.nutriscore_grade,
            "nutrition": {
                "energy_kcal_100g":   self.energy_kcal_100g,
                "protein_100g":       self.protein_100g,
                "fat_100g":           self.fat_100g,
                "saturated_fat_100g": self.saturated_fat_100g,
                "trans_fat_100g":     self.trans_fat_100g,
                "sugars_100g":        self.sugars_100g,
                "sodium_100g":        self.sodium_100g,
                "fiber_100g":         self.fiber_100g,
                "serving_size_g":     self.serving_size_g,
            },
            "allergens":          self.allergens,
            "categories":         self.categories,
            "packaging":             self.packaging,
            "manufacturing_places":  self.manufacturing_places,
            "origins":               self.origins,
            "labels_tags":           [t for t in (self.labels_tags or "").split(",") if t],
            "food_pharmer_score": self.food_pharmer_score,
            "score_band":         self.score_band,
            "source":             self.source,
            "data_verified":      self.data_verified,
        }
        if include_verdict:
            d["verdict_text"] = self.verdict_text
        return d


class IngredientChange(db.Model):
    """
    Audit log: records whenever a product's ingredient text changes
    between scans (reformulation detection).
    """
    __tablename__ = "ingredient_changes"

    id          = db.Column(db.Integer,    primary_key=True, autoincrement=True)
    barcode     = db.Column(db.String(20), db.ForeignKey("products.barcode"),
                            nullable=False, index=True)
    old_hash    = db.Column(db.String(64))
    new_hash    = db.Column(db.String(64))
    old_text    = db.Column(db.Text)
    new_text    = db.Column(db.Text)
    detected_at = db.Column(db.DateTime,
                            default=lambda: datetime.now(timezone.utc))

    product = db.relationship("Product", back_populates="changes")