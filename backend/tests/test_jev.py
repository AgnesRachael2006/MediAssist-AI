from app.extract import SYNTHETIC_CBC, parse_report
from app.jev import assert_publishable, evaluate, fallback_draft


def test_parser_reads_hemoglobin_from_the_synthetic_report():
    rows = {row["test_name"]: row for row in parse_report(SYNTHETIC_CBC)}
    assert rows["Hemoglobin"]["value"] == "9.8"
    assert rows["Hemoglobin"]["source_page"] == 1
    assert rows["Hemoglobin"]["source_line"] == 8
    assert rows["MCV"]["source_line"] == 9
    assert rows["RDW"]["source_line"] == 12
    assert rows["Platelets"]["source_line"] == 20
    assert rows["Hemoglobin"]["previous_value"] == 10.6
    assert rows["RDW"]["reference_range"] == ""


def test_jev_blocks_a_missing_reference_range():
    row = parse_report(SYNTHETIC_CBC)
    rdw = next(item for item in row if item["test_name"] == "RDW")
    decision = evaluate(rdw, fallback_draft(rdw))
    assert decision["triage"] == "insufficient"
    assert "MISSING_REFERENCE_RANGE" in decision["reason_codes"]


def test_jev_flags_an_overclaim_and_blocks_publishing_it():
    row = next(item for item in parse_report(SYNTHETIC_CBC) if item["test_name"] == "Hemoglobin")
    draft = "These results indicate that the patient has iron-deficiency anemia."
    decision = evaluate(row, draft)
    assert decision["overclaim"] is True
    finding = {
        "ai_draft": draft,
        "reference_range": row["reference_range"],
        "jev": decision,
        "checks": decision["checks"],
        "source": {"excerpt": row["source_text"], "page": 1, "line_start": row["source_line"]},
    }
    try:
        assert_publishable(draft, finding)
        raised = False
    except ValueError:
        raised = True
    assert raised


def test_safe_wording_can_be_published():
    row = next(item for item in parse_report(SYNTHETIC_CBC) if item["test_name"] == "Hemoglobin")
    draft = "Hemoglobin is outside the reference range printed on this report."
    decision = evaluate(row, draft)
    finding = {
        "ai_draft": draft,
        "reference_range": row["reference_range"],
        "jev": decision,
        "checks": decision["checks"],
        "source": {"excerpt": row["source_text"], "page": 1, "line_start": row["source_line"]},
    }
    assert_publishable(draft, finding)
