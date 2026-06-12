"""Brand typo regression: ensure 'PranavithDOP' (with extra 'a') does NOT appear in API responses."""
import os
import json
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001").rstrip("/")
TYPO = "PranavithDOP"
CORRECT = "PranvithDOP"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _count(text, needle):
    return text.count(needle)


def test_faqs_no_typo(session):
    r = session.get(f"{BASE_URL}/api/faqs", timeout=30)
    assert r.status_code == 200, f"Status {r.status_code}: {r.text[:200]}"
    body = r.text
    assert _count(body, TYPO) == 0, f"Found {_count(body, TYPO)} occurrences of typo in /api/faqs"


@pytest.mark.parametrize("slug", ["about", "works", "hire", "contact"])
def test_pages_no_typo(session, slug):
    r = session.get(f"{BASE_URL}/api/pages/{slug}", timeout=30)
    assert r.status_code == 200, f"Status {r.status_code} for {slug}: {r.text[:200]}"
    body = r.text
    assert _count(body, TYPO) == 0, f"Found {_count(body, TYPO)} typo occurrences in /api/pages/{slug}"


def test_admin_login(session):
    r = session.post(
        f"{BASE_URL}/api/admin/login",
        json={"email": "admin@pranvithdop.com", "password": "Admin123!"},
        timeout=30,
    )
    assert r.status_code == 200, f"Admin login failed {r.status_code}: {r.text[:200]}"
    data = r.json()
    assert "access_token" in data, f"No access_token in response: {data}"
    assert isinstance(data["access_token"], str) and len(data["access_token"]) > 0


def test_products_eight_slugs(session):
    r = session.get(f"{BASE_URL}/api/products", timeout=30)
    assert r.status_code == 200
    products = r.json()
    assert isinstance(products, list)
    slugs = [p.get("slug") for p in products if p.get("slug")]
    assert len(slugs) >= 8, f"Expected at least 8 products, got {len(slugs)}: {slugs}"
    # Also no typo
    body = r.text
    assert _count(body, TYPO) == 0, f"Typo present in /api/products"
