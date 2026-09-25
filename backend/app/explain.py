"""Patient-facing translations of doctor-approved wording. No new medical claims."""


def translate_ta(text: str, finding: dict) -> str:
    known = {
        "Value is below the reference range provided in this report.": "இந்த அறிக்கையில் கொடுக்கப்பட்ட குறிப்பு வரம்பை விட இந்த மதிப்பு குறைவாக உள்ளது.",
        "Value is within the reference range provided in this report.": "இந்த மதிப்பு இந்த அறிக்கையில் கொடுக்கப்பட்ட குறிப்பு வரம்பிற்குள் உள்ளது.",
    }
    if text.strip() in known:
        return known[text.strip()]
    return _template(finding, "ta")


def translate_kn(text: str, finding: dict) -> str:
    known = {
        "Value is below the reference range provided in this report.": "ಈ ಮೌಲ್ಯವು ಈ ವರದಿಯಲ್ಲಿ ನೀಡಿದ ಉಲ್ಲೇಖ ವ್ಯಾಪ್ತಿಗಿಂತ ಕಡಿಮೆಯಿದೆ.",
        "Value is within the reference range provided in this report.": "ಈ ಮೌಲ್ಯವು ಈ ವರದಿಯಲ್ಲಿ ನೀಡಿದ ಉಲ್ಲೇಖ ವ್ಯಾಪ್ತಿಯೊಳಗಿದೆ.",
        "Your hemoglobin level is below the reference range provided in the report.": "ನಿಮ್ಮ ಹಿಮೋಗ್ಲೋಬಿನ್ ಮಟ್ಟವು ವರದಿಯಲ್ಲಿ ನೀಡಿದ ಉಲ್ಲೇಖ ವ್ಯಾಪ್ತಿಗಿಂತ ಕಡಿಮೆಯಿದೆ.",
        "Your mcv level is below the reference range provided in the report.": "ನಿಮ್ಮ ಎಂಸಿವಿ ಮಟ್ಟವು ವರದಿಯಲ್ಲಿ ನೀಡಿದ ಉಲ್ಲೇಖ ವ್ಯಾಪ್ತಿಗಿಂತ ಕಡಿಮೆಯಿದೆ.",
        "Your platelets level is below the reference range provided in the report.": "ನಿಮ್ಮ ಪ್ಲೇಟ್‌ಲೆಟ್ ಮಟ್ಟವು ವರದಿಯಲ್ಲಿ ನೀಡಿದ ಉಲ್ಲೇಖ ವ್ಯಾಪ್ತಿಗಿಂತ ಕಡಿಮೆಯಿದೆ.",
    }
    if text.strip() in known:
        return known[text.strip()]
    return _template(finding, "kn")


def approved_explanation(report: dict, findings: list[dict], doctor: str | None) -> dict | None:
    visible = [
        item
        for item in findings
        if item.get("patient_visible") and item.get("doctor_decision") not in {"pending", "rejected"} and item.get("final_text")
    ]
    if not visible:
        return None
    reviewed = [item["decided_at"] for item in visible if item.get("decided_at")]
    names = ", ".join(item["test_name"] for item in visible)
    results = []
    for item in visible:
        text = item["final_text"]
        results.append(
            {
                "test_name": item["test_name"],
                "text": text,
                "text_ta": item.get("final_text_ta") or translate_ta(text, item),
                "text_kn": item.get("final_text_kn") or translate_kn(text, item),
            }
        )
    missing = "Your doctor did not publish a missing-information note for this report."
    voice = " ".join(
        [
            "Here is your doctor-approved explanation.",
            f"Tests with an approved note: {names}.",
            *[f"{item['test_name']}. {item['text']}" for item in results],
            missing,
            "You can discuss these results with the doctor who reviewed your report.",
            "This is not a diagnosis.",
        ]
    )
    return {
        "report_id": report["id"],
        "title": report["title"],
        "doctor_name": doctor,
        "reviewed_at": sorted(reviewed)[-1] if reviewed else None,
        "notice": "This is not a diagnosis.",
        "notice_ta": "இது ஒரு நோயறிதல் அல்ல.",
        "notice_kn": "ಇದು ರೋಗನಿರ್ಣಯವಲ್ಲ.",
        "what_was_checked": f"Your doctor approved notes for {names}.",
        "what_was_checked_ta": f"உங்கள் மருத்துவர் {names} குறித்த விளக்கத்தை அங்கீகரித்தார்.",
        "what_was_checked_kn": f"ನಿಮ್ಮ ವೈದ್ಯರು {names} ಕುರಿತ ಟಿಪ್ಪಣಿಯನ್ನು ಅನುಮೋದಿಸಿದ್ದಾರೆ.",
        "results": results,
        "what_was_missing": missing,
        "what_was_missing_ta": "இந்த அறிக்கைக்கு விடுபட்ட தகவல் குறிப்பு எதுவும் வெளியிடப்படவில்லை.",
        "what_was_missing_kn": "ಈ ವರದಿಗೆ ಕಾಣೆಯಾದ ಮಾಹಿತಿಯ ಟಿಪ್ಪಣಿ ಪ್ರಕಟವಾಗಿಲ್ಲ.",
        "discuss": "Discuss these approved notes with the doctor who reviewed your report.",
        "discuss_ta": "இந்த அங்கீகரிக்கப்பட்ட குறிப்புகளை உங்கள் அறிக்கையை பரிசீலித்த மருத்துவரிடம் விவாதிக்கவும்.",
        "discuss_kn": "ಈ ಅನುಮೋದಿತ ಟಿಪ್ಪಣಿಗಳನ್ನು ನಿಮ್ಮ ವರದಿಯನ್ನು ಪರಿಶೀಲಿಸಿದ ವೈದ್ಯರೊಂದಿಗೆ ಚರ್ಚಿಸಿ.",
        "voice_script": voice,
        "voice_script_ta": " ".join(f"{item['test_name']}. {item['text_ta']}" for item in results) + " இது ஒரு நோயறிதல் அல்ல.",
        "voice_script_kn": " ".join(f"{item['test_name']}. {item['text_kn']}" for item in results) + " ಇದು ರೋಗನಿರ್ಣಯವಲ್ಲ.",
    }


def _template(finding: dict, language: str) -> str:
    checks = finding.get("checks") or {}
    outside = bool(checks.get("outside_range"))
    previous = finding.get("previous_value")
    unit = finding.get("previous_unit") or finding.get("unit") or ""
    if language == "ta":
        position = "கொடுக்கப்பட்ட குறிப்பு வரம்பை விட குறைவாக உள்ளது" if outside else "கொடுக்கப்பட்ட குறிப்பு வரம்பிற்குள் உள்ளது"
        earlier = "முந்தைய முடிவு இந்த அறிக்கையில் இல்லை." if previous is None else f"முந்தைய பதிவு {previous} {unit}."
        return (
            f"{finding.get('test_name')} மதிப்பு {finding.get('value')} {finding.get('unit')}. "
            f"குறிப்பு வரம்பு {finding.get('reference_range')}. இந்த மதிப்பு {position}. {earlier} இது ஒரு நோயறிதல் அல்ல."
        )
    position = "ನೀಡಿದ ಉಲ್ಲೇಖ ವ್ಯಾಪ್ತಿಗಿಂತ ಕಡಿಮೆಯಿದೆ" if outside else "ನೀಡಿದ ಉಲ್ಲೇಖ ವ್ಯಾಪ್ತಿಯೊಳಗಿದೆ"
    earlier = "ಹಿಂದಿನ ಫಲಿತಾಂಶ ಈ ವರದಿಯಲ್ಲಿಲ್ಲ." if previous is None else f"ಹಿಂದಿನ ದಾಖಲೆ {previous} {unit}."
    return (
        f"{finding.get('test_name')} ಮೌಲ್ಯ {finding.get('value')} {finding.get('unit')}. "
        f"ಉಲ್ಲೇಖ ವ್ಯಾಪ್ತಿ {finding.get('reference_range')}. ಈ ಮೌಲ್ಯ {position}. {earlier} ಇದು ರೋಗನಿರ್ಣಯವಲ್ಲ."
    )
