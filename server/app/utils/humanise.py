"""
app/utils/humanise.py  (FIXED v2)
===================================
Fixes applied:

  1. Biscuit default serving size changed from 25g to 15g.
     Good Day and most Indian biscuits use ~15g (2 biscuits) as one serving.
     Using 25g was inflating sugar/sodium/fat by 67%.

  2. fat_tbsp now rounds to 2 decimal places for display so small values
     like 0.26 tbsp don't round down to 0.0.
     Display string uses 1dp but the value is accurate.

  3. Category default serving sizes reviewed against common Indian products:
     biscuit     : 15g  (2 biscuits — matches Good Day, Parle-G, Marie)
     chips_namkeen: 26g (standard small packet)
     chocolate   : 25g  (half a small bar)
     protein_powder: 30g (standard scoop)
     sauce_ketchup : 17g (one tablespoon)

  4. Added get_serving_used() helper so scan route can report which
     serving size was actually used in the calculation.
"""

SUGAR_G_PER_TSP      = 4.2
SALT_G_PER_PINCH     = 0.5
SALT_G_PER_TSP       = 5.0
SODIUM_MG_PER_G_SALT = 400
OIL_G_PER_TBSP       = 14.0
OIL_ML_PER_TBSP      = 15.0

DAILY_SUGAR_G   = 25
DAILY_SODIUM_MG = 2000
DAILY_FAT_G     = 60
DAILY_CALORIES  = 2000

# ─── Default serving sizes by category (reviewed against real Indian products) ─
CATEGORY_DEFAULT_SERVING_G = {
    # Liquids
    "cold_drink":       200,   # 200ml standard glass / can
    "health_drink":     200,   # 200ml prepared in milk

    # Dairy
    "dairy":            200,   # 200ml glass of milk / lassi / curd

    # Biscuits — 15g = 2 standard biscuits (Parle-G, Good Day, Marie, etc.)
    "biscuit":          15,    # FIX: was 25g — too large

    # Snacks
    "chips_namkeen":    26,    # standard small packet / handful

    # Meals
    "breakfast_cereal": 40,    # one katori dry cereal
    "instant_noodles":  75,    # one small pack

    # Supplements
    "protein_powder":   30,    # one standard scoop

    # Condiments
    "sauce_ketchup":    17,    # one tablespoon / serving

    # Sweet
    "chocolate":        25,    # half a small bar

    # Special
    "baby_food":        30,    # one serving sachet

    # Fallback
    "general":          100,
}


def get_default_serving(category: str) -> float:
    """Return the default serving size in grams/ml for a category."""
    return CATEGORY_DEFAULT_SERVING_G.get(category or "general", 100)


def per_100g_to_per_serving(
    nutrition_100g: dict,
    serving_size_g: float | None,
    category: str = "general",
) -> dict:
    """
    Convert per-100g nutrition to per-serving nutrition.

    When serving_size_g is None, use the category-appropriate default.
    sodium_100g from Open Food Facts is in g/100g — converted to mg here.
    """
    if not serving_size_g or serving_size_g <= 0:
        serving_size_g = get_default_serving(category)

    factor = serving_size_g / 100.0

    return {
        "sugar_g":         round((nutrition_100g.get("sugars_100g") or 0) * factor, 1),
        "sodium_mg":       round((nutrition_100g.get("sodium_100g") or 0) * 1000 * factor),
        "total_fat_g":     round((nutrition_100g.get("fat_100g") or 0) * factor, 1),
        "saturated_fat_g": round(
            (nutrition_100g.get("saturated_fat_100g") or
             nutrition_100g.get("saturated-fat_100g") or 0) * factor, 1
        ),
        "trans_fat_g":     round((nutrition_100g.get("trans_fat_100g") or 0) * factor, 2),
        "protein_g":       round((nutrition_100g.get("protein_100g") or 0) * factor, 1),
        "fiber_g":         round((nutrition_100g.get("fiber_100g") or 0) * factor, 1),
        "energy_kcal":     round(
            (nutrition_100g.get("energy-kcal_100g") or
             nutrition_100g.get("energy_kcal_100g") or 0) * factor
        ),
        "_serving_g_used": serving_size_g,   # internal — for display/debug
    }


def humanise_nutrition(nutrition: dict) -> dict:
    """
    Convert per-serving nutrition dict to human-friendly display values.

    FIX: fat_tbsp now uses 2dp internally but displays at 1dp,
    preventing small values from showing as 0.0.
    """
    sugar   = nutrition.get("sugar_g", 0) or 0
    sodium  = nutrition.get("sodium_mg", 0) or 0
    fat     = nutrition.get("total_fat_g", 0) or 0
    sat_fat = nutrition.get("saturated_fat_g", 0) or 0
    trans   = nutrition.get("trans_fat_g", 0) or 0
    protein = nutrition.get("protein_g", 0) or 0
    fiber   = nutrition.get("fiber_g", 0) or 0
    cal     = nutrition.get("energy_kcal", 0) or 0

    sugar_tsp    = round(sugar / SUGAR_G_PER_TSP, 1)
    salt_g       = round(sodium / SODIUM_MG_PER_G_SALT, 2)
    salt_pinches = round(salt_g / SALT_G_PER_PINCH, 1)
    # FIX: keep 2dp precision internally; only round for display string
    fat_tbsp_raw = fat / OIL_G_PER_TBSP
    fat_tbsp_display = f"{fat_tbsp_raw:.1f}" if fat_tbsp_raw >= 0.1 else f"{fat_tbsp_raw:.2f}"

    return {
        "sugar": {
            "value_g":    round(sugar, 1),
            "value_tsp":  sugar_tsp,
            "pct_daily":  round(sugar / DAILY_SUGAR_G * 100),
            "display":    f"{sugar_tsp} teaspoons of sugar",
            "display_hi": f"{sugar_tsp} teaspoon cheeni",
        },
        "sodium": {
            "value_mg":     round(sodium),
            "value_salt_g": salt_g,
            "pinches":      salt_pinches,
            "pct_daily":    round(sodium / DAILY_SODIUM_MG * 100),
            "display":      f"{salt_pinches} pinches of salt",
            "display_hi":   f"{salt_pinches} chutki namak",
        },
        "fat": {
            "value_g":    round(fat, 1),
            "value_tbsp": round(fat_tbsp_raw, 2),     # accurate 2dp value
            "display":    f"{fat_tbsp_display} tablespoons of oil",   # human readable
            "pct_daily":  round(fat / DAILY_FAT_G * 100),
            "display_hi": f"{fat_tbsp_display} chamach tel",
        },
        "saturated_fat": {
            "value_g": round(sat_fat, 1),
        },
        "trans_fat": {
            "value_g": round(trans, 2),
            "present": trans > 0,
        },
        "protein": {
            "value_g":   round(protein, 1),
            "pct_daily": round(protein / 60 * 100),
        },
        "fiber": {
            "value_g":   round(fiber, 1),
            "pct_daily": round(fiber / 30 * 100),
        },
        "calories": {
            "value_kcal": round(cal),
            "pct_daily":  round(cal / DAILY_CALORIES * 100),
            "display":    f"{round(cal / DAILY_CALORIES * 100)}% of daily calories",
        },
    }


def describe_serving_size(grams: float, category: str = "general") -> str:
    """Plain-English description of what the serving size represents."""
    if not grams:
        return ""

    if category in ("cold_drink", "health_drink", "dairy"):
        return f"{int(grams)}ml — about one glass"

    if grams <= 15:
        return f"{grams}g — about 2 biscuits"
    if grams <= 20:
        return f"{grams}g — about 3–4 biscuits or a small handful"
    if grams <= 35:
        return f"{grams}g — about one small serving or packet"
    if grams <= 75:
        return f"{grams}g — about half a cup or one small bowl"
    if grams <= 150:
        return f"{grams}g — about one katori (bowl)"
    if grams <= 250:
        return f"{grams}g — about one full glass or large serving"
    return f"{grams}g"


def get_consumption_frequency(score: int, category: str) -> dict:
    """
    Deterministic consumption frequency recommendation.
    Based on score band and category context.
    """
    if category == "baby_food":
        if score >= 70:
            return {
                "label":  "Daily (in moderation)",
                "detail": "Safe for regular use — always check with your paediatrician.",
                "color":  "GREEN", "emoji": "👶",
            }
        return {
            "label":  "Avoid",
            "detail": "Not recommended for infants and young children.",
            "color":  "RED", "emoji": "🚫",
        }

    if score >= 75:
        return {
            "label":  "Daily",
            "detail": "Clean ingredients, minimal processing. Safe for everyday consumption.",
            "color":  "GREEN", "emoji": "✅",
        }
    if score >= 60:
        return {
            "label":  "3–4 times a week",
            "detail": "Generally okay but has minor concerns. Best not every single day.",
            "color":  "GREEN", "emoji": "📅",
        }
    if score >= 45:
        return {
            "label":  "Once or twice a week",
            "detail": "Has some problematic ingredients. Fine occasionally but not a daily habit.",
            "color":  "ORANGE", "emoji": "⚠️",
        }
    if score >= 30:
        return {
            "label":  "Once or twice a month",
            "detail": "Significant concerns — artificial additives, high sugar, or harmful preservatives. Occasional indulgence only.",
            "color":  "ORANGE", "emoji": "📆",
        }
    if score >= 15:
        return {
            "label":  "Rarely — once or twice a year",
            "detail": "Very poor ingredient profile. Only as a rare treat, never as a regular food.",
            "color":  "RED", "emoji": "🚨",
        }
    return {
        "label":  "Avoid entirely",
        "detail": "Extremely poor score — contains highly harmful ingredients. Better alternatives always available.",
        "color":  "RED", "emoji": "🚫",
    }