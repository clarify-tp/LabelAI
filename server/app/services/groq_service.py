"""
app/services/groq_service.py  (FIXED VERSION)
==============================================
Fixes applied:

  Bug 2 (tool_use_failed):
    - nova_group is now guaranteed int before Groq call (caller already fixes this
      in scan.py, but we also guard here)
    - matched_ingredients are pre-stripped by caller (_strip_for_groq)

  Bug 3a (hallucination with no product):
    - CHATBOT_SYSTEM_TEMPLATE now explicitly states "NO PRODUCT CONTEXT"
      and instructs the model NOT to invent any product data.
    - If product is None, the system message contains a hard instruction:
      "There is NO product being discussed. Do NOT make up any product,
       score, ingredient, or health claim. Only say: scan karo pehle."

  Bug 3b (profile response quality):
    - Profile context now explicitly tells the model to answer ONLY what
      was asked — e.g. if asked "mera weight kitna hai" → answer weight only,
      not BMI or age unless asked.
    - Removed the over-eager "I know your profile" style response pattern.
    - Added instruction: respond respectfully, use "aap" not "tera/tere".
"""

import os
import io
import json
import base64
from groq import Groq

# ── Optional HEIC/HEIF support (iPhone photos) — degrades gracefully ──────────
try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
    _HEIF_OK = True
except Exception:  # pragma: no cover - optional dependency
    _HEIF_OK = False

# ── Pillow for image preprocessing — optional, degrades gracefully ───────────
try:
    from PIL import Image, ImageEnhance
    _PIL_OK = True
except Exception:  # pragma: no cover - optional dependency
    _PIL_OK = False

from app.tools.score_engine import (
    calculate_food_score,
    CALCULATE_FOOD_SCORE_SCHEMA,
)
from app.tools.compare_tool import (
    compare_products,
    COMPARE_PRODUCTS_SCHEMA,
)
from app.tools.bmi_tool import (
    calculate_bmi,
    CALCULATE_BMI_SCHEMA,
)

_client: Groq | None = None


def get_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    return _client


VISION_MODEL  = "meta-llama/llama-4-scout-17b-16e-instruct"
VERDICT_MODEL = "llama-3.3-70b-versatile"
FAST_MODEL    = "llama-3.1-8b-instant"


# ─────────────────────────────────────────────────────────────────────────────
# 1. VISION EXTRACTION
# ─────────────────────────────────────────────────────────────────────────────

VISION_SYSTEM = (
    "You are an expert at reading Indian food product labels. "
    "Extract ALL visible information. Return ONLY valid JSON — no markdown, no explanation."
)

VISION_USER_TEMPLATE = """Extract from this food label image. Category hint: {category}
Return ONLY this JSON (no markdown, no extra text):
{{
  "product_name": "",
  "brand": "",
  "barcode": null,
  "food_id": null,
  "detected_category": "",
  "serving_size_g": null,
  "ingredients_raw": "",
  "ingredients_parsed": [
    {{"name": "", "ins_number": null, "is_sub_ingredient": false, "parent_ingredient": null}}
  ],
  "nutrition_per_100g": {{
    "energy_kcal": null, "protein_g": null, "fat_g": null,
    "saturated_fat_g": null, "trans_fat_g": null,
    "sugar_g": null, "sodium_g": null, "fiber_g": null
  }},
  "nutrition_per_serving": {{
    "energy_kcal": null, "protein_g": null, "fat_g": null,
    "saturated_fat_g": null, "trans_fat_g": null,
    "sugar_g": null, "sodium_mg": null, "fiber_g": null
  }},
  "claims_on_pack": [],
  "allergens": [],
  "fssai_number": null,
  "ocr_confidence": "HIGH",
  "missing_fields": []
}}
RULES:
- List every ingredient separately including sub-ingredients inside brackets
- "Added Colours (INS 102, INS 110)" → two entries, each with parent_ingredient = "Added Colours"
- If only per-100g nutrition shown, fill nutrition_per_100g and leave per_serving all null
- Blurry label → set ocr_confidence to LOW"""


# More aggressive best-effort retry prompt — used when first pass reads nothing.
VISION_USER_RETRY_TEMPLATE = """This food label was hard to read on the first pass.
Look VERY carefully again. Category hint: {category}

Do your ABSOLUTE BEST to extract any legible text, even partial words.
Zoom mentally into the ingredients panel and the nutrition table.
It is better to return a partial ingredient list than an empty one.

Return ONLY this JSON (no markdown, no extra text):
{{
  "product_name": "",
  "brand": "",
  "barcode": null,
  "food_id": null,
  "detected_category": "",
  "serving_size_g": null,
  "ingredients_raw": "",
  "ingredients_parsed": [
    {{"name": "", "ins_number": null, "is_sub_ingredient": false, "parent_ingredient": null}}
  ],
  "nutrition_per_100g": {{
    "energy_kcal": null, "protein_g": null, "fat_g": null,
    "saturated_fat_g": null, "trans_fat_g": null,
    "sugar_g": null, "sodium_g": null, "fiber_g": null
  }},
  "nutrition_per_serving": {{
    "energy_kcal": null, "protein_g": null, "fat_g": null,
    "saturated_fat_g": null, "trans_fat_g": null,
    "sugar_g": null, "sodium_mg": null, "fiber_g": null
  }},
  "claims_on_pack": [],
  "allergens": [],
  "fssai_number": null,
  "ocr_confidence": "LOW",
  "missing_fields": []
}}
RULES:
- Extract every readable ingredient, even if you are only partly sure
- If a word is partially legible, include your best reading
- Set ocr_confidence to LOW if the image is genuinely unreadable"""


def _preprocess_image(base64_image: str) -> tuple[str, str]:
    """
    Decode → enhance → re-encode a label photo for better OCR.

    Steps: convert to RGB, upscale if the shortest side < 1000px, cap the
    longest side at 4000px, sharpen, boost contrast, re-encode as JPEG q=90.

    Returns (processed_base64, mime_type). If Pillow is unavailable or the
    image cannot be decoded, the original base64 is returned unchanged so the
    caller still gets a usable payload (degrades gracefully).
    """
    if not _PIL_OK:
        return base64_image, "image/jpeg"
    try:
        raw = base64.b64decode(base64_image)
        img = Image.open(io.BytesIO(raw))
        if img.mode != "RGB":
            img = img.convert("RGB")

        w, h = img.size
        short_side = min(w, h)
        long_side  = max(w, h)

        # Upscale small images so fine print becomes legible
        if short_side and short_side < 1000:
            scale = 1000 / short_side
            img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
            w, h = img.size
            long_side = max(w, h)

        # Cap very large images to keep the request light
        if long_side > 4000:
            scale = 4000 / long_side
            img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

        img = ImageEnhance.Sharpness(img).enhance(2.0)
        img = ImageEnhance.Contrast(img).enhance(1.3)

        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=90)
        return base64.b64encode(buf.getvalue()).decode(), "image/jpeg"
    except Exception:
        # Any decode/enhance failure → fall back to the original payload
        return base64_image, "image/jpeg"


def _call_vision(base64_image: str, mime_type: str, user_text: str) -> dict:
    client = get_client()
    response = client.chat.completions.create(
        model=VISION_MODEL,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": VISION_SYSTEM},
            {
                "role": "user",
                "content": [
                    {"type": "image_url",
                     "image_url": {"url": f"data:{mime_type};base64,{base64_image}"}},
                    {"type": "text", "text": user_text},
                ],
            },
        ],
        max_tokens=2000,
        temperature=0.1,
    )
    raw = response.choices[0].message.content or ""
    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        raise ValueError(f"Groq vision returned non-JSON: {raw[:200]}") from e


def extract_from_image(
    base64_image: str,
    category: str = "general",
    mime_type: str = "image/jpeg",
) -> dict:
    """
    Send base64 label photo to Groq Vision.

    Pipeline:
      1. Preprocess the image (decode, upscale, sharpen, re-encode JPEG).
      2. First pass with the standard extraction prompt.
      3. If confidence is LOW *and* no ingredients were read, retry once with
         a more aggressive best-effort prompt.

    Returns structured dict. Raises ValueError if Groq returns non-JSON.
    """
    processed_b64, processed_mime = _preprocess_image(base64_image)

    extracted = _call_vision(
        processed_b64, processed_mime,
        VISION_USER_TEMPLATE.format(category=category),
    )

    confidence = (extracted.get("ocr_confidence") or "").upper()
    ingredients_raw = (extracted.get("ingredients_raw") or "").strip()
    if confidence == "LOW" and not ingredients_raw:
        try:
            retry = _call_vision(
                processed_b64, processed_mime,
                VISION_USER_RETRY_TEMPLATE.format(category=category),
            )
            # Prefer the retry only if it actually read something
            if (retry.get("ingredients_raw") or "").strip():
                retry["ocr_confidence"] = retry.get("ocr_confidence") or "LOW"
                return retry
        except Exception:
            pass  # keep the first-pass result

    return extracted


# ─────────────────────────────────────────────────────────────────────────────
# 2. VERDICT GENERATION (tool calling)
# ─────────────────────────────────────────────────────────────────────────────

LABELSCAN_SYSTEM = """You are "LabelScan AI" — a clear, science-backed food-label expert for India. Hinglish is welcome.

VOICE RULES:
- Direct and honest. Zero sugarcoating. Bad product? Say it is bad.
- Natural Hinglish. Use: "bhai", "yaar", "dekho", "seedha baat", "matlab", "toh"
- Always use CONVERTED units: teaspoons for sugar, pinches for salt, tablespoons for oil
- Relatable Indian comparisons: "chai mein ek teaspoon — yahan 5 daala hai!"
- Call out deceptive marketing: "Company ne naam rakha 'health drink' — data toh sugar bomb dikhata hai"
- Lead with the WORST finding (worst_ingredient from tool result)
- Bad products end: "LabelScan AI: AVOID karo ❌ [one clean alternative]"
- Good products end: "LabelScan AI: Safe choice ✓"
- 4-5 sentences MAXIMUM. Never a paragraph.
- Base every claim on the FSSAI additives data and ICMR nutrition thresholds provided
- NEVER add health claims beyond what the tool result provides

TOOL USAGE:
- You MUST call calculate_food_score before writing any verdict.
- Do NOT compute or guess the score yourself.

EXAMPLES:
Bad: "Bhai, 5.2 teaspoon sugar ek cup mein — yeh health drink nahi, sugar drink hai. Caramel colour bhi hai, jisme 4-MeI hota hai. Score: 22/100. LabelScan AI: AVOID karo ❌ Plain milk mein kela milaao."
Good: "Dekho — short ingredient list, koi artificial nahi, protein solid 22g. Score: 78/100. LabelScan AI: Safe choice ✓"
"""


# ─────────────────────────────────────────────────────────────────────────────
# HELPER: Strip ingredients for Groq
# ─────────────────────────────────────────────────────────────────────────────

def _strip_for_groq(ingredients: list[dict]) -> list[dict]:
    """
    Reduce ingredient dicts to minimal fields for Groq tool calls.
    Groq has trouble serializing large ingredient objects.
    """
    return [
        {
            "name_english": ing.get("name_english", ""),
            "harm_level": ing.get("harm_level", 1),
            "ins_no": ing.get("ins_no", ""),
        }
        for ing in ingredients
    ]


def generate_verdict(
    product_name: str,
    brand: str,
    category: str,
    matched_ingredients: list[dict],
    nutrition_per_serving: dict,
    nova_group: int,
    reasons_to_eat: list[str],
    reasons_to_avoid: list[str],
    side_effects: list[dict],
) -> dict:
    """
    Generate the LabelScan AI verdict using tool calling.
    matched_ingredients will be stripped to minimal fields automatically.
    """
    client = get_client()

    # Guard: ensure nova_group is a valid int
    if nova_group not in (1, 2, 3, 4):
        nova_group = 4

    # Strip ingredients for Groq serialization
    stripped_ingredients = _strip_for_groq(matched_ingredients)

    context = (
        f"Product: {product_name} by {brand}\n"
        f"Category: {category}\n"
        f"NOVA Group: {nova_group}\n"
        f"Ingredients: {json.dumps(stripped_ingredients, ensure_ascii=False)}\n"
        f"Nutrition per serving: {json.dumps(nutrition_per_serving)}\n"
        f"Reasons to eat: {reasons_to_eat}\n"
        f"Reasons to avoid: {reasons_to_avoid}\n"
        f"Side effects: {[s.get('effect','') for s in side_effects]}\n\n"
        "Call calculate_food_score with the above data, then write the verdict."
    )

    messages = [
        {"role": "system", "content": LABELSCAN_SYSTEM},
        {"role": "user",   "content": context},
    ]

    # Turn 1: force tool call
    response1 = client.chat.completions.create(
        model=VERDICT_MODEL,
        messages=messages,
        tools=[CALCULATE_FOOD_SCORE_SCHEMA],
        tool_choice="required",
        max_tokens=600,
        temperature=0.3,
    )
    msg1 = response1.choices[0].message

    # Execute tool
    if msg1.tool_calls:
        tc   = msg1.tool_calls[0]
        args = json.loads(tc.function.arguments)
        # Ensure nova_group is int in args too
        args["nova_group"] = int(args.get("nova_group") or nova_group)
        score_result = calculate_food_score(**args)
    else:
        # Fallback if model didn't call tool (shouldn't happen with tool_choice=required)
        score_result = calculate_food_score(
            matched_ingredients, nutrition_per_serving, nova_group, category
        )

    # Turn 2: get verdict text
    messages.append({
        "role": "assistant",
        "content": None,
        "tool_calls": msg1.tool_calls or [],
    })
    if msg1.tool_calls:
        messages.append({
            "role":         "tool",
            "tool_call_id": msg1.tool_calls[0].id,
            "content":      json.dumps(score_result, ensure_ascii=False),
        })
    messages.append({
        "role": "user",
        "content": (
            f"Score: {score_result['score']}/100. "
            f"Worst: {score_result.get('worst_ingredient',{}).get('label','None')}. "
            f"Sugar: {score_result.get('sugar_teaspoons',0)} tsp. "
            "Write the 4-5 sentence LabelScan AI Hinglish verdict now."
        ),
    })

    response2 = client.chat.completions.create(
        model=VERDICT_MODEL,
        messages=messages,
        max_tokens=350,
        temperature=0.65,
    )
    return {
        "score_result": score_result,
        "verdict_text": response2.choices[0].message.content or "",
    }


# ─────────────────────────────────────────────────────────────────────────────
# 3. CONTEXT DETECTION
# ─────────────────────────────────────────────────────────────────────────────

def detect_context(last_message: str, previous_message: str = "") -> dict:
    """Fast context detection — who is the conversation about?"""
    client = get_client()
    prompt = f"""Read these messages and return JSON only:
{{
  "subject": "self | child | elderly_parent | other_adult | unclear",
  "subject_age_hint": null_or_number,
  "subject_condition_hints": [],
  "confidence": "HIGH | MEDIUM | LOW",
  "reason": "one short sentence"
}}

Keywords:
- self: main, mujhe, mera, mere liye, I, my, me, myself, meri
- child: bachcha, beta, beti, kid, son, daughter, X saal ka/ki, X year old (X<18)
- elderly_parent: maa, papa, dadi, nani, dada, nana, elderly, budhapa, senior, parents
- other_adult: friend, dost, partner, wife, husband, bhai (someone else)

Last message: "{last_message}"
Previous: "{previous_message}" """

    response = client.chat.completions.create(
        model=FAST_MODEL,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": "Classify who the conversation is about. Return ONLY valid JSON."},
            {"role": "user",   "content": prompt},
        ],
        max_tokens=150,
        temperature=0.0,
    )
    raw = response.choices[0].message.content or "{}"
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"subject": "unclear", "confidence": "LOW", "reason": "parse error"}


# ─────────────────────────────────────────────────────────────────────────────
# 4. CHATBOT
# ─────────────────────────────────────────────────────────────────────────────

CHILD_RDA  = {
    "4-6":  {"sugar_g": 12, "sodium_mg": 900,  "calories": 1350},
    "7-9":  {"sugar_g": 15, "sodium_mg": 1200, "calories": 1690},
    "10-12":{"sugar_g": 20, "sodium_mg": 1500, "calories": 2000},
    "13-17":{"sugar_g": 22, "sodium_mg": 1800, "calories": 2100},
}
SENIOR_RDA = {"sugar_g": 20, "sodium_mg": 1500, "calories": 1800}


def _build_person_context(context_result: dict, user_profile: dict | None) -> str:
    subject    = context_result.get("subject", "unclear")
    confidence = context_result.get("confidence", "LOW")
    age_hint   = context_result.get("subject_age_hint")
    conditions = context_result.get("subject_condition_hints", [])

    if confidence == "LOW":
        return "Use general adult ICMR thresholds. Subject unclear — do NOT assume any profile data."

    if subject == "self" and user_profile:
        weight = user_profile.get("weight_kg")
        height = user_profile.get("height_cm")
        bmi    = user_profile.get("bmi")
        bmi_cat = user_profile.get("bmi_category_indian")
        conds  = user_profile.get("conditions") or []
        allerg = user_profile.get("allergies") or []
        return (
            f"User profile (answer ONLY what was specifically asked — do not volunteer unasked info):\n"
            f"- Age: {user_profile.get('age')} years\n"
            f"- Weight: {weight} kg\n"
            f"- Height: {height} cm\n"
            f"- BMI: {bmi} ({bmi_cat} — Indian ICMR standard)\n"
            f"- Conditions: {', '.join(conds) if conds else 'None'}\n"
            f"- Allergies: {', '.join(allerg) if allerg else 'None'}\n"
            f"- Diet: {user_profile.get('diet_type', 'none')}\n\n"
            "IMPORTANT: If user asks 'mera weight kitna hai' → answer ONLY weight. "
            "If they ask 'mera BMI batao' → answer ONLY BMI. "
            "Do NOT proactively mention other profile fields unless asked."
        )

    if subject == "child":
        age = int(age_hint) if age_hint else 8
        ag  = "4-6" if age <= 6 else ("7-9" if age <= 9 else ("10-12" if age <= 12 else "13-17"))
        rda = CHILD_RDA.get(ag, CHILD_RDA["7-9"])
        return (
            f"Subject is a CHILD (age ~{age}). Use CHILDREN'S ICMR thresholds:\n"
            f"- Sugar limit: {rda['sugar_g']}g/day | Sodium: {rda['sodium_mg']}mg/day\n"
            f"- Conditions mentioned: {conditions or 'none'}\n"
            "DO NOT use or reference the adult user's own profile."
        )

    if subject == "elderly_parent":
        return (
            "Subject is ELDERLY. Use SENIOR ICMR thresholds:\n"
            f"- Sugar: {SENIOR_RDA['sugar_g']}g/day | Sodium: {SENIOR_RDA['sodium_mg']}mg/day\n"
            f"- Conditions mentioned: {conditions or 'none'}\n"
            "DO NOT reference the user's own profile."
        )

    return f"Use general adult ICMR thresholds. Conditions mentioned in chat: {conditions or 'none'}."


def _build_product_context(product: dict | None) -> str:
    if not product:
        return (
            "⚠️ NO PRODUCT HAS BEEN SCANNED YET.\n"
            "DO NOT invent, assume, or make up any product, score, ingredient, or health claim.\n"
            "If asked about a product, respond ONLY with:\n"
            "\"Pehle product scan karo, yaar — tab main accurate bata sakta hoon. "
            "Bina data ke kuch bhi bolna galat hoga.\""
        )

    harmful = [i for i in (product.get("matched_ingredients") or []) if i.get("harm_level", 1) >= 3]
    se      = product.get("side_effects") or []
    return (
        f"Product: {product.get('product_name')} by {product.get('brand')}\n"
        f"Score: {product.get('food_pharmer_score')}/100 ({product.get('score_band')})\n"
        f"Category: {product.get('category')} | NOVA: {product.get('nova_group')}\n"
        f"Harmful: {', '.join(i.get('name_english','') for i in harmful) or 'None'}\n"
        f"Sugar: {product.get('sugar_teaspoons')} tsp/serving\n"
        f"Worst ingredient: {product.get('worst_ingredient') or 'None'}\n"
        f"Avoid: {' | '.join(product.get('reasons_to_avoid') or [])}\n"
        f"Eat: {' | '.join(product.get('reasons_to_eat') or [])}\n"
        f"Side effects (confirmed): {' | '.join(s.get('effect','') for s in se) or 'None'}"
    )


# ── FIXED system prompt template ───────────────────────────────────────────────
CHATBOT_SYSTEM_TEMPLATE = """You are "LabelScan AI" — your personal food label expert.
Speak in a clear, helpful Hinglish voice: direct, science-backed, and friendly.

LANGUAGE AND TONE:
- Use respectful language. Always use "aap" when addressing the user (NOT "tera/tere/tu").
- Mix Hindi and English naturally: "bhai", "yaar", "dekho", "matlab", "toh"
- Use teaspoons for sugar, pinches for salt, tablespoons for oil
- Keep responses to 3-5 sentences maximum — punchy, never a paragraph

━━━ PRODUCT CONTEXT ━━━
{product_context}

━━━ PERSON CONTEXT ━━━
{person_context}

━━━ STRICT RULES ━━━
1. NEVER invent product data, scores, or ingredients not in the product context above
2. If NO PRODUCT context: respond ONLY with the scan-first message — do NOT make up any product
3. Answer ONLY what was specifically asked — do NOT volunteer unasked profile data
4. Medical questions → "Yeh medical advice nahi hai — apne doctor se confirm karo"
5. If asked about an unscanned product → "Uska scan karo pehle, yaar"
6. For children: use children's ICMR thresholds — their sugar/sodium limits are much lower than adults'
7. Never use the user's own profile when they are clearly talking about someone else
8. End response with: "AVOID karo" / "Dhyan se khao" / "Clean choice ✓" / or a neutral helpful close"""


def chat_response(
    message: str,
    history: list[dict],
    product: dict | None,
    context_result: dict,
    user_profile: dict | None,
    available_tools: list | None = None,
) -> str:
    """Generate chatbot response with stripped ingredients for tool calls."""
    client = get_client()

    product_ctx = _build_product_context(product)
    person_ctx  = _build_person_context(context_result, user_profile)

    system_msg = CHATBOT_SYSTEM_TEMPLATE.format(
        product_context = product_ctx,
        person_context  = person_ctx,
    )

    messages = [{"role": "system", "content": system_msg}]
    messages.extend(history[-10:])
    messages.append({"role": "user", "content": message})

    tools = available_tools or [CALCULATE_FOOD_SCORE_SCHEMA, COMPARE_PRODUCTS_SCHEMA, CALCULATE_BMI_SCHEMA]

    response = client.chat.completions.create(
        model=VERDICT_MODEL,
        messages=messages,
        tools=tools,
        tool_choice="auto",
        max_tokens=400,
        temperature=0.6,
    )
    msg = response.choices[0].message

    if msg.tool_calls:
        tool_results = []
        for tc in msg.tool_calls:
            try:
                args = json.loads(tc.function.arguments)
                if tc.function.name == "calculate_food_score":
                    # Guard nova_group
                    args["nova_group"] = int(args.get("nova_group") or 4)
                    # Strip ingredients if present
                    if "matched_ingredients" in args and isinstance(args["matched_ingredients"], list):
                        args["matched_ingredients"] = _strip_for_groq(args["matched_ingredients"])
                    result = calculate_food_score(**args)
                elif tc.function.name == "compare_products":
                    result = compare_products(**args)
                elif tc.function.name == "calculate_bmi":
                    result = calculate_bmi(**args)
                else:
                    result = {"error": "unknown tool"}
            except Exception as e:
                result = {"error": str(e)}

            tool_results.append({
                "role":         "tool",
                "tool_call_id": tc.id,
                "content":      json.dumps(result, ensure_ascii=False),
            })

        messages.append({"role": "assistant", "content": None, "tool_calls": msg.tool_calls})
        messages.extend(tool_results)

        response2 = client.chat.completions.create(
            model=VERDICT_MODEL,
            messages=messages,
            max_tokens=400,
            temperature=0.6,
        )
        return response2.choices[0].message.content or ""

    return msg.content or ""


# ─────────────────────────────────────────────────────────────────────────────
# 5. COMPARISON VERDICT
# ─────────────────────────────────────────────────────────────────────────────

def generate_comparison_verdict(products: list[dict]) -> dict:
    """Comparison verdict using compare_products tool."""
    client = get_client()

    context = (
        f"Compare these {len(products)} products as LabelScan AI.\n"
        f"Products: {json.dumps(products, ensure_ascii=False)}\n"
        "Call compare_products, then write the verdict."
    )
    messages = [
        {"role": "system", "content": LABELSCAN_SYSTEM},
        {"role": "user",   "content": context},
    ]
    response1 = client.chat.completions.create(
        model=VERDICT_MODEL,
        messages=messages,
        tools=[COMPARE_PRODUCTS_SCHEMA],
        tool_choice="required",
        max_tokens=500,
        temperature=0.3,
    )
    msg1 = response1.choices[0].message

    if msg1.tool_calls:
        args = json.loads(msg1.tool_calls[0].function.arguments)
        comparison_result = compare_products(**args)
    else:
        comparison_result = compare_products(products=products)

    messages.append({"role": "assistant", "content": None, "tool_calls": msg1.tool_calls or []})
    if msg1.tool_calls:
        messages.append({
            "role":         "tool",
            "tool_call_id": msg1.tool_calls[0].id,
            "content":      json.dumps(comparison_result, ensure_ascii=False),
        })
    messages.append({
        "role": "user",
        "content": (
            f"Winner: {comparison_result.get('winner_name')}. "
            "Write 4-5 sentences in clear Hinglish. ONE clear winner. "
            "End: 'LabelScan AI winner: [PRODUCT NAME]'"
        ),
    })
    response2 = client.chat.completions.create(
        model=VERDICT_MODEL,
        messages=messages,
        max_tokens=350,
        temperature=0.65,
    )
    return {
        "comparison_result": comparison_result,
        "verdict_text":      response2.choices[0].message.content or "",
    }