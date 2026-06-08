# Claude Code Prompt — Label Padhega: Full Enhancement Plan

---

## Project Overview

I have a full-stack food label scanner web app. Users photograph the back of any food packet,
the app extracts ingredients + nutrition via AI vision (Groq), scores the product, and explains
what's in it and whether it's healthy. Goal: make this the best free food label scanner for India.

**Tech Stack:**
- **Frontend:** React 18 + Vite + Tailwind CSS v4 + Redux Toolkit + GSAP + react-dropzone
- **Backend:** Python Flask + PostgreSQL + SQLAlchemy
- **AI:** Groq Vision (llama-4-scout) for OCR + Groq LLM (llama-3.3-70b) for verdict
- **Auth:** Supabase JWT
- **Data:** FSSAI India Additives CSV (475 additives) + OpenFoodFacts API

**Project structure:**
```
labelpadhega-main/
├── client/src/
│   ├── pages/         Home.jsx, Result.jsx, Chat.jsx, Compare.jsx, History.jsx, Profile.jsx
│   ├── components/    scan/, ui/, layout/
│   ├── store/slices/  scanSlice.js, authSlice.js, chatSlice.js, compareSlice.js
│   └── utils/         formatters.js
└── server/app/
    ├── routes/        scan.py, auth.py, chat.py, compare.py, profile.py
    ├── services/      groq_service.py, matcher.py
    ├── tools/         score_engine.py, compare_tool.py, bmi_tool.py, category_config.py
    └── models/        product.py, scan.py, user.py, chat.py, cache.py
```

---

## RULE: Free Services Only

Every external service added MUST have a genuinely free tier that works for a small/medium app.
No credit card required for basic usage. Preferred: open-source, self-hostable, or API with
generous free quota.

---

## TASK 1 — Remove All Revant / Food Pharmer References

The app was built around Revant Himatsingka ("Food Pharmer"). This is now MY independent product.
Remove every reference.

**Grep first, then fix:**
```bash
grep -rn "Food Pharmer\|Revant\|revant\|food_pharmer\|FoodPharmer" . \
  --include="*.py" --include="*.jsx" --include="*.js" --include="*.html" --include="*.md"
```

**Changes:**

`server/app/services/groq_service.py`
- Remove `REVANT_SYSTEM` prompt entirely
- New neutral system persona: **"LabelScan AI"** — clear, science-backed, Indian context, Hinglish OK
- Replace all verdict endings: `"Food Pharmer says: AVOID karo."` → `"LabelScan AI: AVOID karo ❌"`
- Replace: `"Food Pharmer says: Yeh theek hai!"` → `"LabelScan AI: Safe choice ✓"`
- `CHATBOT_SYSTEM_TEMPLATE`: replace "Revant Himatsingka's AI assistant" with "LabelScan AI — your personal food label expert"

`server/app/routes/scan.py`
- Same verdict fallback text replacements

`client/src/pages/Home.jsx`
- Remove the `{ icon: Mic, title: "Revant's Voice", ... }` feature card
- Replace with: `{ icon: Brain, title: "AI-Powered Analysis", desc: "Science-backed scoring using FSSAI additives database and ICMR nutrition thresholds", ... }`
- Remove "Food Pharmer's mission" from hero subtitle

`client/src/components/scan/VerdictCard.jsx`
- Replace "Food Pharmer says:" with "LabelScan AI:"

`client/src/components/layout/Navbar.jsx`, `Footer.jsx`
- Remove any Food Pharmer branding

`client/index.html`
- `<title>Label Padhega — AI Food Label Scanner for India</title>`

**Final verification:**
```bash
grep -rn "Food Pharmer\|Revant\|revant" . --include="*.py" --include="*.jsx" --include="*.js"
# Must return zero results
# Exception: DB column name `food_pharmer_score` in models — leave as-is (breaking change to rename)
```

---

## TASK 2 — Fix Image Type Acceptance + OCR Reliability

### 2A. Broaden accepted image formats

**`client/src/pages/Home.jsx`**

```js
// Expand dropzone accepted formats:
accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.heic', '.heif', '.bmp', '.tiff'] }

// Add state for MIME type:
const [imageMimeType, setImageMimeType] = useState('image/jpeg')

// In onDrop, after setting imageB64:
setImageMimeType(file.type || 'image/jpeg')

// In handleScan photo branch:
action = scanByPhoto({ image: imageB64, category, mime_type: imageMimeType })

// Update format badges in UI:
// Show: JPEG  PNG  WEBP  HEIC  BMP
```

**`client/src/store/slices/scanSlice.js`**
- Pass `mime_type` through in the `scanByPhoto` thunk API body

**`server/app/routes/scan.py`** — `scan_photo()`:
```python
mime_type = (data.get('mime_type') or 'image/jpeg').strip()
extracted = extract_from_image(image_b64, category, mime_type=mime_type)
```

**`server/requirements.txt`** — add:
```
pillow-heif>=0.16.0
```

**`server/app/services/groq_service.py`** — top of file:
```python
try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
except ImportError:
    pass  # HEIC optional — degrades gracefully
```

### 2B. Image preprocessing for better OCR

In `groq_service.py`, ensure `_preprocess_image()` exists:
- Decode base64 → PIL Image RGB
- Upscale if shortest side < 1000px (LANCZOS)
- Cap at 4000px longest side
- Sharpen: `ImageEnhance.Sharpness(img).enhance(2.0)`
- Contrast: `ImageEnhance.Contrast(img).enhance(1.3)`
- Re-encode as JPEG quality=90

Ensure `extract_from_image()`:
1. Calls `_preprocess_image()` first
2. On first attempt uses normal `VISION_USER_TEMPLATE`
3. If `ocr_confidence == "LOW"` AND `ingredients_raw` is empty → retry with `VISION_USER_RETRY_TEMPLATE` (more aggressive, best-effort extraction)

### 2C. Better LOW_CONFIDENCE UX

**`server/app/routes/scan.py`** — LOW_CONFIDENCE response:
```python
return jsonify({
    "status": "LOW_CONFIDENCE",
    "message": "Could not read ingredients clearly.",
    "tips": [
        "Photograph the INGREDIENTS LIST panel specifically",
        "Use natural light — avoid shadows or flash glare",
        "Hold camera steady and close to the label",
        "Try landscape mode for wide labels",
        "Ensure all ingredient text is inside the frame"
    ],
    "ocr_confidence": extracted.get("ocr_confidence", "LOW"),
}), 422
```

**`client/src/pages/Home.jsx`** — when API returns LOW_CONFIDENCE status, show a tip card instead of just a toast error.

**`client/src/pages/Result.jsx`** — when `result.ocr_confidence === "LOW"`, show a yellow banner:
```
⚠️ Low confidence scan — some ingredients may be misread.
Results are approximate. Rescan with a clearer photo for best accuracy.
```

---

## TASK 3 — New Free Services Integration

### 3A. Google Lens / ML Kit Vision — Camera Scanning in Browser
**Service:** Browser native camera API + `getUserMedia` (zero cost, no API key)

Add a **"Live Camera"** tab to Home.jsx alongside the existing upload/barcode/link tabs.

- Use `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })`
- Show live camera feed in a `<video>` element with a scanning frame overlay
- "Capture" button takes a snapshot via `<canvas>` → base64 → sends to existing `/scan/photo` API
- Falls back gracefully if camera permission denied
- Mobile-first: this is the primary use case (pointing phone at a packet)
- Add a "flip camera" button for front/back camera switch

**`client/src/pages/Home.jsx`** — new tab:
```js
const TABS = [
  { id: 'camera',  label: 'Camera',       icon: Camera },   // NEW - first tab
  { id: 'barcode', label: 'Scan Barcode', icon: ScanLine },
  { id: 'photo',   label: 'Upload Photo', icon: Image },
  { id: 'link',    label: 'Paste Link',   icon: Link2 },
]
```

Create `client/src/components/scan/CameraCapture.jsx`:
- `<video>` with scanning frame overlay (green corner brackets CSS)
- Capture button → canvas snapshot → `onCapture(base64, mimeType)` callback
- Permission denied state with friendly message
- Loading state while camera initialises
- Switch camera button (front/back)

### 3B. OpenFoodFacts Folksonomy API — Richer Product Data
**Service:** OpenFoodFacts API (100% free, open data, no API key needed)
**Already in use** for barcode lookup — EXTEND it.

**`server/app/routes/scan.py`** — in `_off_to_product()`, also extract:
```python
# Extract additional fields from OFF response:
product.packaging        = _safe_str(off_data.get("packaging"), 200)
product.manufacturing_places = _safe_str(off_data.get("manufacturing_places"), 200)
product.origins          = _safe_str(off_data.get("origins"), 200)
product.labels_tags      = ",".join(off_data.get("labels_tags", []))[:500]
# labels_tags includes: organic, fairtrade, vegan, vegetarian, halal certifications
```

**`server/app/models/product.py`** — add these columns if not present.

**`client/src/components/scan/VerdictCard.jsx`** — show certification badges:
- Parse `labels_tags` and show icons: 🌱 Organic, 🟢 Vegan, 🥕 Vegetarian, ☪️ Halal, ✡️ Kosher
- Show manufacturing country/origin if available

### 3C. Nutritionix India / USDA FoodData Central — Nutrition Gap Filling
**Service:** USDA FoodData Central API (free, no credit card, 3600 requests/hour)
**Get key:** https://fdc.nal.usda.gov/api-guide.html (instant, free)

**Purpose:** When a photo scan extracts zero nutrition data (label is cut off or not visible),
fall back to USDA database to get approximate nutrition for the product type.

**`server/app/services/nutrition_fallback.py`** — create new file:
```python
"""
Fallback nutrition lookup via USDA FoodData Central API.
Used when OCR returns no nutrition data.
Free tier: 3600 requests/hour.
API key: https://fdc.nal.usda.gov/api-guide.html
"""
import os, requests

USDA_API_KEY = os.getenv("USDA_API_KEY", "DEMO_KEY")  # DEMO_KEY = 30 req/day free without signup
USDA_SEARCH  = "https://api.nal.usda.gov/fdc/v1/foods/search"

def lookup_nutrition_by_name(product_name: str, brand: str = "") -> dict | None:
    """
    Search USDA for a product and return per-100g nutrition if found.
    Returns None if no match or API unavailable.
    """
    query = f"{brand} {product_name}".strip()
    try:
        resp = requests.get(USDA_SEARCH, params={
            "query": query, "api_key": USDA_API_KEY,
            "pageSize": 1, "dataType": ["Branded", "Survey (FNDDS)"]
        }, timeout=5)
        foods = resp.json().get("foods", [])
        if not foods:
            return None
        nutrients = {n["nutrientName"]: n["value"] for n in foods[0].get("foodNutrients", [])}
        return {
            "energy_kcal": nutrients.get("Energy"),
            "protein_g":   nutrients.get("Protein"),
            "fat_g":       nutrients.get("Total lipid (fat)"),
            "sugar_g":     nutrients.get("Sugars, total including NLEA"),
            "sodium_g":    (nutrients.get("Sodium, Na") or 0) / 1000,
            "fiber_g":     nutrients.get("Fiber, total dietary"),
            "source":      "usda_fallback"
        }
    except Exception:
        return None
```

**`server/.env.example`** — add:
```
USDA_API_KEY=your-usda-api-key  # Free at fdc.nal.usda.gov
```

**`server/app/routes/scan.py`** — in `scan_photo()`, after extraction:
```python
# If no nutrition extracted at all, try USDA fallback
if not any(n100.values()) and not any(n_serv.values()):
    from app.services.nutrition_fallback import lookup_nutrition_by_name
    usda_data = lookup_nutrition_by_name(
        extracted.get("product_name", ""), extracted.get("brand", "")
    )
    if usda_data:
        # Use as per-100g data
        n100 = usda_data
        result["nutrition_source"] = "usda_fallback"
```

### 3D. Redis Cache — Faster Repeat Scans
**Service:** Redis (free, self-hosted via Docker OR Upstash Redis free tier — 10,000 req/day)
**Upstash:** https://upstash.com — free tier, no credit card needed

**Purpose:** Cache Groq vision + verdict results for the same product so repeat scans
return instantly without re-calling the paid API.

**`server/requirements.txt`** — add:
```
redis>=5.0.0
```

**`server/app/services/cache_service.py`** — create:
```python
"""
Redis cache for scan results. Falls back gracefully if Redis unavailable.
Use Upstash Redis free tier (10K req/day) or local Redis.
"""
import os, json, hashlib, redis

_redis = None

def get_redis():
    global _redis
    if _redis is None:
        url = os.getenv("REDIS_URL", "redis://localhost:6379")
        try:
            _redis = redis.from_url(url, decode_responses=True, socket_timeout=1)
            _redis.ping()
        except Exception:
            _redis = None
    return _redis

def cache_key(image_b64: str) -> str:
    """Deterministic key from image hash."""
    return f"scan:v1:{hashlib.sha256(image_b64[:500].encode()).hexdigest()[:16]}"

def get_cached_scan(image_b64: str) -> dict | None:
    r = get_redis()
    if not r:
        return None
    try:
        val = r.get(cache_key(image_b64))
        return json.loads(val) if val else None
    except Exception:
        return None

def cache_scan(image_b64: str, result: dict, ttl_seconds: int = 86400):
    """Cache for 24 hours."""
    r = get_redis()
    if not r:
        return
    try:
        r.setex(cache_key(image_b64), ttl_seconds, json.dumps(result))
    except Exception:
        pass
```

**`server/.env.example`** — add:
```
REDIS_URL=redis://localhost:6379  # Or Upstash: rediss://default:xxx@xxx.upstash.io:6379
```

**`server/app/routes/scan.py`** — in `scan_photo()`:
```python
from app.services.cache_service import get_cached_scan, cache_scan

# Check cache before calling Groq:
cached = get_cached_scan(image_b64)
if cached:
    return jsonify({"status": "OK", "cached": True, **cached}), 200

# ... existing extraction + pipeline ...

# Cache after successful scan:
cache_scan(image_b64, result)
```

### 3E. WhatsApp Share — Viral Growth Feature
**Service:** WhatsApp URL scheme (100% free, no API needed)

**`client/src/pages/Result.jsx`** — add share buttons:

```jsx
const shareText = `I scanned ${result.product?.product_name} on Label Padhega!
Score: ${result.score}/100 — ${result.score >= 70 ? "Safe ✓" : result.score >= 45 ? "Caution ⚠️" : "Avoid ❌"}
Check your food labels: https://labelpadhega.com`

// WhatsApp share button:
<a
  href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
  target="_blank"
  rel="noopener noreferrer"
  className="flex items-center gap-2 px-4 py-2 bg-[#25D366] text-white rounded-lg text-sm font-medium"
>
  <svg ...whatsapp-icon.../> Share on WhatsApp
</a>

// Native share (works on mobile):
<button onClick={() => navigator.share?.({ title: 'Label Padhega', text: shareText })}>
  Share
</button>
```

Also add a **"Copy Result Link"** feature using `navigator.clipboard.writeText()`.

### 3F. Cloudinary Free Tier — Image Storage for Scan History
**Service:** Cloudinary (free: 25GB storage, 25GB bandwidth/month)
**Get account:** https://cloudinary.com/users/register/free

**Purpose:** Store the scanned label image alongside scan history so users can review
what they actually scanned in History page.

**`server/requirements.txt`** — add:
```
cloudinary>=1.36.0
```

**`server/app/services/image_store.py`** — create:
```python
"""
Optional image storage for scan history.
Uses Cloudinary free tier (25GB storage, 25GB bandwidth/month).
Falls back to not storing if credentials missing.
"""
import os, base64
import cloudinary, cloudinary.uploader

cloudinary.config(
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key    = os.getenv("CLOUDINARY_API_KEY"),
    api_secret = os.getenv("CLOUDINARY_API_SECRET"),
    secure     = True
)

def upload_scan_image(base64_image: str, scan_id: str) -> str | None:
    """Upload image and return CDN URL. Returns None if not configured."""
    if not os.getenv("CLOUDINARY_CLOUD_NAME"):
        return None
    try:
        result = cloudinary.uploader.upload(
            f"data:image/jpeg;base64,{base64_image}",
            public_id  = f"scans/{scan_id}",
            folder     = "labelpadhega",
            overwrite  = True,
            quality    = "auto",
            fetch_format = "auto",
        )
        return result.get("secure_url")
    except Exception:
        return None
```

**`server/.env.example`** — add:
```
CLOUDINARY_CLOUD_NAME=your-cloud-name   # Free at cloudinary.com
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

**`server/app/routes/scan.py`** — after successful scan, upload image:
```python
from app.services.image_store import upload_scan_image
image_url = upload_scan_image(image_b64, scan.id if scan else "unknown")
if image_url:
    result["scan_image_url"] = image_url
```

**`client/src/pages/History.jsx`** — show thumbnail of the scanned label image next to each history entry if `scan_image_url` is present.

### 3G. Sentry Free Tier — Error Monitoring
**Service:** Sentry (free: 5000 errors/month, no credit card)
**Get DSN:** https://sentry.io/signup/

**Why:** Right now errors silently fail. You need to know when OCR fails, Groq returns
non-JSON, or the matcher crashes.

**`server/requirements.txt`** — add:
```
sentry-sdk[flask]>=1.40.0
```

**`server/app/__init__.py`** — add Sentry init:
```python
import sentry_sdk
from sentry_sdk.integrations.flask import FlaskIntegration
import os

sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN", ""),  # Leave blank = Sentry disabled
    integrations=[FlaskIntegration()],
    traces_sample_rate=0.1,
    environment=os.getenv("FLASK_ENV", "production"),
)
```

**Frontend `client/src/main.jsx`** — add Sentry React:
```bash
npm install @sentry/react
```
```js
import * as Sentry from "@sentry/react"
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || "",
  tracesSampleRate: 0.1,
})
```

**`server/.env.example`** + **`client/.env.example`** — add:
```
SENTRY_DSN=https://xxx@sentry.io/xxx   # Free at sentry.io
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx
```

### 3H. Plausible Analytics (self-hosted) OR Umami — Privacy-first Analytics
**Service:** Umami (open-source, self-hostable on Railway/Render free tier)
**Or:** Plausible Community Edition (self-hosted, free forever)
**Railway free tier:** https://railway.app — $5 credit/month free

**Why:** Know which features users actually use, which products get scanned most,
conversion rate of scan → result → chat.

**`client/index.html`** — add Umami script (after self-hosting on Railway):
```html
<script async defer
  data-website-id="your-website-id"
  src="https://your-umami.railway.app/umami.js">
</script>
```

**`client/src/pages/Home.jsx`** — track scan events:
```js
// After successful scan:
window.umami?.track('scan-completed', { method: tab, score: result.score, category })

// Track tab switches:
window.umami?.track('tab-switch', { tab: t.id })
```

**`client/src/pages/Result.jsx`** — track share events:
```js
window.umami?.track('share-whatsapp', { product: result.product?.product_name })
```

---

## TASK 4 — UI/UX Improvements

### 4A. Home.jsx Improvements

1. **Camera tab as first/default tab** (from Task 3A)

2. **Photo upload tips checklist** below the dropzone when no image selected:
```
📸 For best results:
  • Photograph the INGREDIENTS LIST panel, not the front
  • Ensure all text fits in frame — don't cut off edges
  • Good lighting — no shadows or flash glare
  • Hold steady — blurry = poor results
```

3. **After upload** — show filename, file size, and format badge below preview

4. **Rename scan button:** "Scan & Score" → "Analyze Label"

### 4B. Result.jsx Improvements

1. **Score meaning expandable section:**
   - 70–100 🟢 Safe — minimal processing, clean ingredients
   - 45–69 🟡 Caution — moderately processed, check carefully
   - 0–44 🔴 Avoid — highly processed or harmful additives

2. **WhatsApp + native share buttons** (from Task 3E)

3. **Low-confidence yellow banner** when `result.ocr_confidence === "LOW"`

4. **Score label rename:** "Food Pharmer Score" → "LabelScan Score"

5. **Certification badges** from OFF labels_tags (organic, vegan, halal etc.)

6. **Scan image thumbnail** in result header if `scan_image_url` is present

### 4C. History.jsx Improvements

1. **Scan image thumbnails** next to each history item (from Cloudinary, Task 3F)
2. **Filter by score band** — show only "Avoid" scans, or only "Safe" scans
3. **Export history as CSV** — ingredients, scores, dates for power users

### 4D. Navbar.jsx

1. Update branding — remove Food Pharmer, keep "Label Padhega"
2. Add a small "Free" badge or tagline: "100% Free · No Ads"

---

## TASK 5 — New Feature: Ingredient Deep-Dive

When a user taps an ingredient in the `IngredientBreakdown` component, show a bottom drawer/modal with:

- Ingredient full name + INS number
- Harm level (1–4) with color badge
- What it's used for (functional class)
- Why it's a concern (harm_reason from FSSAI data)
- Whether FSSAI permits it in India
- A "common products that contain this" note

This data is already in the FSSAI CSV and matched_ingredients. Just need the UI.

**`client/src/components/scan/IngredientBreakdown.jsx`**
- Make each ingredient row clickable
- On click → open `IngredientDetailDrawer` component

**`client/src/components/scan/IngredientDetailDrawer.jsx`** — create new:
- Bottom sheet on mobile, right sidebar on desktop
- Shows all fields from the matched ingredient object
- "Close" button + tap-outside-to-close

---

## TASK 6 — Backend: Rate Limiting + Basic Security
**Service:** Flask-Limiter (free, built-in)

```bash
pip install flask-limiter
```

**`server/app/__init__.py`**:
```python
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"],
    storage_uri=os.getenv("REDIS_URL", "memory://")
)
```

**`server/app/routes/scan.py`** — apply stricter limit to scan endpoints:
```python
from app import limiter

@scan_bp.route("/photo", methods=["POST"])
@limiter.limit("20 per hour")  # Groq vision is the expensive call
@jwt_optional
def scan_photo():
    ...

@scan_bp.route("/barcode", methods=["POST"])
@limiter.limit("30 per hour")
@jwt_optional
def scan_barcode():
    ...
```

---

## New Environment Variables Summary

Add all of these to `server/.env.example` and `client/.env.example`:

```bash
# server/.env.example additions:
USDA_API_KEY=your-usda-key          # Free: fdc.nal.usda.gov
REDIS_URL=redis://localhost:6379    # Free: Upstash or local Docker
SENTRY_DSN=https://xxx@sentry.io   # Free: sentry.io (5K errors/month)
CLOUDINARY_CLOUD_NAME=xxx          # Free: cloudinary.com (25GB)
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx

# client/.env.example additions:
VITE_SENTRY_DSN=https://xxx@sentry.io
VITE_UMAMI_WEBSITE_ID=xxx          # Self-hosted Umami (free)
```

---

## Updated requirements.txt

```
# Existing:
flask
flask-sqlalchemy
flask-cors
groq
requests
pillow

# New additions:
pillow-heif>=0.16.0       # HEIC image support (Task 2A)
redis>=5.0.0              # Caching (Task 3D) - Upstash free tier
cloudinary>=1.36.0        # Image storage (Task 3F) - free 25GB
sentry-sdk[flask]>=1.40.0 # Error monitoring (Task 3G) - free 5K errors/month
flask-limiter>=3.5.0      # Rate limiting (Task 6) - free, built-in
```

---

## Implementation Order

Work through tasks in this order — each builds on the previous:

1. **Task 1** — Remove all Revant/Food Pharmer references (grep → fix → verify zero results)
2. **Task 2** — Image fixes (HEIC support, preprocessing, LOW_CONFIDENCE UX)
3. **Task 3A** — Camera capture tab (biggest UX win, no API key needed)
4. **Task 3D** — Redis caching (makes everything faster for repeat scans)
5. **Task 3B** — OpenFoodFacts richer data (already in codebase, just extend)
6. **Task 3C** — USDA nutrition fallback (fills gaps when OCR misses nutrition)
7. **Task 3E** — WhatsApp share (5-minute win, big viral potential)
8. **Task 3G** — Sentry error monitoring (install early so bugs are caught)
9. **Task 4** — All UI/UX improvements
10. **Task 5** — Ingredient deep-dive drawer
11. **Task 3F** — Cloudinary image storage (scan history thumbnails)
12. **Task 3H** — Umami analytics (last, needs separate deployment)
13. **Task 6** — Rate limiting (security layer, add last)

---

## Final Checklist

```bash
# Branding:
grep -rn "Food Pharmer\|Revant\|revant" . --include="*.py" --include="*.jsx" --include="*.js"
# → zero results (except food_pharmer_score DB column — that's OK)

# Image:
# - Dropzone accepts .heic, .heif, .bmp, .tiff
# - mime_type sent from frontend → received in backend → passed to extract_from_image()
# - _preprocess_image() in groq_service.py
# - Retry logic exists for LOW confidence

# New features:
# - Camera tab works in Chrome mobile (getUserMedia)
# - Redis cache: repeat scan returns "cached": true in response
# - USDA fallback: nutrition filled when OCR returns empty
# - WhatsApp share button visible on Result page
# - Sentry captures errors silently

# Security:
# - /scan/photo rate-limited to 20/hour per IP
# - /scan/barcode rate-limited to 30/hour per IP

# UI:
# - LabelScan Score (not Food Pharmer Score) on Result page
# - Score meaning expandable section visible
# - Ingredient rows are clickable → opens detail drawer
# - Low-confidence yellow banner shows when ocr_confidence === "LOW"
# - History page shows scan image thumbnails
```
