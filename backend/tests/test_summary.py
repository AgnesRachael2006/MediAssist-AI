from app.summary import report_summary


def test_summary_lists_only_printed_results():
    text = report_summary(
        [
            {"test_name": "Hemoglobin", "value": "14.5", "unit": "g/dL", "reference_range": "13.0 - 16.5 g/dL"},
            {"test_name": "WBC Count", "value": "10570", "unit": "/cmm", "reference_range": "4000 - 10000 /cmm"},
        ]
    )
    assert "14.5" in text
    assert "10570" in text
    assert "This is not a diagnosis." in text
    assert "anemia" not in text.lower()
