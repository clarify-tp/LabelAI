"""
app/routes/chat.py  (FIXED)
============================
Fixes:
  1. Product fetch now retrieves the full scan result fields needed for
     context injection — matched_ingredients, reasons_to_eat/avoid,
     sugar_teaspoons, sodium_pct_daily, etc. These were missing because
     the route only fetched the Product ORM row which doesn't store them.

     Fix: reconstruct the context dict from Product + a lightweight
     re-run of match_all() so the chatbot gets actual ingredient data.
     This is fast because match_all() is a DB lookup, not a Groq call.

  2. product_barcode from request body is now read reliably.
     Previously the concurrent.futures approach caused issues on Windows
     (no fork) — replaced with sequential calls which are fast enough.

  3. session_id is generated server-side if not provided by frontend,
     preventing orphan messages.
"""

import uuid
from flask import Blueprint, request, jsonify, g
from app import db
from app.models.chat import ChatMessage
from app.models.product import Product
from app.models.user import UserProfile
from app.services.groq_service import detect_context, chat_response
from app.services.matcher import match_all
from app.utils.auth import jwt_required, jwt_optional, get_current_user
from app.utils.humanise import per_100g_to_per_serving, get_consumption_frequency
from app.utils.reasons import get_reasons_to_eat, get_reasons_to_avoid
from app.utils.side_effects import get_side_effects

chat_bp = Blueprint("chat", __name__)


def _build_product_context_dict(barcode: str, category: str = "general") -> dict | None:
    """
    Fetch product from DB and build the context dict the chatbot needs.
    Returns None if barcode is not in DB.

    This is a lightweight operation:
      - One DB row fetch (Product)
      - match_all() = DB lookups only (no Groq)
      - Uses cached score/verdict if available
    """
    product = db.session.get(Product, barcode)
    if not product:
        return None

    # Re-run ingredient matching (fast — all DB, no Groq)
    raw_text = product.ingredients_text or ""
    names    = [i.strip() for i in raw_text.replace(";", ",").split(",") if i.strip()]
    matched  = match_all(names, barcode)

    # Per-serving nutrition
    nutrition_100g = {
        "sugars_100g":        product.sugars_100g,
        "sodium_100g":        product.sodium_100g,
        "fat_100g":           product.fat_100g,
        "saturated_fat_100g": product.saturated_fat_100g,
        "trans_fat_100g":     product.trans_fat_100g,
        "protein_100g":       product.protein_100g,
        "fiber_100g":         product.fiber_100g,
        "energy-kcal_100g":   product.energy_kcal_100g,
    }
    from app.utils.humanise import get_default_serving
    serving_g = product.serving_size_g or get_default_serving(category)
    nutrition_per_serving = per_100g_to_per_serving(nutrition_100g, serving_g, category)

    reasons_to_eat   = get_reasons_to_eat(nutrition_per_serving, matched)
    reasons_to_avoid = get_reasons_to_avoid(matched, nutrition_per_serving)
    side_effects_list = get_side_effects(matched)

    sugar_g  = nutrition_per_serving.get("sugar_g") or 0
    sodium_mg = nutrition_per_serving.get("sodium_mg") or 0
    sugar_tsp = round(sugar_g / 4.2, 1)
    sodium_pct = round(sodium_mg / 2000 * 100)

    # Worst ingredient
    harmful = [i for i in matched if i.get("harm_level", 1) >= 3]
    worst   = max(harmful, key=lambda x: x.get("harm_level", 0), default=None)

    return {
        "product_name":       product.product_name,
        "brand":              product.brand,
        "barcode":            product.barcode,
        "category":           category,
        "food_pharmer_score": product.food_pharmer_score,
        "score_band":         product.score_band,
        "nova_group":         product.nova_group,
        "verdict_text":       product.verdict_text,
        "matched_ingredients": matched,
        "sugar_teaspoons":    sugar_tsp,
        "sodium_pct_daily":   sodium_pct,
        "worst_ingredient":   worst.get("name_english") if worst else None,
        "reasons_to_eat":     [r["text"] for r in reasons_to_eat],
        "reasons_to_avoid":   [r["text"] for r in reasons_to_avoid],
        "side_effects":       side_effects_list,
    }


@chat_bp.route("", methods=["POST"])
@jwt_optional
def chat():
    """
    Process a chatbot message.

    Body:
      message         : str
      session_id      : str  (UUID, frontend generates; server falls back to new UUID)
      product_barcode : str? (barcode of product being discussed)
      history         : list [{role, content}] — last 10 messages
    """
    data       = request.get_json(silent=True) or {}
    message    = (data.get("message") or "").strip()
    session_id = data.get("session_id") or str(uuid.uuid4())
    barcode    = (data.get("product_barcode") or "").strip() or None
    history    = data.get("history") or []
    category   = (data.get("category") or "general").strip()

    if not message:
        return jsonify({"error": "Message is required"}), 400

    # ── 1. Fetch product context (DB only — no Groq) ──────────────────────────
    product_dict = None
    if barcode:
        product_dict = _build_product_context_dict(barcode, category)
        if not product_dict:
            # Barcode provided but not in our DB — tell the user to scan first
            # by returning product_dict=None (chatbot system prompt handles this)
            pass

    # ── 2. Context detection ───────────────────────────────────────────────────
    prev_msg = history[-1]["content"] if history else ""
    context_result = detect_context(message, prev_msg)

    # ── 3. User profile (only if subject = self) ──────────────────────────────
    user_profile = None
    if context_result.get("subject") == "self" and g.user_id:
        user = get_current_user()
        if user and user.profile:
            user_profile = user.profile.to_dict()

    # ── 4. Generate chatbot response ──────────────────────────────────────────
    response_text = chat_response(
        message        = message,
        history        = history[-10:],
        product        = product_dict,
        context_result = context_result,
        user_profile   = user_profile,
    )

    # ── 5. Save messages to DB ────────────────────────────────────────────────
    try:
        db.session.add_all([
            ChatMessage(
                user_id         = g.user_id,
                session_id      = session_id,
                product_barcode = barcode,
                role            = "user",
                content         = message,
                context_subject = context_result.get("subject"),
            ),
            ChatMessage(
                user_id         = g.user_id,
                session_id      = session_id,
                product_barcode = barcode,
                role            = "assistant",
                content         = response_text,
                context_subject = context_result.get("subject"),
            ),
        ])
        db.session.commit()
    except Exception:
        db.session.rollback()

    return jsonify({
        "response":        response_text,
        "session_id":      session_id,
        "context_subject": context_result.get("subject"),
        "confidence":      context_result.get("confidence"),
    }), 200


@chat_bp.route("/history/<session_id>", methods=["GET"])
@jwt_optional
def get_history(session_id):
    """Return full chat history for a session."""
    messages = (
        ChatMessage.query
        .filter_by(session_id=session_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )
    return jsonify({"messages": [m.to_dict() for m in messages]}), 200