"""Controlled test-name aliases. Unknown names stay unknown for doctor review."""

CANONICAL = {
    "hb": "hemoglobin",
    "hgb": "hemoglobin",
    "haemoglobin": "hemoglobin",
    "hemoglobin": "hemoglobin",
    "rbc": "rbc",
    "rbc count": "rbc",
    "wbc": "wbc",
    "wbc count": "wbc",
    "tlc": "wbc",
    "white blood cells": "wbc",
    "leukocytes": "wbc",
    "plt": "platelets",
    "platelet": "platelets",
    "platelets": "platelets",
    "platelet count": "platelets",
    "thrombocytes": "platelets",
    "mcv": "mcv",
    "mch": "mch",
    "mchc": "mchc",
    "rdw": "rdw",
    "rdw cv": "rdw",
    "glucose": "glucose",
    "fasting glucose": "glucose",
    "fasting blood sugar": "glucose",
    "hematocrit": "hematocrit",
    "haematocrit": "hematocrit",
    "hct": "hematocrit",
    "pcv": "hematocrit",
}

DISPLAY = {
    "hemoglobin": "Hemoglobin",
    "rbc": "RBC",
    "wbc": "WBC",
    "platelets": "Platelets",
    "mcv": "MCV",
    "mch": "MCH",
    "mchc": "MCHC",
    "rdw": "RDW",
    "glucose": "Glucose",
    "hematocrit": "Hematocrit",
}


def canonical_name(name: str) -> str | None:
    key = " ".join(name.lower().replace(".", " ").split())
    return CANONICAL.get(key)


def display_name(name: str) -> tuple[str, str | None]:
    canonical = canonical_name(name)
    if canonical is None:
        cleaned = " ".join(name.split())
        return cleaned, None
    return DISPLAY.get(canonical, cleaned_title(canonical)), canonical


def cleaned_title(value: str) -> str:
    return value[:1].upper() + value[1:]
