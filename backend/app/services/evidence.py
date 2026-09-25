"""Check that a model or parser claim still appears in the source line."""


def value_in_source(value: str, source_text: str) -> bool:
    if value is None or not source_text:
        return False
    compact_source = source_text.replace(" ", "").replace(",", "")
    compact_value = str(value).replace(" ", "").replace(",", "")
    return compact_value in compact_source


def reference_bounds(reference: str) -> dict | None:
    import re

    match = re.search(r"(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)", reference or "")
    if not match:
        return None
    return {"low": float(match.group(1)), "high": float(match.group(2))}
