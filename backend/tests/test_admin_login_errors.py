import asyncio

import pytest
from fastapi import HTTPException
from pymongo.errors import OperationFailure

import server


class AuthenticationFailedDatabase:
    async def command(self, _command):
        raise OperationFailure("bad auth", code=8000)


def test_mongodb_public_error_for_atlas_authentication_failure():
    error = OperationFailure("bad auth", code=8000)

    assert server.mongodb_error_category(error) == "authentication_failed"
    assert server.mongodb_public_error(error) == (
        "Database authentication failed. Check the production MONGO_URL credentials."
    )


def test_admin_login_reports_database_authentication_failure(monkeypatch):
    monkeypatch.setattr(server, "db", AuthenticationFailedDatabase())

    with pytest.raises(HTTPException) as raised:
        asyncio.run(server.admin_login(server.AdminLoginIn(
            email="admin@example.com",
            password="not-used",
        )))

    assert raised.value.status_code == 503
    assert raised.value.detail == (
        "Database authentication failed. Check the production MONGO_URL credentials."
    )
