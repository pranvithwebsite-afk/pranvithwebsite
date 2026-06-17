import asyncio

import server


def test_admin_env_check_reports_status_and_masks_public_values(monkeypatch):
    env_values = {
        "VITE_RAZORPAY_KEY_ID": "rzp_test_frontend",
        "RAZORPAY_KEY_ID": "rzp_test_123456",
        "RAZORPAY_KEY_SECRET": "secret-value",
        "SMTP_HOST": "smtp.example.com",
        "SMTP_PORT": "587",
        "SMTP_USER": "mailer@example.com",
        "SMTP_PASS": "smtp-secret",
        "FROM_EMAIL": "PranvithDOP <no-reply@example.com>",
        "JWT_SECRET": "jwt-secret-value",
        "MONGO_URL": "mongodb+srv://user:password@example.mongodb.net/db",
        "FRONTEND_URL": "https://pranvithdop.com",
    }
    for key, value in env_values.items():
        monkeypatch.setenv(key, value)

    response = asyncio.run(server.admin_debug_env_check(None))
    checks = response["checks"]

    for key in env_values:
        assert checks[key] != "MISSING"
        assert env_values[key] not in str(checks[key])

    assert response["success"] is True
    assert response["warning"] == "Temporary debug tool. Remove after testing."
    assert checks["RAZORPAY_KEY_ID"] == "rzp_****3456"
    assert checks["SMTP_PORT"] == "***"
    assert checks["RAZORPAY_KEY_SECRET"] == "SET"
    assert checks["SMTP_PASS"] == "SET"
    assert checks["JWT_SECRET"] == "SET"
    assert checks["MONGO_URL"] == "SET"


def test_admin_env_check_reports_missing(monkeypatch):
    for key in server.ENV_CHECK_KEYS:
        monkeypatch.delenv(key, raising=False)

    response = asyncio.run(server.admin_debug_env_check(None))

    assert response["checks"] == {key: "MISSING" for key in server.ENV_CHECK_KEYS}
