from app.services.gemini_extract import Candidate, verify_candidate
from app.jev import evaluate
from app.services.evidence import value_in_source
from app.services.terminology import canonical_name, display_name
from app.services.units import normalize


def test_alias_maps_hb_and_leaves_unknown_untrusted():
    assert canonical_name("Hb") == "hemoglobin"
    assert canonical_name("TLC") == "wbc"
    assert display_name("Platelet Count")[0] == "Platelets"
    assert canonical_name("Mystery marker") is None


def test_glucose_conversion_keeps_the_original_value():
    converted = normalize(5.0, "mmol/L", "glucose")
    assert converted["original_value"] == 5.0
    assert converted["original_unit"] == "mmol/L"
    assert converted["normalized_unit"] == "mg/dL"
    assert converted["normalized_value"] == 90.09


def test_unsupported_unit_is_flagged():
    assert normalize(1.0, "", "hemoglobin")["status"] == "UNIT_NOT_NORMALIZED"


def test_value_must_appear_in_the_source_line():
    assert value_in_source("9.8", "Hemoglobin 9.8 g/dL 12-16")
    assert not value_in_source("11.2", "Hemoglobin 9.8 g/dL 12-16")


def test_trend_delta_is_current_minus_previous():
    values = [11.2, 10.6, 9.8]
    assert round(values[-1] - values[-2], 4) == -0.8
    assert round(values[-1] - values[0], 4) == -1.4


def test_gemini_candidate_is_rejected_when_the_number_is_not_in_the_document():
    document = "[[PAGE 1]]\nHemoglobin 9.8 g/dL 12 - 16"
    invented = Candidate(test_name="Hemoglobin", value=11.2, unit="g/dL", reference_low=12, reference_high=16)
    assert verify_candidate(document, invented) is None
    real = Candidate(test_name="Hb", value=9.8, unit="g/dL", reference_low=12, reference_high=16)
    kept = verify_candidate(document, real)
    assert kept is not None
    assert kept["value"] == "9.8"
    assert kept["source_line"] == 1


def test_missing_source_blocks_a_strong_decision():
    decision = evaluate(
        {"test_name": "Hemoglobin", "value": "9.8", "unit": "g/dL", "reference_range": "12 - 16 g/dL", "source_text": ""},
        "Value is below the printed range.",
    )
    assert decision["triage"] == "insufficient"
    assert decision["evidence"] == "insufficient"
