"""
app/models/__init__.py
======================
Exports all models so Flask-Migrate can auto-detect them.
Import this in create_app() inside app_context.
"""

from app.models.user       import User, UserProfile
from app.models.product    import Product, IngredientChange
from app.models.scan       import Scan
from app.models.chat       import ChatMessage
from app.models.ingredient import Ingredient, UnknownIngredient
from app.models.cache      import URLCache, ComparisonCache

__all__ = [
    "User", "UserProfile",
    "Product", "IngredientChange",
    "Scan",
    "ChatMessage",
    "Ingredient", "UnknownIngredient",
    "URLCache", "ComparisonCache",
]
