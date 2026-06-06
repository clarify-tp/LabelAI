# Label Padhega AI

> India's first AI-powered food label scanner — powered by Food Pharmer's mission.
> Scan any product to get a Food Pharmer Score (0–100), a Revant-style Hinglish verdict,
> and verified ingredient analysis against the official FSSAI additive database.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + Tailwind CSS |
| Backend | Flask (Python) |
| Database | PostgreSQL + SQLAlchemy ORM |
| AI / LLM | Groq API (llama-4-scout for vision, llama-3.3-70b for verdict + chat) |
| Animation | GSAP |
| State management | Redux Toolkit |
| Email | Brevo (API-based) |

---

## Project Structure

```
labelpadhega/
├── frontend/          # React + Vite app
│   └── src/
│       ├── components/
│       │   ├── layout/    # Navbar, Breadcrumb, Footer
│       │   ├── scan/      # VerdictCard, NutritionVisual, IngredientBreakdown
│       │   └── ui/        # ScoreCircle, Tooltip, CategoryPicker, LoadingSpinner, BackToTop
│       ├── pages/         # Home, Result, Chat, Compare, History, Profile, Login, Register
│       ├── store/slices/  # authSlice, themeSlice, scanSlice, compareSlice, chatSlice
│       ├── hooks/         # useKeyboardShortcuts, useDebounce
│       ├── configs/       # api.js (Axios instance)
│       └── utils/         # formatters.js
│
├── server/            # Flask backend
│   └── app/
│       ├── models/    # User, Product, Scan, ChatMessage, Ingredient, Cache models
│       ├── routes/    # auth, scan, product, compare, profile, chat, export, health
│       ├── services/  # groq_service.py (all LLM calls), matcher.py (ingredient matching)
│       ├── tools/     # score_engine.py, compare_tool.py, bmi_tool.py (LLM tools)
│       └── utils/     # auth.py (JWT), humanise.py, reasons.py, side_effects.py, email.py
│
└── data/
    ├── india_products.json                    # Open Food Facts India (1,079 products)
    └── FSSAI_India_Additives_FoodPharmer.csv  # 475 FSSAI additives with harm levels
```

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL running locally
- Groq API key (free at console.groq.com)

### 1. Clone and set up backend

```bash
cd server
python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt

# Copy env file and fill in your values
cp .env.example .env
# Edit .env: set DATABASE_URL, GROQ_API_KEY, SECRET_KEY
```

### 2. Set up database

```bash
# Create PostgreSQL database
psql -U postgres -c "CREATE DATABASE labelpadhega;"

# Run migrations
flask db init
flask db migrate -m "Initial migration"
flask db upgrade

# Seed with real data (1,079 products + 475 FSSAI additives + dummy users)
python seed.py
```

### 3. Start Flask backend

```bash
python run.py
# Running at http://localhost:5000
# Health check: http://localhost:5000/api/health
```

### 4. Set up frontend

```bash
cd ../frontend
npm install

cp .env.example .env
# VITE_BASE_URL=http://localhost:5000

npm run dev
# Running at http://localhost:5173
```

---

## Dummy Login Credentials (after seed.py)

| Email | Password | Profile |
|---|---|---|
| rahul@example.com | password123 | Diabetes + hypertension |
| priya@example.com | password123 | Gluten intolerance |
| anita@example.com | password123 | High cholesterol |

---

## Key Architecture Decisions

### Tool Calling (no LLM hallucination on numbers)
All numerical operations use Groq function calling:
- `calculate_food_score` — deterministic score (0-100), never computed by LLM
- `compare_products` — deterministic winner selection by score
- `calculate_bmi` — Indian ICMR thresholds (overweight ≥23, not ≥25)

### Chatbot: Direct Injection, not RAG
Product data + user profile are fetched from PostgreSQL and injected directly into
the system message. No vector search needed — the knowledge is small and structured.
RAG will be added in Phase 2 for the YouTube transcript corpus.

### Context Detection
Before every chatbot response, a fast Groq call (llama-3.1-8b-instant) classifies
who the conversation is about (self / child / elderly / other). This determines whether
the user's own health profile is injected. Low confidence → general adult thresholds.

### Category-Aware Scoring
12 product categories with different penalty multipliers:
- health_drink: 1.5× (claiming health benefits = stricter scrutiny)
- baby_food: 2.0× (immature immune system = zero tolerance)
- chocolate: 0.9× (sugar is expected = lighter touch)

### Indian Standards Throughout
- ICMR RDA values (not US FDA or EU EFSA)
- Indian BMI thresholds: overweight ≥23, obese ≥25 (lower than WHO)
- Sugar displayed in teaspoons, salt in pinches, fat in tablespoons

---

## API Endpoints

| Method | Route | Description |
|---|---|---|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Login, returns JWT |
| GET  | /api/auth/me | Current user |
| POST | /api/scan/barcode | Scan by EAN-13 barcode |
| POST | /api/scan/photo | Scan by label photo (base64) |
| POST | /api/scan/link | Scan by Blinkit/BigBasket URL |
| GET  | /api/product/:barcode | Full product data |
| GET  | /api/product/history | Last 20 scans |
| POST | /api/compare | Compare 2-4 products |
| GET  | /api/profile | User profile |
| PUT  | /api/profile | Update profile |
| GET  | /api/profile/bmi | Calculate BMI |
| POST | /api/chat | Chatbot message |
| GET  | /api/chat/history/:session_id | Chat history |
| GET  | /api/export/csv | Export scans as CSV |
| GET  | /api/export/excel | Export scans as Excel |
| GET  | /api/export/pdf | Export scans as PDF |
| GET  | /api/health | Health check (for UptimeRobot) |

---

## Keyboard Shortcuts (Frontend)

| Key | Action |
|---|---|
| ? | Show/hide shortcuts guide |
| G + H | Go to Home |
| G + C | Go to Compare |
| G + T | Go to Chat |
| G + I | Go to History |
| D | Toggle dark/light mode |
| Escape | Close overlays |

---

## Free Tier Deployment

| Service | Used for | Free limit |
|---|---|---|
| Netlify / Cloudflare Pages | React frontend | Unlimited |
| Render.com | Flask backend | 750 hrs/month |
| Supabase | PostgreSQL | 500MB |
| Railway.app | Playwright scraper | 500 hrs/month |
| Groq API | LLM calls | ~14,400 req/day |

> **Note:** Render free tier sleeps after 15min inactivity.
> Use UptimeRobot to ping `/api/health` every 10 minutes.

---

*Version 1.0 — Label Padhega AI — India padhega, India samjhega 🌿*
