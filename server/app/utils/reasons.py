"""
app/utils/reasons.py
====================
Deterministic reasons to eat / reasons to avoid.
These are NEVER AI-generated — derived directly from verified data.
Groq only formats them in the LabelScan AI voice in the final verdict.
Maximum 3 reasons each.
"""

ICMR_DAILY = {"sugar_g": 25, "sodium_mg": 2000, "protein_g": 60, "fiber_g": 30}


def get_reasons_to_eat(nutrition: dict, matched_ingredients: list[dict]) -> list[dict]:
    reasons = []
    p  = nutrition.get("protein_g") or 0
    f  = nutrition.get("fiber_g") or 0
    s  = nutrition.get("sugar_g") or 0
    na = nutrition.get("sodium_mg") or 0

    if p >= 10:
        reasons.append({"icon": "💪", "text": f"Good protein — {p}g per serving", "source": "ICMR RDA: 60g/day"})
    if f >= 5:
        reasons.append({"icon": "🌾", "text": f"High fibre — {f}g ({round(f/30*100)}% of daily need)", "source": "ICMR RDA: 30g/day"})
    if s < 2:
        reasons.append({"icon": "✅", "text": f"Very low sugar — only {round(s/4.2,1)} teaspoon per serving", "source": "WHO: <25g/day"})
    if na < 150:
        reasons.append({"icon": "❤️", "text": f"Low sodium — heart-friendly at {na}mg per serving", "source": "ICMR: <2000mg/day"})
    all_natural = all(i.get("harm_level", 1) <= 1 for i in matched_ingredients)
    if all_natural and matched_ingredients:
        reasons.append({"icon": "🌿", "text": "No artificial additives — all ingredients natural", "source": "FSSAI verified"})

    return reasons[:3]


def get_reasons_to_avoid(matched_ingredients: list[dict], nutrition: dict) -> list[dict]:
    reasons = []
    harmful = sorted(
        [i for i in matched_ingredients if i.get("harm_level", 1) >= 3],
        key=lambda x: x.get("harm_level", 1), reverse=True
    )
    for ing in harmful[:2]:
        icon = "🚫" if ing.get("harm_level") == 4 else "⚠️"
        reason_text = (ing.get("harm_reason") or "").split(";")[0]
        reasons.append({
            "icon":   icon,
            "text":   f"Contains {ing.get('name_english', '')} — {reason_text}",
            "source": "FSSAI / EFSA data",
        })

    if len(reasons) < 3:
        sugar_tsp = round((nutrition.get("sugar_g") or 0) / 4.2, 1)
        sodium    = nutrition.get("sodium_mg") or 0
        trans     = nutrition.get("trans_fat_g") or 0
        if trans > 0:
            reasons.append({"icon": "🚨", "text": f"Contains trans fat ({trans}g) — WHO recommends zero", "source": "WHO"})
        elif sugar_tsp > 5:
            reasons.append({"icon": "🍬", "text": f"{sugar_tsp} teaspoons of sugar per serving — {round(sugar_tsp*4.2/25*100)}% of daily limit", "source": "WHO: <25g/day"})
        elif sodium > 800:
            reasons.append({"icon": "🧂", "text": f"Very high sodium — {sodium}mg = {round(sodium/2000*100)}% of daily limit per serving", "source": "ICMR RDA"})

    return reasons[:3]
