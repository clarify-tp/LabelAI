"""
app/tools/score_engine.py  (FIXED)
====================================
Fixes:
  1. Trans fat threshold added: only penalise if trans_fat_g > 0.1g per serving.
     OWN Whey Protein had 0.017g naturally occurring dairy trans fat —
     this was triggering the full -35 penalty which is meant for industrial
     trans fat (partially hydrogenated oils). WHO targets industrial trans fat,
     not naturally occurring conjugated linoleic acid (CLA) in dairy.

  2. humanised_nutrition is now ALWAYS included in the return dict.
     Previously it was only set when the tool was called via Groq.
     When the fallback path (direct calculate_food_score) ran, it returned
     an empty humanised_nutrition dict, causing the Maggi nutrition visual
     to show nothing.

  3. nova_group None guard: defaults to 4 if missing/invalid.
"""

from app.tools.category_config import CATEGORY_CONFIG
from app.utils.humanise import humanise_nutrition

# ─── ICMR RDA ─────────────────────────────────────────────────────────────────
ICMR_RDA = {
    "sugar_g":         25,
    "sodium_mg":       2000,
    "saturated_fat_g": 20,
    "total_fat_g":     60,
    "protein_g":       60,
    "fiber_g":         30,
}

# ─── Trans fat threshold ───────────────────────────────────────────────────────
# Industrial trans fat (from partially hydrogenated oils) → penalise heavily.
# Naturally occurring trans fat in dairy (CLA) → do NOT penalise.
# Threshold: 0.1g per serving. Below this is likely dairy-sourced.
TRANS_FAT_PENALTY_THRESHOLD_G = 0.1


def calculate_food_score(
    matched_ingredients: list[dict],
    nutrition_per_serving: dict,
    nova_group: int,
    category: str,
) -> dict:
    """
    Deterministic Food Pharmer Score calculator.
    Called as an LLM tool — the LLM never computes this number itself.

    Returns score (0-100), band, label, breakdown, humanised_nutrition,
    worst_ingredient, harmful_count, sugar_teaspoons.
    """
    cfg  = CATEGORY_CONFIG.get(category, CATEGORY_CONFIG["general"])
    mult = cfg["penalty_multiplier"]

    # Guard nova_group
    if nova_group not in (1, 2, 3, 4):
        nova_group = 4

    score     = 100.0
    breakdown = []

    # ── 1. NOVA processing penalty ────────────────────────────────────────────
    nova_penalties = {1: 0, 2: 0, 3: 8, 4: 20}
    nova_penalty   = nova_penalties.get(nova_group, 0)
    if nova_penalty > 0:
        score -= nova_penalty
        breakdown.append({
            "type":    "nova",
            "label":   f"NOVA Group {nova_group} — ultra-processed",
            "penalty": -nova_penalty,
        })

    # ── 2. Ingredient harm penalties ──────────────────────────────────────────
    seen_ins = set()
    for ing in matched_ingredients:
        ins  = ing.get("ins_no", "")
        if ins in seen_ins:
            continue
        seen_ins.add(ins)

        harm         = ing.get("harm_level", 1)
        base_penalty = {4: 20, 3: 10, 2: 4, 1: 0}.get(harm, 0)
        if base_penalty == 0:
            continue

        final_penalty = round(base_penalty * mult)
        score        -= final_penalty
        breakdown.append({
            "type":           "ingredient",
            "label":          ing.get("name_english", ins),
            "harm_level":     harm,
            "penalty":        -final_penalty,
            "reason":         ing.get("harm_reason", ""),
            "revant_concern": ing.get("revant_concern") == "YES",
        })

    # ── 3. Nutrition penalties (category-specific thresholds) ─────────────────
    sug    = nutrition_per_serving.get("sugar_g",         0) or 0
    sodium = nutrition_per_serving.get("sodium_mg",       0) or 0
    sat_f  = nutrition_per_serving.get("saturated_fat_g", 0) or 0
    trans  = nutrition_per_serving.get("trans_fat_g",     0) or 0
    prot   = nutrition_per_serving.get("protein_g",       0) or 0
    fiber  = nutrition_per_serving.get("fiber_g",         0) or 0

    sugar_tsp  = round(sug / 4.2, 1)
    sug_thresh = cfg["sugar_thresholds"]
    sod_thresh = cfg["sodium_thresholds"]

    if sug > sug_thresh["high"] * 2:
        p = round(20 * mult); score -= p
        breakdown.append({"type": "nutrition", "label": f"Sugar: {sugar_tsp} tsp (very high for {cfg['label']})", "penalty": -p})
    elif sug > sug_thresh["high"]:
        p = round(12 * mult); score -= p
        breakdown.append({"type": "nutrition", "label": f"Sugar: {sugar_tsp} tsp (high)", "penalty": -p})
    elif sug > sug_thresh["low"]:
        p = round(5 * mult); score -= p
        breakdown.append({"type": "nutrition", "label": f"Sugar: {sugar_tsp} tsp", "penalty": -p})

    if sodium > sod_thresh["high"] * 1.5:
        p = round(15 * mult); score -= p
        breakdown.append({"type": "nutrition", "label": f"Sodium: {sodium}mg (very high)", "penalty": -p})
    elif sodium > sod_thresh["high"]:
        p = round(8 * mult); score -= p
        breakdown.append({"type": "nutrition", "label": f"Sodium: {sodium}mg (high)", "penalty": -p})

    if sat_f > cfg.get("sat_fat_threshold", 5) * 1.5:
        p = round(10 * mult); score -= p
        breakdown.append({"type": "nutrition", "label": f"Saturated fat: {sat_f}g", "penalty": -p})

    # FIX: only penalise trans fat above threshold (avoids penalising natural dairy CLA)
    if trans > TRANS_FAT_PENALTY_THRESHOLD_G:
        score -= 35
        breakdown.append({
            "type":    "nutrition",
            "label":   f"Trans fat: {trans}g — industrial trans fat (WHO recommends zero)",
            "penalty": -35,
        })

    # ── 4. Category bonuses ────────────────────────────────────────────────────
    bonuses = cfg.get("bonuses", {})

    if bonuses.get("protein_gt_15g") and prot >= 15:
        score += bonuses["protein_gt_15g"]
        breakdown.append({"type": "bonus", "label": f"High protein: {prot}g", "bonus": bonuses["protein_gt_15g"]})

    if bonuses.get("fiber_gt_5g") and fiber >= 5:
        score += bonuses["fiber_gt_5g"]
        breakdown.append({"type": "bonus", "label": f"Good fibre: {fiber}g", "bonus": bonuses["fiber_gt_5g"]})

    if bonuses.get("no_sweeteners"):
        has_sweetener = any(
            "sweetener" in (i.get("functional_class") or "").lower()
            for i in matched_ingredients
        )
        if not has_sweetener:
            score += bonuses["no_sweeteners"]
            breakdown.append({"type": "bonus", "label": "No artificial sweeteners", "bonus": bonuses["no_sweeteners"]})

    if bonuses.get("ingredients_lt_8") and len(matched_ingredients) < 8:
        score += bonuses["ingredients_lt_8"]
        breakdown.append({"type": "bonus", "label": f"Short ingredient list ({len(matched_ingredients)} items)", "bonus": bonuses["ingredients_lt_8"]})

    # ── 5. Clamp and classify ──────────────────────────────────────────────────
    final_score = max(0, min(100, round(score)))
    band  = "GREEN"  if final_score >= 70 else ("ORANGE" if final_score >= 45 else "RED")
    label = "Clean ✓" if final_score >= 70 else ("Caution ⚠️" if final_score >= 45 else "Avoid 🚫")

    ingredient_penalties = [b for b in breakdown if b.get("type") == "ingredient"]
    worst = (
        min(ingredient_penalties, key=lambda x: x.get("penalty", 0))
        if ingredient_penalties else None
    )

    harmful_count = sum(1 for i in matched_ingredients if i.get("harm_level", 1) >= 3)

    # FIX: always compute humanised_nutrition so result dict is never empty
    hn = humanise_nutrition(nutrition_per_serving)

    return {
        "score":               final_score,
        "band":                band,
        "label":               label,
        "category":            cfg["label"],
        "category_context":    cfg["context"],
        "breakdown":           breakdown,
        "worst_ingredient":    worst,
        "harmful_count":       harmful_count,
        "total_ingredients":   len(matched_ingredients),
        "sugar_teaspoons":     sugar_tsp,
        "humanised_nutrition": hn,   # FIX: always included
    }


# ─── JSON Schema for LLM tool calling ────────────────────────────────────────
CALCULATE_FOOD_SCORE_SCHEMA = {
    "type": "function",
    "function": {
        "name": "calculate_food_score",
        "description": (
            "Calculate the Food Pharmer Score (0-100) for a food product. "
            "Always call this tool before writing any verdict. "
            "Do NOT compute or guess the score yourself."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "matched_ingredients": {
                    "type": "array",
                    "description": "List of matched FSSAI ingredient objects",
                    "items": {
                        "type": "object",
                        "properties": {
                            "ins_no":           {"type": "string"},
                            "name_english":     {"type": "string"},
                            "harm_level":       {"type": "integer"},
                            "functional_class": {"type": "string"},
                            "harm_reason":      {"type": "string"},
                            "revant_concern":   {"type": "string"},
                        },
                    },
                },
                "nutrition_per_serving": {
                    "type": "object",
                    "description": "Per-serving nutrition values",
                    "properties": {
                        "sugar_g":          {"type": "number"},
                        "sodium_mg":        {"type": "number"},
                        "saturated_fat_g":  {"type": "number"},
                        "trans_fat_g":      {"type": "number"},
                        "protein_g":        {"type": "number"},
                        "fiber_g":          {"type": "number"},
                        "energy_kcal":      {"type": "number"},
                    },
                },
                "nova_group": {
                    "type": "integer",
                    "description": "NOVA processing group 1-4",
                },
                "category": {
                    "type": "string",
                    "description": "Product category slug",
                },
            },
            "required": [
                "matched_ingredients", "nutrition_per_serving",
                "nova_group", "category",
            ],
        },
    },
}