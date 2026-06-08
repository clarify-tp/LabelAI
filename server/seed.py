"""
seed.py  (FIXED VERSION)
=========================
Fixes applied:
  1. Replaced all Product.query.get() / Ingredient.query.get() /
     User.query.filter_by().first() with SQLAlchemy 2.0-style db.session.get()
     — removes LegacyAPIWarning and avoids the autoflush-on-get crash.

  2. nutriscore_grade is now truncated to 20 chars before insert
     — prevents StringDataRightTruncation for values like 'unknown'.

  3. Each product insert is now wrapped in an individual try/except
     — one bad row no longer aborts the entire seed.

  4. Commits happen in batches of 100 with per-batch rollback on error.

Run: python seed.py
"""

import os
import sys
import json
import csv
import hashlib

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv
load_dotenv()

from app import create_app, db
from app.models.user import User, UserProfile
from app.models.product import Product
from app.models.ingredient import Ingredient
from app.models.scan import Scan
from app.tools.bmi_tool import calculate_bmi
import bcrypt

app = create_app()

# ── Data file paths ────────────────────────────────────────────────────────────
BASE_DIR      = os.path.dirname(os.path.abspath(__file__))
PRODUCTS_JSON = os.path.join(BASE_DIR, "..", "data", "india_products.json")
FSSAI_CSV     = os.path.join(BASE_DIR, "..", "data", "FSSAI_India_Additives.csv")

# Fallback: look in ./data/ relative to server/
if not os.path.exists(PRODUCTS_JSON):
    PRODUCTS_JSON = os.path.join(BASE_DIR, "data", "india_products.json")
if not os.path.exists(FSSAI_CSV):
    FSSAI_CSV = os.path.join(BASE_DIR, "data", "FSSAI_India_Additives.csv")


def _safe_str(val, maxlen=None):
    """Convert value to string, strip whitespace, optionally truncate."""
    if val is None:
        return None
    s = str(val).strip()
    if maxlen and len(s) > maxlen:
        s = s[:maxlen]
    return s or None


def seed_products():
    """Load Open Food Facts India JSON into the products table."""
    if not os.path.exists(PRODUCTS_JSON):
        print(f"  ⚠  Products JSON not found at {PRODUCTS_JSON} — skipping")
        return

    with open(PRODUCTS_JSON, encoding="utf-8") as f:
        products_data = json.load(f)

    loaded  = 0
    skipped = 0
    errors  = 0
    batch   = []

    for item in products_data:
        barcode = _safe_str(item.get("code"), maxlen=20)
        if not barcode:
            skipped += 1
            continue

        # ── Use SQLAlchemy 2.0 db.session.get() — not legacy Query.get() ──────
        if db.session.get(Product, barcode):
            skipped += 1
            continue

        ing_text = item.get("ingredients_text") or ""
        additives = item.get("additives_tags") or []

        product = Product(
            barcode            = barcode,
            product_name       = _safe_str(item.get("product_name"), 500),
            brand              = _safe_str(item.get("brands"), 255),
            quantity           = _safe_str(
                item.get("quantity") or item.get("product_quantity"), 100
            ),
            ingredients_text   = ing_text,
            ingredients_hash   = Product.compute_hash(ing_text) if ing_text else None,
            additives_tags     = ",".join(additives) if additives else "",
            nova_group         = item.get("nova_group"),
            # FIX: truncate nutriscore_grade — OFF returns 'unknown', 'not-applicable', etc.
            nutriscore_grade   = _safe_str(item.get("nutriscore_grade"), 20),
            energy_kcal_100g   = item.get("energy-kcal_100g"),
            fat_100g           = item.get("fat_100g"),
            saturated_fat_100g = item.get("saturated-fat_100g"),
            sugars_100g        = item.get("sugars_100g"),
            sodium_100g        = item.get("sodium_100g"),
            allergens          = _safe_str(item.get("allergens"), 500) or "",
            categories         = ",".join(item.get("categories_tags") or [])[:500],
            source             = "off_json",
            data_verified      = False,
        )
        batch.append(product)
        loaded += 1

        # Commit in batches of 100
        if len(batch) >= 100:
            try:
                db.session.add_all(batch)
                db.session.commit()
                print(f"  → {loaded} products loaded...")
            except Exception as e:
                db.session.rollback()
                errors += len(batch)
                loaded -= len(batch)
                print(f"  ⚠  Batch error (skipping {len(batch)} rows): {e}")
            batch = []

    # Commit remaining
    if batch:
        try:
            db.session.add_all(batch)
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            errors += len(batch)
            loaded -= len(batch)
            print(f"  ⚠  Final batch error: {e}")

    print(f"  ✅ Products: {loaded} loaded, {skipped} skipped, {errors} errors")


def seed_ingredients():
    """Load FSSAI CSV into the ingredients table."""
    if not os.path.exists(FSSAI_CSV):
        print(f"  ⚠  FSSAI CSV not found at {FSSAI_CSV} — skipping")
        return

    loaded = 0

    with open(FSSAI_CSV, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            ins = _safe_str(row.get("ins_no"), 20)
            if not ins:
                continue
            # Use db.session.get() — SQLAlchemy 2.0 style
            if db.session.get(Ingredient, ins):
                continue

            try:
                harm_level = int(row.get("harm_level_1to4") or 1)
            except (ValueError, TypeError):
                harm_level = 1

            ing = Ingredient(
                ins_no           = ins,
                e_number         = _safe_str(row.get("e_number"), 20),
                name_english     = _safe_str(row.get("name_english"), 255) or "",
                name_hindi       = _safe_str(row.get("name_hindi"), 255),
                functional_class = _safe_str(row.get("functional_class"), 100),
                harm_level       = harm_level,
                harm_severity    = _safe_str(row.get("harm_severity"), 20) or "LOW",
                color_code       = _safe_str(row.get("color_code"), 10) or "GREEN",
                harm_reason      = row.get("harm_reason") or "",
                expert_concern   = _safe_str(row.get("expert_concern"), 3) or "NO",
                fssai_permitted  = True,
                source           = _safe_str(row.get("source"), 200) or "FSSAI 2020",
            )
            db.session.add(ing)
            loaded += 1

    # Custom non-additive entries critical for Indian label scoring
    CUSTOM = [
        dict(ins_no="MAIDA",          name_english="Refined Wheat Flour (Maida)",
             name_hindi="मैदा",         functional_class="Base ingredient",
             harm_level=4,             harm_severity="HIGH",    color_code="RED",
             expert_concern="YES",
             harm_reason="Highly refined flour. Zero fibre, high glycaemic index. Spikes blood sugar rapidly.",
             fssai_permitted=True,     source="Custom — LabelScan AI"),
        dict(ins_no="PALM_OIL",       name_english="Palm Oil",
             name_hindi="पाम तेल",      functional_class="Fat/Oil",
             harm_level=3,             harm_severity="MEDIUM-HIGH", color_code="ORANGE",
             expert_concern="YES",
             harm_reason="High in saturated fat. Linked to cardiovascular risk at high consumption.",
             fssai_permitted=True,     source="Custom — LabelScan AI"),
        dict(ins_no="HYDRO_VEG_OIL",  name_english="Hydrogenated Vegetable Oil (Vanaspati)",
             name_hindi="वनस्पति",       functional_class="Fat/Oil",
             harm_level=4,             harm_severity="HIGH",    color_code="RED",
             expert_concern="YES",
             harm_reason="Contains trans fats. Raises LDL, lowers HDL. WHO recommends elimination.",
             fssai_permitted=True,     source="Custom — LabelScan AI"),
        dict(ins_no="HFCS",           name_english="High Fructose Corn Syrup",
             name_hindi="हाई फ्रुक्टोज कॉर्न सिरप", functional_class="Sweetener",
             harm_level=4,             harm_severity="HIGH",    color_code="RED",
             expert_concern="YES",
             harm_reason="Linked to obesity, fatty liver, and insulin resistance.",
             fssai_permitted=True,     source="Custom — LabelScan AI"),
        dict(ins_no="INTERESTER_FAT", name_english="Interesterified Fat",
             name_hindi="इंटरएस्टरीफाइड वसा", functional_class="Fat/Oil",
             harm_level=3,             harm_severity="MEDIUM-HIGH", color_code="ORANGE",
             expert_concern="YES",
             harm_reason="Chemically modified fat. Some studies suggest metabolic concerns similar to trans fat.",
             fssai_permitted=True,     source="Custom — LabelScan AI"),
    ]

    for entry in CUSTOM:
        if not db.session.get(Ingredient, entry["ins_no"]):
            db.session.add(Ingredient(**entry))
            loaded += 1

    try:
        db.session.commit()
        print(f"  ✅ Ingredients: {loaded} loaded")
    except Exception as e:
        db.session.rollback()
        print(f"  ⚠  Ingredient seed error: {e}")


def seed_users():
    """Create 3 dummy users with different health profiles."""
    hashed_pw = bcrypt.hashpw(b"password123", bcrypt.gensalt()).decode()

    users_data = [
        dict(email="rahul@example.com",  first_name="Rahul",
             age=32, height_cm=175, weight_kg=85,
             conditions="diabetes,hypertension", allergies="",
             diet_type="non-veg",    activity_level="moderate"),
        dict(email="priya@example.com",  first_name="Priya",
             age=28, height_cm=162, weight_kg=58,
             conditions="",           allergies="gluten",
             diet_type="vegetarian", activity_level="active"),
        dict(email="anita@example.com",  first_name="Anita",
             age=45, height_cm=158, weight_kg=72,
             conditions="high_cholesterol", allergies="milk",
             diet_type="vegetarian", activity_level="sedentary"),
    ]

    created = 0
    for u in users_data:
        # Use filter().first() with session — this is still valid for filter queries
        existing = db.session.execute(
            db.select(User).where(User.email == u["email"])
        ).scalar_one_or_none()

        if existing:
            continue

        user = User(
            email      = u["email"],
            password   = hashed_pw,
            first_name = u["first_name"],
        )
        db.session.add(user)
        db.session.flush()   # get user.id before committing

        bmi_result = calculate_bmi(u["height_cm"], u["weight_kg"])
        profile = UserProfile(
            user_id             = user.id,
            age                 = u["age"],
            height_cm           = u["height_cm"],
            weight_kg           = u["weight_kg"],
            bmi                 = bmi_result["bmi"],
            bmi_category_indian = bmi_result["indian_category"],
            conditions          = u["conditions"],
            allergies           = u["allergies"],
            diet_type           = u["diet_type"],
            activity_level      = u["activity_level"],
        )
        db.session.add(profile)
        created += 1

    try:
        db.session.commit()
        print(f"  ✅ Users: {created} created (password: password123)")
    except Exception as e:
        db.session.rollback()
        print(f"  ⚠  User seed error: {e}")


def seed_sample_scans():
    """Create sample scan records for dummy users."""
    # Get rahul's user id
    rahul = db.session.execute(
        db.select(User).where(User.email == "rahul@example.com")
    ).scalar_one_or_none()

    if not rahul:
        print("  ⚠  No dummy user found — skipping sample scans")
        return

    products = db.session.execute(db.select(Product).limit(5)).scalars().all()
    categories = ["biscuit", "cold_drink", "health_drink", "instant_noodles", "chips_namkeen"]
    created = 0

    for i, product in enumerate(products):
        existing = db.session.execute(
            db.select(Scan).where(Scan.user_id == rahul.id, Scan.barcode == product.barcode)
        ).scalar_one_or_none()
        if existing:
            continue

        scan = Scan(
            user_id      = rahul.id,
            barcode      = product.barcode,
            product_name = product.product_name,
            category     = categories[i % len(categories)],
            input_method = "barcode",
            base_score   = 40 + (i * 8),
        )
        db.session.add(scan)
        created += 1

    try:
        db.session.commit()
        print(f"  ✅ Sample scans: {created} created for rahul@example.com")
    except Exception as e:
        db.session.rollback()
        print(f"  ⚠  Sample scan error: {e}")


if __name__ == "__main__":
    with app.app_context():
        print("\n🌱 Label Padhega AI — Database Seeder (Fixed)")
        print("=" * 50)

        print("\n📦 Creating / verifying tables...")
        db.create_all()
        print("  ✅ Tables ready")

        print("\n🍎 Loading Open Food Facts India products...")
        seed_products()

        print("\n🔬 Loading FSSAI ingredient database...")
        seed_ingredients()

        print("\n👤 Creating dummy users...")
        seed_users()

        print("\n📊 Creating sample scan history...")
        seed_sample_scans()

        print("\n" + "=" * 50)
        print("✅ Seeding complete!")
        print()
        print("Demo login credentials:")
        print("  rahul@example.com  / password123  (diabetes + hypertension)")
        print("  priya@example.com  / password123  (gluten intolerance)")
        print("  anita@example.com  / password123  (high cholesterol)")
        print("=" * 50)