"""
app/utils/email.py
==================
Brevo (formerly Sendinblue) transactional email via REST API.
Used for: welcome emails, password reset (future), scan summary reports.

API key is loaded from BREVO_API_KEY env var.
All calls are fire-and-forget — email failures never break core flows.
"""

import os
import requests

BREVO_API_KEY    = os.getenv("BREVO_API_KEY", "")
SENDER_EMAIL     = os.getenv("BREVO_SENDER_EMAIL", "noreply@labelpadhega.com")
SENDER_NAME      = os.getenv("BREVO_SENDER_NAME", "Label Padhega AI")
BREVO_SEND_URL   = "https://api.brevo.com/v3/smtp/email"


def _send(to_email: str, to_name: str, subject: str, html_content: str) -> bool:
    """Core Brevo API call. Returns True on success."""
    if not BREVO_API_KEY:
        return False   # silently skip in dev without API key
    try:
        resp = requests.post(
            BREVO_SEND_URL,
            headers={
                "api-key":      BREVO_API_KEY,
                "Content-Type": "application/json",
            },
            json={
                "sender":     {"email": SENDER_EMAIL, "name": SENDER_NAME},
                "to":         [{"email": to_email, "name": to_name}],
                "subject":    subject,
                "htmlContent": html_content,
            },
            timeout=10,
        )
        return resp.status_code in (200, 201)
    except Exception:
        return False


def send_welcome_email(email: str, name: str) -> bool:
    """Send welcome email after registration."""
    html = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Welcome to Label Padhega AI, {name}! 🌿</h2>
      <p>India's first AI-powered food label scanner is ready for you.</p>
      <p>Scan any food product's barcode or label photo to instantly know:</p>
      <ul>
        <li>Food Pharmer Score (0-100)</li>
        <li>Harmful ingredients in plain Hindi/English</li>
        <li>Sugar in teaspoons, salt in pinches</li>
        <li>Revant Himatsingka's verdict in his exact voice</li>
      </ul>
      <p>India padhega, India samjhega. 🙏</p>
    </div>
    """
    return _send(email, name, "Welcome to Label Padhega AI! 🌿", html)
