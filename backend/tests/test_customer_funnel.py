"""End-to-end tests for the PranvithDOP customer auth + asset funnel."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://bb-redesign.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

EXPECTED_SLUGS = {
    "creative-lut-pack",
    "premiere-pro-wedding-templates",
    "cinematic-sound-fx-pack",
    "after-effects-title-templates",
    "royalty-free-music-bundle",
    "smooth-transitions-pack",
    "color-gradients-pack",
    "typography-fonts-pack",
}
PAID_SLUGS = {
    "creative-lut-pack",
    "premiere-pro-wedding-templates",
    "cinematic-sound-fx-pack",
    "after-effects-title-templates",
    "royalty-free-music-bundle",
}
FREE_SLUGS = {
    "smooth-transitions-pack",
    "color-gradients-pack",
    "typography-fonts-pack",
}


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def fresh_user(session):
    """Register a brand new user for this run."""
    email = f"e2e-{int(time.time())}-{uuid.uuid4().hex[:6]}@pranvithdop.com"
    password = "Test1234!"
    r = session.post(f"{API}/auth/register", json={
        "name": "E2E Tester",
        "email": email,
        "password": password,
    })
    assert r.status_code == 200, r.text
    data = r.json()
    assert "access_token" in data and "user" in data
    return {
        "email": email,
        "password": password,
        "token": data["access_token"],
        "user_id": data["user"]["id"],
    }


def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ----- Products / CMS -------------------------------------------------------
class TestProducts:
    def test_list_products(self, session):
        r = session.get(f"{API}/products")
        assert r.status_code == 200
        items = r.json()
        slugs = {p["slug"] for p in items}
        assert EXPECTED_SLUGS.issubset(slugs), f"missing: {EXPECTED_SLUGS - slugs}"
        for p in items:
            if p["slug"] in EXPECTED_SLUGS:
                assert "payment_link" in p
                assert "landing_content" in p
                assert "thank_you_content" in p
                assert "is_free" in p

    def test_product_by_slug_creative_lut(self, session):
        r = session.get(f"{API}/products/creative-lut-pack")
        assert r.status_code == 200
        p = r.json()
        assert p["slug"] == "creative-lut-pack"
        assert p.get("landing_content")
        assert p.get("thank_you_content")
        assert p.get("payment_link")

    def test_product_not_found(self, session):
        r = session.get(f"{API}/products/no-such-slug")
        assert r.status_code == 404


# ----- Auth -----------------------------------------------------------------
class TestAuth:
    def test_register_duplicate(self, session, fresh_user):
        r = session.post(f"{API}/auth/register", json={
            "name": "Dup",
            "email": fresh_user["email"],
            "password": "Test1234!",
        })
        assert r.status_code == 400

    def test_login_wrong_password(self, session, fresh_user):
        r = session.post(f"{API}/auth/login", json={
            "email": fresh_user["email"],
            "password": "WrongPass!!",
        })
        assert r.status_code == 401

    def test_login_correct(self, session, fresh_user):
        r = session.post(f"{API}/auth/login", json={
            "email": fresh_user["email"],
            "password": fresh_user["password"],
        })
        assert r.status_code == 200
        body = r.json()
        assert body["access_token"]
        assert body["user"]["email"] == fresh_user["email"]

    def test_me_with_token(self, session, fresh_user):
        r = session.get(f"{API}/auth/me", headers=auth_headers(fresh_user["token"]))
        assert r.status_code == 200
        assert r.json()["email"] == fresh_user["email"]

    def test_me_without_token(self, session):
        r = session.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_me_invalid_token(self, session):
        r = session.get(f"{API}/auth/me", headers={"Authorization": "Bearer junk.token.value"})
        assert r.status_code == 401

    def test_admin_login(self, session):
        r = session.post(f"{API}/admin/login", json={
            "email": "admin@pranvithdop.com",
            "password": "Admin123!",
        })
        assert r.status_code == 200, r.text
        assert "access_token" in r.json()


# ----- Checkout init --------------------------------------------------------
class TestCheckoutInit:
    def test_checkout_init_authenticated_paid(self, session, fresh_user):
        r = session.post(f"{API}/auth/checkout/init",
                         json={"product_slug": "creative-lut-pack"},
                         headers=auth_headers(fresh_user["token"]))
        assert r.status_code == 200, r.text
        body = r.json()
        assert "payment_link" in body
        assert "order_id" in body
        assert body.get("is_free") is False
        assert "prefill[email]" in body["payment_link"]
        assert f"notes[order_id]={body['order_id']}" in body["payment_link"]
        # Save the order_id for the webhook test on this user
        fresh_user["paid_order_id"] = body["order_id"]

    def test_checkout_init_anonymous(self, session):
        r = session.post(f"{API}/auth/checkout/init",
                         json={"product_slug": "creative-lut-pack"})
        assert r.status_code == 200
        body = r.json()
        assert body["payment_link"]
        # Anonymous: no prefill suffix
        assert "prefill[email]" not in body["payment_link"]


# ----- Free claim -----------------------------------------------------------
class TestFreeClaim:
    def test_claim_free_success(self, session, fresh_user):
        r = session.post(f"{API}/auth/claim-free",
                         json={"product_slug": "smooth-transitions-pack"},
                         headers=auth_headers(fresh_user["token"]))
        assert r.status_code == 200, r.text
        assert r.json().get("success") is True

        # GET downloads to verify persistence
        r2 = session.get(f"{API}/auth/my-downloads", headers=auth_headers(fresh_user["token"]))
        assert r2.status_code == 200
        slugs = {p["slug"] for p in r2.json()}
        assert "smooth-transitions-pack" in slugs

    def test_claim_free_idempotent(self, session, fresh_user):
        # Claim again — should still succeed but not duplicate
        r = session.post(f"{API}/auth/claim-free",
                         json={"product_slug": "smooth-transitions-pack"},
                         headers=auth_headers(fresh_user["token"]))
        assert r.status_code == 200

        r2 = session.get(f"{API}/auth/my-downloads", headers=auth_headers(fresh_user["token"]))
        slugs = [p["slug"] for p in r2.json()]
        assert slugs.count("smooth-transitions-pack") == 1

    def test_claim_free_for_paid_product(self, session, fresh_user):
        r = session.post(f"{API}/auth/claim-free",
                         json={"product_slug": "creative-lut-pack"},
                         headers=auth_headers(fresh_user["token"]))
        assert r.status_code == 400


# ----- My orders / change-password ------------------------------------------
class TestUserAccount:
    def test_my_orders(self, session, fresh_user):
        r = session.get(f"{API}/auth/my-orders", headers=auth_headers(fresh_user["token"]))
        assert r.status_code == 200
        orders = r.json()
        assert isinstance(orders, list)
        # We've created at least one pending paid-order via checkout/init and one free claim
        slugs = {o.get("product_slug") for o in orders}
        assert "creative-lut-pack" in slugs
        assert "smooth-transitions-pack" in slugs

    def test_change_password_wrong_current(self, session, fresh_user):
        r = session.post(f"{API}/auth/change-password",
                         json={"current_password": "wrong-current!", "new_password": "NewPass123!"},
                         headers=auth_headers(fresh_user["token"]))
        assert r.status_code == 400

    def test_change_password_success(self, session, fresh_user):
        new_pw = "NewPass123!"
        r = session.post(f"{API}/auth/change-password",
                         json={"current_password": fresh_user["password"], "new_password": new_pw},
                         headers=auth_headers(fresh_user["token"]))
        assert r.status_code == 200
        # Login with new password
        r2 = session.post(f"{API}/auth/login", json={
            "email": fresh_user["email"], "password": new_pw,
        })
        assert r2.status_code == 200
        fresh_user["password"] = new_pw
        fresh_user["token"] = r2.json()["access_token"]


# ----- Razorpay webhook -----------------------------------------------------
class TestWebhook:
    def test_payment_captured_credits_user(self, session, fresh_user):
        # Init a new checkout to get a fresh order_id
        init = session.post(f"{API}/auth/checkout/init",
                            json={"product_slug": "premiere-pro-wedding-templates"},
                            headers=auth_headers(fresh_user["token"]))
        assert init.status_code == 200
        order_id = init.json()["order_id"]

        payload = {
            "event": "payment.captured",
            "payload": {
                "payment": {
                    "entity": {
                        "id": f"pay_test_{uuid.uuid4().hex[:8]}",
                        "email": fresh_user["email"],
                        "amount": 29900,
                        "currency": "INR",
                        "notes": {"order_id": order_id, "user_id": fresh_user["user_id"]},
                    }
                }
            },
        }
        r = session.post(f"{API}/webhooks/razorpay", json=payload)
        assert r.status_code == 200, r.text
        assert r.json().get("received") is True

        # Verify downloads now includes the paid product
        r2 = session.get(f"{API}/auth/my-downloads", headers=auth_headers(fresh_user["token"]))
        assert r2.status_code == 200
        slugs = {p["slug"] for p in r2.json()}
        assert "premiere-pro-wedding-templates" in slugs

        # Verify orders list shows the order as paid
        r3 = session.get(f"{API}/auth/my-orders", headers=auth_headers(fresh_user["token"]))
        order_match = next((o for o in r3.json() if o.get("id") == order_id), None)
        assert order_match is not None
        assert order_match.get("status") == "paid"
