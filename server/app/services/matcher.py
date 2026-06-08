"""
app/services/matcher.py  (FIXED v3)
=====================================
Key fix in this version:
  - "invert sugar syrup" and "invert syrup" now map to INVERT_SUGAR (harm_level 2)
    instead of HFCS (harm_level 4).
  - "glucose syrup" similarly stays at INVERT_SUGAR level — it's refined sugar,
    not industrially produced HFCS.
  - "high fructose corn syrup" and "corn syrup" remain mapped to HFCS (harm_level 4).
  - sucralose alias confirmed mapping to INS 955 (harm_level 4 after DB fix).
  - All other aliases from v2 retained.
"""

import re
from app.models.ingredient import Ingredient, UnknownIngredient
from app import db

INS_PATTERN = re.compile(
    r'\b(\d{3,4}(?:\([ivxabc]+\))?)\b',
    re.IGNORECASE
)

SAFE_BASE_KEYWORDS = {
    "water", "salt", "wheat", "rice", "milk", "egg", "butter", "ghee",
    "honey", "jaggery", "sugar", "cocoa", "vanilla", "cinnamon", "turmeric",
    "cardamom", "ginger", "pepper", "dal", "oats", "flour", "corn", "potato",
    "tomato", "onion", "garlic", "vinegar", "lemon", "cream", "cheese",
    "soy", "sesame", "mustard", "fenugreek", "cumin", "coriander", "fennel",
    "mango", "pulp", "fruit", "juice", "concentrate", "extract", "spice",
    "coconut", "peanut", "almond", "cashew", "raisin", "date", "tamarind",
    "ajwain", "asafoetida", "hing", "methi", "curry", "iodized", "iodised",
}

ADDITIVE_KEYWORDS = {
    "colour", "color", "emulsifier", "stabilizer", "stabiliser",
    "preservative", "antioxidant", "flavor", "flavour", "sweetener",
    "thickener", "humectant", "acidity regulator", "raising agent",
    "anticaking", "sequestrant", "bulking", "bleaching", "glazing",
}

ALIASES: dict[str, str] = {
    # ── Sweeteners ────────────────────────────────────────────────────────────
    "acesulfame potassium": "950", "acesulfame k": "950", "ace-k": "950",
    "aspartame": "951",
    "saccharin": "954", "sodium saccharin": "954",
    "sucralose": "955",
    "stevia": "960", "steviol glycosides": "960", "stevia leaf extract": "960",
    "neotame": "961",
    # FIX: invert sugar syrup → INVERT_SUGAR (harm_level 2), NOT HFCS (harm_level 4)
    "invert sugar syrup":     "INVERT_SUGAR",
    "invert syrup":           "INVERT_SUGAR",
    "liquid invert sugar":    "INVERT_SUGAR",
    "glucose syrup":          "INVERT_SUGAR",  # refined sugar syrup, not HFCS
    "glucose fructose syrup": "INVERT_SUGAR",  # borderline — keep at 2
    # HFCS only maps from explicit HFCS names
    "high fructose corn syrup": "HFCS",
    "hfcs":                     "HFCS",
    "corn syrup":               "HFCS",    # US product — genuine HFCS
    "high-fructose corn syrup": "HFCS",

    # ── Preservatives ─────────────────────────────────────────────────────────
    "sodium benzoate": "211",
    "potassium sorbate": "202", "sorbic acid": "200",
    "sodium metabisulphite": "223", "sodium metabisulfite": "223",
    "sodium nitrite": "250", "potassium nitrite": "249",
    "benzoic acid": "210",
    "sulphur dioxide": "220", "sulfur dioxide": "220",
    "potassium bisulphite": "228",
    "calcium propionate": "282", "sodium propionate": "281",

    # ── Colours ───────────────────────────────────────────────────────────────
    "tartrazine": "102", "tarrazine": "102", "yellow 5": "102",
    "sunset yellow fcf": "110", "sunset yellow": "110", "yellow 6": "110",
    "carmoisine": "122", "carmoisin": "122", "azorubine": "122",
    "amaranth": "123", "ponceau 4r": "124",
    "erythrosine": "127",
    "allura red ac": "129", "allura red": "129", "red 40": "129",
    "caramel iii": "150c", "caramel iv": "150d",
    "titanium dioxide": "171",
    "annatto": "160b", "paprika": "160c",
    "beta carotene": "160a", "beta-carotene": "160a",
    "curcumin": "100", "riboflavin": "101",

    # ── Antioxidants ──────────────────────────────────────────────────────────
    "tbhq": "319", "tertiary butylhydroquinone": "319",
    "bha": "320", "butylated hydroxyanisole": "320",
    "bht": "321", "butylated hydroxytoluene": "321",
    "ascorbic acid": "300", "sodium ascorbate": "301",
    "tocopherols": "306", "mixed tocopherols": "306",
    "rosemary extract": "392",

    # ── Flavour enhancers ─────────────────────────────────────────────────────
    "monosodium glutamate": "621", "msg": "621", "ajinomoto": "621",
    "disodium guanylate": "627",
    "disodium inosinate": "631",
    "disodium ribonucleotides": "635",

    # ── Emulsifiers ───────────────────────────────────────────────────────────
    "soya lecithin": "322", "soy lecithin": "322",
    "sunflower lecithin": "322", "lecithin": "322",
    "mono and diglycerides": "471",
    "mono  diglycerides of fatty acids": "471",
    "glyceryl monostearate": "471", "gms": "471",
    "datem": "472e",
    "diacetyl tartaric acid esters": "472e",
    "472f": "472f",
    "citric acid esters of monoglycerides": "472c",
    "polysorbate 80": "433", "polysorbate 60": "435",
    "sodium stearoyl lactylate": "481", "ssl": "481",
    "carrageenan": "407",
    "xanthan gum": "415", "guar gum": "412",
    "locust bean gum": "410", "pectin": "440",

    # ── Acidity regulators ────────────────────────────────────────────────────
    "citric acid": "330",
    "sodium citrate": "331", "trisodium citrate": "331",
    "lactic acid": "270", "acetic acid": "260",
    "sodium bicarbonate": "500", "baking soda": "500",
    "ammonium bicarbonate": "503",
    "potassium carbonate": "501",

    # ── Raising agents ────────────────────────────────────────────────────────
    "sodium acid pyrophosphate": "450",
    "disodium pyrophosphate": "450",

    # ── Thickeners / Stabilisers ──────────────────────────────────────────────
    "modified starch": "1442",
    "hydroxypropyl distarch phosphate": "1442",
    "acetylated distarch adipate": "1422",
    "starch sodium octenyl succinate": "1450",

    # ── Custom Indian base ingredients ────────────────────────────────────────
    "maida": "MAIDA",
    "refined wheat flour": "MAIDA",
    "refined flour": "MAIDA",
    "all purpose flour": "MAIDA",
    "plain flour": "MAIDA",
    "refined wheat flour maida": "MAIDA",
    "wheat flour maida": "MAIDA",

    "palm oil": "PALM_OIL",
    "refined palm oil": "PALM_OIL",
    "edible palm oil": "PALM_OIL",
    "edible refined palm oil": "PALM_OIL",
    "refined edible palm oil": "PALM_OIL",
    "palmolein": "PALM_OIL",
    "refined palmolein": "PALM_OIL",
    "palm olein": "PALM_OIL",
    "rbd palm oil": "PALM_OIL",

    "vanaspati": "HYDRO_VEG_OIL",
    "hydrogenated vegetable oil": "HYDRO_VEG_OIL",
    "partially hydrogenated vegetable oil": "HYDRO_VEG_OIL",
    "hydrogenated fat": "HYDRO_VEG_OIL",

    "interesterified fat": "INTERESTER_FAT",
    "interesterified vegetable fat": "INTERESTER_FAT",
    "interesterified vegetable oil": "INTERESTER_FAT",
}


def _clean_name(name: str) -> str:
    """Lowercase, strip percentage annotations and special chars, collapse whitespace."""
    cleaned = re.sub(r'\(\s*[\d.]+\s*%[^)]*\)', ' ', name)
    cleaned = re.sub(r'[^\w\s]', ' ', cleaned.lower())
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned


def _extract_all_ins(text: str) -> list[str]:
    return INS_PATTERN.findall(text)


def _alias_lookup(cleaned: str) -> str | None:
    if cleaned in ALIASES:
        return ALIASES[cleaned]
    for key in sorted(ALIASES.keys(), key=len, reverse=True):
        if len(key) >= 4 and key in cleaned:
            return ALIASES[key]
    return None


def match_ingredient(raw_name: str, product_barcode: str = None) -> list[dict]:
    """Match one ingredient string. Returns list (may be multiple for compound strings)."""
    results = []

    # Step 1: Extract all INS numbers
    ins_numbers = _extract_all_ins(raw_name)
    for ins in ins_numbers:
        record = db.session.get(Ingredient, ins)
        if not record:
            base = ins.split("(")[0]
            record = db.session.get(Ingredient, base)
        if record:
            entry = record.to_dict()
            entry.update({"match_status": "ins_direct", "raw_name": raw_name})
            results.append(entry)

    if results:
        return results

    # Step 2: Alias lookup (exact + substring)
    cleaned   = _clean_name(raw_name)
    ins_found = _alias_lookup(cleaned)

    if ins_found:
        record = db.session.get(Ingredient, ins_found)
        if record:
            entry = record.to_dict()
            entry.update({"match_status": "alias", "raw_name": raw_name})
            return [entry]
        # Fallback to custom entries
        from app.services.matcher_custom import CUSTOM_ENTRIES
        if ins_found in CUSTOM_ENTRIES:
            entry = dict(CUSTOM_ENTRIES[ins_found])
            entry.update({"match_status": "custom_alias", "raw_name": raw_name})
            return [entry]

    # Step 3: Full-text ILIKE search
    search_words = cleaned.split()[:3]
    search_term  = " ".join(search_words)
    if len(search_term) >= 4:
        record = (
            Ingredient.query
            .filter(Ingredient.name_english.ilike(f"%{search_term}%"))
            .first()
        )
        if record:
            entry = record.to_dict()
            entry.update({"match_status": "fulltext", "raw_name": raw_name})
            return [entry]

    # Step 4: Classify unknown
    _log_unknown(raw_name, product_barcode)

    if any(k in cleaned for k in SAFE_BASE_KEYWORDS):
        return [{
            "ins_no": "SAFE_BASE", "name_english": raw_name,
            "harm_level": 1, "color_code": "GREEN", "expert_concern": "NO",
            "harm_reason": "Natural base food ingredient",
            "match_status": "safe_base", "raw_name": raw_name,
        }]

    if any(k in cleaned for k in ADDITIVE_KEYWORDS):
        return [{
            "ins_no": "UNKNOWN_ADDITIVE", "name_english": raw_name,
            "harm_level": 2, "color_code": "YELLOW", "expert_concern": "NO",
            "harm_reason": "Unrecognised additive — flagged for review",
            "match_status": "unknown_additive", "raw_name": raw_name,
        }]

    return [{
        "ins_no": "UNKNOWN", "name_english": raw_name,
        "harm_level": 1, "color_code": "GREEN", "expert_concern": "NO",
        "harm_reason": "Unknown ingredient — neutral pending review",
        "match_status": "unknown", "raw_name": raw_name,
    }]


def match_all(ingredient_names: list[str], product_barcode: str = None) -> list[dict]:
    """Match a list of ingredient names. Returns deduplicated flat list."""
    results  = []
    seen_ins = set()
    for name in ingredient_names:
        if not name.strip():
            continue
        matches = match_ingredient(name.strip(), product_barcode)
        for m in matches:
            ins = m.get("ins_no", "")
            key = f"{ins}_{m.get('name_english', '')}"
            if key not in seen_ins:
                seen_ins.add(key)
                results.append(m)
    return results


def _log_unknown(name: str, barcode: str = None):
    try:
        name_clean = name.strip()[:255]
        existing   = UnknownIngredient.query.filter_by(name_as_found=name_clean).first()
        if existing:
            existing.scan_count += 1
        else:
            db.session.add(UnknownIngredient(
                name_as_found=name_clean, product_barcode=barcode, scan_count=1,
            ))
        db.session.commit()
    except Exception:
        db.session.rollback()