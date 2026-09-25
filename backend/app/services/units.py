"""Deterministic unit conversion. Original values are never replaced by the model."""

# Glucose: 1 mmol/L = 18.0182 mg/dL
_GLUCOSE_FACTOR = 18.0182


def normalize(value: float, unit: str, canonical: str | None) -> dict:
    original = {"original_value": value, "original_unit": unit, "normalized_value": value, "normalized_unit": unit, "status": "unchanged"}
    cleaned = (unit or "").strip()
    if not cleaned:
        return {**original, "status": "UNIT_NOT_NORMALIZED"}
    if canonical == "glucose" and cleaned.lower() in {"mmol/l", "mmol/l."}:
        return {
            "original_value": value,
            "original_unit": cleaned,
            "normalized_value": round(value * _GLUCOSE_FACTOR, 2),
            "normalized_unit": "mg/dL",
            "status": "converted",
        }
    return original
