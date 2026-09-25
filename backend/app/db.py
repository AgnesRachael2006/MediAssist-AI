import threading

from fastapi import HTTPException
from supabase import Client, create_client

from app.config import settings

_clients = threading.local()


def client() -> Client:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(
            status_code=503,
            detail="Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env.",
        )
    existing = getattr(_clients, "client", None)
    if existing is None:
        existing = create_client(settings.supabase_url, settings.supabase_service_role_key)
        _clients.client = existing
    return existing


def rows(table: str, filters: dict | None = None, order: str | None = None) -> list[dict]:
    query = client().table(table).select("*")
    for key, value in (filters or {}).items():
        query = query.eq(key, value)
    if order:
        query = query.order(order)
    return query.execute().data or []


def rows_in(table: str, column: str, values: list, filters: dict | None = None) -> list[dict]:
    if not values:
        return []
    query = client().table(table).select("*").in_(column, list(values))
    for key, value in (filters or {}).items():
        query = query.eq(key, value)
    return query.execute().data or []


def one(table: str, filters: dict) -> dict | None:
    found = rows(table, filters)
    return found[0] if found else None


def insert(table: str, payload: dict | list[dict]) -> list[dict]:
    return client().table(table).insert(payload).execute().data or []


def upsert(table: str, payload: dict | list[dict]) -> list[dict]:
    return client().table(table).upsert(payload).execute().data or []


def update(table: str, match: dict, payload: dict) -> list[dict]:
    query = client().table(table).update(payload)
    for key, value in match.items():
        query = query.eq(key, value)
    return query.execute().data or []


def ping() -> bool:
    try:
        client().table("patients").select("id").limit(1).execute()
        return True
    except Exception:
        return False
