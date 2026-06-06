"""
app/routes/scan.py  (FIXED v3)
================================
Fixes:
  1. Photo scan now merges extracted nutrition into the product row
     before running the pipeline.
     Previously: product row from photo had all nutrition fields = None.
     Pipeline then computed per-serving values from all-None → all zeros.
     Fix: after creating/fetching the product, overlay any non-None
     nutrition values from the photo extraction if the DB row has nulls.

  2. In _run_pipeline, when nutrition_100g values are all None,
     attempt to use nutrition_per_serving from the extracted data directly
     (skip the per_100g_to_per_serving conversion and use raw values).

  3. Category is stored on the Scan record so chat can re-use it.
"""

import json
import hashlib
import requests
from flask import Blueprint, request, jsonify, g
from app import db
from app.models.product import Product, IngredientChange
from app.models.scan import Scan
from app.models.cache import URLCache
from app.services.matcher import match_all
from app.services.groq_service import extract_from_image, generate_verdict
from app.tools.score_engine import calculate_food_score
from app.utils.auth import jwt_optional
from app.utils.humanise import (
    per_100g_to_per_serving,
    describe_serving_size,
    get_consumption_frequency,
    get_default_serving,
    humanise_nutrition,
)
from app.utils.reasons import get_reasons_to_eat, get_reasons_to_avoid
from app.utils.side_effects import get_side_effects

scan_bp = Blueprint("scan", __name__)

OFF_API    = "https://world.openfoodfacts.org/api/v2/product/{barcode}.json"
OFF_FIELDS = (
    "product_name,brands,ingredients_text,additives_tags,nova_group,"
    "nutriscore_grade,nutriments,allergens,categories_tags,quantity"
)

_GROQ_SAFE_KEYS = {
    "ins_no", "name_english", "harm_level",
    "functional_class", "harm_reason", "revant_concern",
}


def _strip_for_groq(matched: list[dict]) -> list[dict]:
    return [{k: v for k, v in ing.items() if k in _GROQ_SAFE_KEYS} for ing in matched]


def _safe_str(val, maxlen=None):
    if val is None:
        return None
    s = str(val).strip()
    return (s[:maxlen] if maxlen and len(s) > maxlen else s) or None


def _run_pipeline(
    product: Product,
    category: str,
    override_nutrition_per_serving: dict | None = None,
) -> dict:
    """
    Full scoring pipeline.

    override_nutrition_per_serving: when set (photo scan with no DB nutrition),
    use these values directly instead of computing from per-100g DB fields.
    """
    # ── Parse ingredients ────────────────────────────────────────────────────
    raw_text         = product.ingredients_text or ""
    ingredient_names = [
        i.strip() for i in raw_text.replace(";", ",").split(",") if i.strip()
    ]
    matched = match_all(ingredient_names, product.barcode)

    # ── Nutrition per serving ─────────────────────────────────────────────────
    if override_nutrition_per_serving:
        # Use photo-extracted per-serving values directly
        nutrition_per_serving = override_nutrition_per_serving
        effective_serving_g   = override_nutrition_per_serving.get("_serving_g_used") or get_default_serving(category)
    else:
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
        serving_g             = product.serving_size_g
        nutrition_per_serving = per_100g_to_per_serving(nutrition_100g, serving_g, category)
        effective_serving_g   = serving_g or get_default_serving(category)

    reasons_to_eat   = get_reasons_to_eat(nutrition_per_serving, matched)
    reasons_to_avoid = get_reasons_to_avoid(matched, nutrition_per_serving)
    side_effects     = get_side_effects(matched)

    nova = product.nova_group if product.nova_group in (1, 2, 3, 4) else 4

    # ── Cache check ───────────────────────────────────────────────────────────
    if product.food_pharmer_score is not None and product.verdict_text:
        score_result = {
            "score":               product.food_pharmer_score,
            "band":                product.score_band,
            "label":               ("Clean ✓" if product.food_pharmer_score >= 70
                                    else "Caution ⚠️" if product.food_pharmer_score >= 45
                                    else "Avoid 🚫"),
            "category":            category,
            "harmful_count":       sum(1 for i in matched if i.get("harm_level", 1) >= 3),
            "total_ingredients":   len(matched),
            "sugar_teaspoons":     round((nutrition_per_serving.get("sugar_g") or 0) / 4.2, 1),
            "humanised_nutrition": humanise_nutrition(nutrition_per_serving),
            "breakdown":           [],
            "worst_ingredient":    None,
        }
        verdict_text = product.verdict_text
    else:
        groq_safe = _strip_for_groq(matched)
        try:
            result       = generate_verdict(
                product_name          = product.product_name or "Unknown",
                brand                 = product.brand or "",
                category              = category,
                matched_ingredients   = groq_safe,
                nutrition_per_serving = nutrition_per_serving,
                nova_group            = nova,
                reasons_to_eat        = [r["text"] for r in reasons_to_eat],
                reasons_to_avoid      = [r["text"] for r in reasons_to_avoid],
                side_effects          = side_effects,
            )
            score_result = result["score_result"]
            verdict_text = result["verdict_text"]
        except Exception as groq_err:
            import traceback
            print(f"[scan] Groq fallback: {groq_err}")
            traceback.print_exc()
            score_result = calculate_food_score(
                matched_ingredients   = groq_safe,
                nutrition_per_serving = nutrition_per_serving,
                nova_group            = nova,
                category              = category,
            )
            score        = score_result["score"]
            harmful      = [i for i in matched if i.get("harm_level", 1) >= 3]
            worst        = harmful[0]["name_english"] if harmful else None
            verdict_text = (
                f"{product.product_name or 'Yeh product'} ka score {score}/100 hai. "
                + (f"Worst ingredient: {worst}. " if worst else "")
                + ("Food Pharmer says: AVOID karo." if score < 45
                   else "Dhyan se khao." if score < 70
                   else "Food Pharmer says: Yeh theek hai! Clean choice ✓")
            )

        product.food_pharmer_score = score_result["score"]
        product.score_band         = score_result.get("band")
        product.verdict_text       = verdict_text
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()

    consumption_freq = get_consumption_frequency(score_result["score"], category)

    return {
        "product":               product.to_dict(include_verdict=False),
        "score":                 score_result["score"],
        "score_band":            score_result.get("band"),
        "score_label":           score_result.get("label"),
        "score_breakdown":       score_result.get("breakdown", []),
        "worst_ingredient":      score_result.get("worst_ingredient"),
        "harmful_count":         score_result.get("harmful_count", 0),
        "total_ingredients":     score_result.get("total_ingredients", 0),
        "sugar_teaspoons":       score_result.get("sugar_teaspoons", 0),
        "humanised_nutrition":   score_result.get("humanised_nutrition", {}),
        "matched_ingredients":   matched,
        "reasons_to_eat":        reasons_to_eat,
        "reasons_to_avoid":      reasons_to_avoid,
        "side_effects":          side_effects,
        "verdict_text":          verdict_text,
        "serving_description":   describe_serving_size(effective_serving_g, category),
        "category":              category,
        "consumption_frequency": consumption_freq,
    }


def _fetch_from_off(barcode: str) -> dict | None:
    try:
        resp = requests.get(
            OFF_API.format(barcode=barcode),
            params={"fields": OFF_FIELDS},
            headers={"User-Agent": "LabelPadhegaAI/1.0"},
            timeout=8,
        )
        data = resp.json()
        if data.get("status") == 1:
            return data.get("product", {})
    except Exception:
        pass
    return None


def _off_to_product(barcode: str, off_data: dict) -> Product:
    nutrients  = off_data.get("nutriments", {})
    additives  = off_data.get("additives_tags", [])
    raw_grade  = off_data.get("nutriscore_grade") or ""
    return Product(
        barcode            = barcode,
        product_name       = _safe_str(off_data.get("product_name"), 500),
        brand              = _safe_str(off_data.get("brands"), 255),
        quantity           = _safe_str(off_data.get("quantity"), 100),
        ingredients_text   = off_data.get("ingredients_text") or "",
        additives_tags     = ",".join(additives) if additives else "",
        nova_group         = off_data.get("nova_group"),
        nutriscore_grade   = raw_grade[:20] if raw_grade else None,
        energy_kcal_100g   = nutrients.get("energy-kcal_100g"),
        protein_100g       = nutrients.get("proteins_100g"),
        fat_100g           = nutrients.get("fat_100g"),
        saturated_fat_100g = nutrients.get("saturated-fat_100g"),
        trans_fat_100g     = nutrients.get("trans-fat_100g"),
        sugars_100g        = nutrients.get("sugars_100g"),
        sodium_100g        = nutrients.get("sodium_100g"),
        fiber_100g         = nutrients.get("fiber_100g"),
        allergens          = _safe_str(off_data.get("allergens"), 500) or "",
        categories         = ",".join(off_data.get("categories_tags", []))[:500],
        source             = "off_api",
        data_verified      = False,
    )


def _save_scan(user_id, product, category, input_method, score):
    try:
        scan = Scan(
            user_id      = user_id,
            barcode      = product.barcode,
            product_name = _safe_str(product.product_name, 500),
            category     = category,
            input_method = input_method,
            base_score   = score,
        )
        db.session.add(scan)
        db.session.commit()
    except Exception:
        db.session.rollback()


@scan_bp.route("/barcode", methods=["POST"])
@jwt_optional
def scan_barcode():
    data     = request.get_json(silent=True) or {}
    barcode  = (data.get("barcode") or "").strip()
    category = (data.get("category") or "general").strip()
    if not barcode:
        return jsonify({"error": "Barcode is required"}), 400

    product = db.session.get(Product, barcode)

    if product:
        off_data = _fetch_from_off(barcode)
        if off_data:
            new_text = off_data.get("ingredients_text") or ""
            new_hash = Product.compute_hash(new_text) if new_text else None
            if new_hash and new_hash != product.ingredients_hash:
                db.session.add(IngredientChange(
                    barcode=barcode, old_hash=product.ingredients_hash,
                    new_hash=new_hash, old_text=product.ingredients_text, new_text=new_text,
                ))
                product.ingredients_text   = new_text
                product.ingredients_hash   = new_hash
                product.food_pharmer_score = None
                product.verdict_text       = None
                product.data_verified      = False
                try: db.session.commit()
                except Exception: db.session.rollback()

    if not product:
        off_data = _fetch_from_off(barcode)
        if off_data:
            product = _off_to_product(barcode, off_data)
            if product.ingredients_text:
                product.ingredients_hash = Product.compute_hash(product.ingredients_text)
            db.session.add(product)
            try: db.session.commit()
            except Exception: db.session.rollback()

    if not product or not product.ingredients_text:
        return jsonify({"status": "NOT_FOUND",
                        "message": "Product not found. Upload a photo of the ingredients list."}), 404

    result = _run_pipeline(product, category)
    _save_scan(g.user_id, product, category, "barcode", result["score"])
    return jsonify({"status": "OK", **result}), 200


@scan_bp.route("/photo", methods=["POST"])
@jwt_optional
def scan_photo():
    data      = request.get_json(silent=True) or {}
    image_b64 = data.get("image") or ""
    category  = (data.get("category") or "general").strip()
    if not image_b64:
        return jsonify({"error": "Image (base64) is required"}), 400

    try:
        extracted = extract_from_image(image_b64, category)
    except ValueError as e:
        return jsonify({"error": str(e)}), 422

    barcode = extracted.get("barcode") or extracted.get("food_id")
    product = None

    if barcode:
        barcode = str(barcode).strip()
        product = db.session.get(Product, barcode)
        if not product:
            off_data = _fetch_from_off(barcode)
            if off_data:
                product = _off_to_product(barcode, off_data)
                if product.ingredients_text:
                    product.ingredients_hash = Product.compute_hash(product.ingredients_text)
                db.session.add(product)
                try: db.session.commit()
                except Exception: db.session.rollback()

    # ── Build override_nutrition_per_serving from photo extraction ────────────
    # This is used when the product row has no nutrition data (all None fields)
    override_nutrition = None

    if not product:
        n100            = extracted.get("nutrition_per_100g") or {}
        n_serv          = extracted.get("nutrition_per_serving") or {}
        ingredients_raw = extracted.get("ingredients_raw") or ""
        new_hash        = Product.compute_hash(ingredients_raw) if ingredients_raw else None
        barcode_key     = f"PHOTO_{new_hash[:12]}" if new_hash else "PHOTO_UNKNOWN"
        serving_g_ext   = extracted.get("serving_size_g") or get_default_serving(category)

        product = Product(
            barcode            = barcode_key,
            product_name       = _safe_str(extracted.get("product_name"), 500) or "Unknown",
            brand              = _safe_str(extracted.get("brand"), 255) or "",
            ingredients_text   = ingredients_raw,
            ingredients_hash   = new_hash,
            nova_group         = 4,
            # Store per-100g values if available
            energy_kcal_100g   = n100.get("energy_kcal"),
            protein_100g       = n100.get("protein_g"),
            fat_100g           = n100.get("fat_g"),
            saturated_fat_100g = n100.get("saturated_fat_g"),
            trans_fat_100g     = n100.get("trans_fat_g"),
            sugars_100g        = n100.get("sugar_g"),
            sodium_100g        = (n100.get("sodium_g") or
                                   (n100.get("sodium_mg") / 1000 if n100.get("sodium_mg") else None)),
            fiber_100g         = n100.get("fiber_g"),
            allergens          = ",".join(extracted.get("allergens") or []),
            source             = "photo_scan",
            data_verified      = False,
        )
        if ingredients_raw and not db.session.get(Product, barcode_key):
            db.session.add(product)
            try: db.session.commit()
            except Exception: db.session.rollback()

        # Build per-serving override from extracted data
        if n_serv and any(v is not None for v in n_serv.values()):
            # Photo gave us per-serving values directly — use them
            override_nutrition = {
                "sugar_g":         n_serv.get("sugar_g") or 0,
                "sodium_mg":       n_serv.get("sodium_mg") or 0,
                "total_fat_g":     n_serv.get("fat_g") or 0,
                "saturated_fat_g": n_serv.get("saturated_fat_g") or 0,
                "trans_fat_g":     n_serv.get("trans_fat_g") or 0,
                "protein_g":       n_serv.get("protein_g") or 0,
                "fiber_g":         n_serv.get("fiber_g") or 0,
                "energy_kcal":     n_serv.get("energy_kcal") or 0,
                "_serving_g_used": serving_g_ext,
            }
        elif n100 and any(v is not None for v in n100.values()):
            # Only per-100g available — convert
            override_nutrition = per_100g_to_per_serving(
                {
                    "sugars_100g":        n100.get("sugar_g"),
                    "sodium_100g":        (n100.get("sodium_g") or
                                           (n100.get("sodium_mg", 0) / 1000)),
                    "fat_100g":           n100.get("fat_g"),
                    "saturated_fat_100g": n100.get("saturated_fat_g"),
                    "trans_fat_100g":     n100.get("trans_fat_g"),
                    "protein_100g":       n100.get("protein_g"),
                    "fiber_100g":         n100.get("fiber_g"),
                    "energy-kcal_100g":   n100.get("energy_kcal"),
                },
                serving_g_ext,
                category,
            )
    else:
        # Product exists in DB — check if it's missing nutrition data
        has_nutrition = any([
            product.energy_kcal_100g, product.protein_100g,
            product.sugars_100g, product.fat_100g,
        ])
        if not has_nutrition:
            # DB row has no nutrition — use photo-extracted data
            n100   = extracted.get("nutrition_per_100g") or {}
            n_serv = extracted.get("nutrition_per_serving") or {}
            serving_g_ext = extracted.get("serving_size_g") or get_default_serving(category)

            if n_serv and any(v is not None for v in n_serv.values()):
                override_nutrition = {
                    "sugar_g":         n_serv.get("sugar_g") or 0,
                    "sodium_mg":       n_serv.get("sodium_mg") or 0,
                    "total_fat_g":     n_serv.get("fat_g") or 0,
                    "saturated_fat_g": n_serv.get("saturated_fat_g") or 0,
                    "trans_fat_g":     n_serv.get("trans_fat_g") or 0,
                    "protein_g":       n_serv.get("protein_g") or 0,
                    "fiber_g":         n_serv.get("fiber_g") or 0,
                    "energy_kcal":     n_serv.get("energy_kcal") or 0,
                    "_serving_g_used": serving_g_ext,
                }
            elif n100 and any(v is not None for v in n100.values()):
                override_nutrition = per_100g_to_per_serving(
                    {
                        "sugars_100g":        n100.get("sugar_g"),
                        "sodium_100g":        (n100.get("sodium_g") or
                                               (n100.get("sodium_mg", 0) / 1000)),
                        "fat_100g":           n100.get("fat_g"),
                        "saturated_fat_100g": n100.get("saturated_fat_g"),
                        "trans_fat_100g":     n100.get("trans_fat_g"),
                        "protein_100g":       n100.get("protein_g"),
                        "fiber_100g":         n100.get("fiber_g"),
                        "energy-kcal_100g":   n100.get("energy_kcal"),
                    },
                    serving_g_ext,
                    category,
                )

            # Also update the product DB row with the extracted nutrition
            # so future scans have the data
            if n100:
                if n100.get("energy_kcal"):  product.energy_kcal_100g   = n100["energy_kcal"]
                if n100.get("protein_g"):    product.protein_100g        = n100["protein_g"]
                if n100.get("fat_g"):        product.fat_100g            = n100["fat_g"]
                if n100.get("saturated_fat_g"): product.saturated_fat_100g = n100["saturated_fat_g"]
                if n100.get("sugar_g"):      product.sugars_100g         = n100["sugar_g"]
                if n100.get("trans_fat_g"):  product.trans_fat_100g      = n100["trans_fat_g"]
                if n100.get("sodium_g"):     product.sodium_100g         = n100["sodium_g"]
                elif n100.get("sodium_mg"):  product.sodium_100g         = n100["sodium_mg"] / 1000
                if n100.get("fiber_g"):      product.fiber_100g          = n100["fiber_g"]
                # Clear cached score so it's recomputed with correct nutrition
                product.food_pharmer_score = None
                product.verdict_text       = None
                try: db.session.commit()
                except Exception: db.session.rollback()

    if not product or not (product.ingredients_text):
        return jsonify({
            "status":         "LOW_CONFIDENCE",
            "message":        "Could not read ingredients. Try better lighting or a clearer angle.",
            "ocr_confidence": extracted.get("ocr_confidence", "LOW"),
        }), 422

    result = _run_pipeline(product, category, override_nutrition_per_serving=override_nutrition)
    result["ocr_confidence"] = extracted.get("ocr_confidence", "HIGH")
    _save_scan(g.user_id, product, category, "photo", result["score"])
    return jsonify({"status": "OK", **result}), 200


@scan_bp.route("/link", methods=["POST"])
@jwt_optional
def scan_link():
    data     = request.get_json(silent=True) or {}
    url      = (data.get("url") or "").strip()
    category = (data.get("category") or "general").strip()
    if not url:
        return jsonify({"error": "URL is required"}), 400

    if "blinkit.com" in url:      platform = "blinkit"
    elif "bigbasket.com" in url:  platform = "bigbasket"
    else:
        return jsonify({"error": "Only Blinkit and BigBasket URLs are supported"}), 400

    url_hash = hashlib.md5(url.encode()).hexdigest()
    cached   = db.session.get(URLCache, url_hash)
    if cached and not cached.is_expired() and cached.barcode:
        product = db.session.get(Product, cached.barcode)
        if product:
            result = _run_pipeline(product, category)
            result["source"] = f"cache ({platform})"
            return jsonify({"status": "OK", **result}), 200

    scraper_url = f"{__import__('os').getenv('SCRAPER_SERVICE_URL', 'http://localhost:5001')}/scrape"
    try:
        scrape_resp = requests.post(scraper_url,
                                    json={"url": url, "platform": platform}, timeout=30)
        scrape_data = scrape_resp.json()
    except Exception as e:
        return jsonify({"error": f"Scraper unavailable: {str(e)}",
                        "hint": "Run the Playwright scraper service separately."}), 503

    barcode = scrape_data.get("barcode")
    product = None
    if barcode:
        product = db.session.get(Product, str(barcode))
        if not product:
            off_data = _fetch_from_off(str(barcode))
            if off_data:
                product = _off_to_product(str(barcode), off_data)
                if product.ingredients_text:
                    product.ingredients_hash = Product.compute_hash(product.ingredients_text)
                db.session.add(product)
                try: db.session.commit()
                except Exception: db.session.rollback()

    if not product and scrape_data.get("ingredients_text"):
        ing_text    = scrape_data["ingredients_text"]
        barcode_key = f"LINK_{hashlib.md5(ing_text.encode()).hexdigest()[:12]}"
        product = Product(
            barcode=barcode_key,
            product_name=_safe_str(scrape_data.get("product_name"), 500) or "",
            brand=_safe_str(scrape_data.get("brand"), 255) or "",
            ingredients_text=ing_text,
            ingredients_hash=Product.compute_hash(ing_text),
            source=platform, data_verified=False, nova_group=4,
        )
        db.session.add(product)
        try: db.session.commit()
        except Exception: db.session.rollback()

    if not product:
        return jsonify({"error": "Could not determine product ingredients"}), 422

    result = _run_pipeline(product, category)
    result["platform"] = platform
    try:
        entry = URLCache(url_hash=url_hash, url=url, platform=platform,
                         barcode=product.barcode, score=result["score"],
                         verdict=result["verdict_text"])
        db.session.merge(entry)
        db.session.commit()
    except Exception:
        db.session.rollback()

    _save_scan(g.user_id, product, category, "link", result["score"])
    return jsonify({"status": "OK", **result}), 200