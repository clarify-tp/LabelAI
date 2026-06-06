"""
run.py — Flask application entry point
=======================================
Start the development server with: python run.py
For production use gunicorn: gunicorn "app:create_app()" -w 4 -b 0.0.0.0:5000

Environment variables are loaded from .env via python-dotenv.
Copy .env.example to .env and fill in your values before running.
"""

import os
import sys

# Add the server directory to Python path so `from app import ...` works
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv

# Load .env BEFORE importing create_app (env vars must be set before app config reads them)
load_dotenv()

from app import create_app

app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_ENV", "development") == "development"
    print(f"🚀 Label Padhega AI backend running on http://localhost:{port}")
    app.run(debug=debug, host="0.0.0.0", port=port)
