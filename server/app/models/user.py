"""
app/models/user.py
==================
User authentication and profile models.

User         — stores login credentials (email + bcrypt password hash)
UserProfile  — stores health data: age, BMI, conditions, allergies, etc.
              One-to-one with User via user_id FK.
"""

import uuid
from datetime import datetime, timezone
from app import db


class User(db.Model):
    """
    Authentication table.
    Stores email and bcrypt-hashed password.
    JWT tokens are issued on login and verified in Flask middleware.
    """
    __tablename__ = "users"

    id         = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email      = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password   = db.Column(db.String(255), nullable=False)               # bcrypt hash
    first_name = db.Column(db.String(100), nullable=True)
    is_active  = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    profile  = db.relationship("UserProfile", back_populates="user",
                                uselist=False, cascade="all, delete-orphan")
    scans    = db.relationship("Scan", back_populates="user",
                                cascade="all, delete-orphan")
    messages = db.relationship("ChatMessage", back_populates="user",
                                cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id":         self.id,
            "email":      self.email,
            "first_name": self.first_name,
            "is_active":  self.is_active,
            "created_at": self.created_at.isoformat(),
        }


class UserProfile(db.Model):
    """
    Health profile — one row per user.

    Conditions and allergies are stored as PostgreSQL ARRAY columns
    (e.g. ['diabetes', 'hypertension']).

    BMI is calculated in Python and stored here using Indian ICMR
    thresholds (overweight ≥ 23, obese ≥ 25) — not Western WHO thresholds.
    """
    __tablename__ = "user_profiles"

    id                  = db.Column(db.String(36), primary_key=True,
                                    default=lambda: str(uuid.uuid4()))
    user_id             = db.Column(db.String(36), db.ForeignKey("users.id"),
                                    nullable=False, unique=True, index=True)
    age                 = db.Column(db.Integer, nullable=True)
    height_cm           = db.Column(db.Float, nullable=True)
    weight_kg           = db.Column(db.Float, nullable=True)
    bmi                 = db.Column(db.Float, nullable=True)
    bmi_category_indian = db.Column(db.String(20), nullable=True)  # Normal/Overweight/Obese
    # Stored as comma-separated strings for portability (avoids PG ARRAY complexity)
    conditions          = db.Column(db.Text, default="")  # "diabetes,hypertension"
    allergies           = db.Column(db.Text, default="")  # "milk,gluten"
    diet_type           = db.Column(db.String(30), default="none")
    activity_level      = db.Column(db.String(20), default="moderate")
    preferred_language  = db.Column(db.String(10), default="en")
    theme               = db.Column(db.String(10), default="light")
    created_at          = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at          = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                                    onupdate=lambda: datetime.now(timezone.utc))

    # Relationship back to User
    user = db.relationship("User", back_populates="profile")

    def conditions_list(self):
        """Return conditions as a Python list."""
        return [c.strip() for c in self.conditions.split(",") if c.strip()]

    def allergies_list(self):
        """Return allergies as a Python list."""
        return [a.strip() for a in self.allergies.split(",") if a.strip()]

    def to_dict(self):
        return {
            "id":                  self.id,
            "user_id":             self.user_id,
            "age":                 self.age,
            "height_cm":           self.height_cm,
            "weight_kg":           self.weight_kg,
            "bmi":                 self.bmi,
            "bmi_category_indian": self.bmi_category_indian,
            "conditions":          self.conditions_list(),
            "allergies":           self.allergies_list(),
            "diet_type":           self.diet_type,
            "activity_level":      self.activity_level,
            "preferred_language":  self.preferred_language,
            "theme":               self.theme,
        }
