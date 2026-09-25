"""Read laboratory rows from an uploaded report. Gemini does not invent the numbers."""

import re
from io import BytesIO

ROW = re.compile(
    r"^(?P<name>[A-Za-z][A-Za-z ]+?)\s{2,}(?P<value>\d+(?:\.\d+)?)\s*"
    r"(?P<unit>%|g/dL|fL|pg|mg/dL|x10\^6/uL|x10\^3/uL)?"
    r"(?:\s+(?P<low>\d+(?:\.\d+)?)\s*-\s*(?P<high>\d+(?:\.\d+)?))?",
    re.I,
)
PREVIOUS = re.compile(
    r"^Previous\s+(?P<name>[A-Za-z]+)\s+(?P<value>\d+(?:\.\d+)?)",
    re.I,
)

SYNTHETIC_CBC = """
COMPLETE BLOOD COUNT
Patient: Arun Kumar  |  Synthetic record
File: CBC_Report.pdf
Test                  Result                 Reference
Panel                 CBC
RBC                     4.6 x10^6/uL           4.2 - 5.4
Hematocrit              40 %                   36 - 46
Hemoglobin              9.8 g/dL               12.0 - 16.0
MCV                     72 fL                  80 - 100
MCH                     29 pg                  27 - 31
MCHC                    33 g/dL                32 - 36
RDW                     13.2 %
WBC                     7.4 x10^3/uL           4.0 - 11.0
Neutrophils             58 %                   40 - 70
Lymphocytes             32 %                   20 - 40
Monocytes               6 %                    2 - 8
Eosinophils             2 %                    1 - 4
Collected               September
Reviewed                Synthetic
Platelets               228 x10^3/uL           150 - 450
Glucose                 92 mg/dL               70 - 99
Previous hemoglobin     10.6
Previous MCV            75
Previous platelets      224
""".strip()

STABLE_IDS = {
    "Hemoglobin": "f-hb",
    "MCV": "f-mcv",
    "WBC": "f-wbc",
    "RBC": "f-rbc",
    "Hematocrit": "f-hct",
    "MCH": "f-mch",
    "MCHC": "f-mchc",
    "RDW": "f-rdw",
    "Neutrophils": "f-neut",
    "Lymphocytes": "f-lymph",
    "Monocytes": "f-mono",
    "Eosinophils": "f-eos",
    "Platelets": "f-plt",
    "Glucose": "f-glu",
}


def finding_id(report_id: str, test_name: str, index: int) -> str:
    if report_id == "rpt-cbc" and test_name in STABLE_IDS:
        return STABLE_IDS[test_name]
    slug = re.sub(r"[^a-z0-9]+", "-", test_name.lower()).strip("-")
    return f"f-{report_id}-{slug or index}"


LOOSE = re.compile(
    r"^(?P<name>[A-Za-z][A-Za-z0-9./()%+\- ]{1,48}?)"
    r"(?:\s*\.{2,}\s*|\s+)"
    r"(?P<value>\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)"
    r"(?:\s*(?P<unit>[A-Za-zµμ/%^0-9.*]{1,18}))?"
    r"(?:\s+(?P<low>\d+(?:\.\d+)?)\s*[-–—]+\s*(?P<high>\d+(?:\.\d+)?))?\s*$",
    re.I,
)
PAGE_MARK = re.compile(r"^\[\[PAGE (\d+)\]\]$")
STOP = {
    "page", "date", "age", "sex", "phone", "mobile", "patient", "sample", "report",
    "collected", "reviewed", "printed", "reference", "result", "unit", "test", "name",
    "id", "mrn", "doctor", "lab", "address", "previous", "file", "panel",
}
ALIASES = {
    "hb": "Hemoglobin",
    "hgb": "Hemoglobin",
    "haemoglobin": "Hemoglobin",
    "hemoglobin": "Hemoglobin",
    "rbc": "RBC",
    "wbc": "WBC",
    "tlc": "WBC",
    "mcv": "MCV",
    "mch": "MCH",
    "mchc": "MCHC",
    "rdw": "RDW",
    "rdw cv": "RDW",
    "rdw-cv": "RDW",
    "pcv": "Hematocrit",
    "hct": "Hematocrit",
    "hematocrit": "Hematocrit",
    "haematocrit": "Hematocrit",
    "platelet": "Platelets",
    "platelets": "Platelets",
    "platelet count": "Platelets",
    "plt": "Platelets",
    "neutrophils": "Neutrophils",
    "lymphocytes": "Lymphocytes",
    "monocytes": "Monocytes",
    "eosinophils": "Eosinophils",
    "basophils": "Basophils",
    "glucose": "Glucose",
    "fasting glucose": "Glucose",
}


def read_pdf(data: bytes) -> str:
    from pypdf import PdfReader

    try:
        reader = PdfReader(BytesIO(data))
    except Exception as exc:
        raise ValueError("This file could not be read as a PDF.") from exc
    if reader.is_encrypted:
        try:
            reader.decrypt("")
        except Exception as exc:
            raise ValueError("This PDF is password protected.") from exc
    chunks: list[str] = []
    readable = 0
    for number, page in enumerate(reader.pages, start=1):
        chunks.append(f"[[PAGE {number}]]")
        text = page.extract_text() or ""
        page_lines = [line.strip() for line in text.splitlines() if line.strip()]
        readable += len(page_lines)
        chunks.extend(page_lines)
    if readable == 0:
        from app.services.ocr import OcrUnavailable, extract_text

        try:
            transcript = extract_text(data)
        except OcrUnavailable as exc:
            raise ValueError("INSUFFICIENT_SOURCE. This PDF has no readable text, and OCR did not produce a verified transcript.") from exc
        if not transcript.strip():
            raise ValueError("INSUFFICIENT_SOURCE. This PDF has no readable text, and OCR did not produce a verified transcript.")
        return "[[PAGE 1]]\n" + transcript.strip()
    return "\n".join(chunks)


def source_lines(text: str, report_id: str) -> list[dict]:
    page = 1
    number = 0
    lines = []
    for raw in text.splitlines():
        mark = PAGE_MARK.match(raw.strip())
        if mark:
            page = int(mark.group(1))
            number = 0
            continue
        number += 1
        lines.append({"report_id": report_id, "page": page, "line": number, "text": raw})
    return lines


def parse_report(text: str) -> list[dict]:
    previous: dict[str, float] = {}
    for raw in text.splitlines():
        match = PREVIOUS.match(raw.strip())
        if match:
            previous[_clean_name(match.group("name")).lower()] = float(match.group("value"))
    parsed = []
    seen: set[str] = set()
    page = 1
    line_no = 0
    for raw in text.splitlines():
        stripped = raw.strip()
        mark = PAGE_MARK.match(stripped)
        if mark:
            page = int(mark.group(1))
            line_no = 0
            continue
        line_no += 1
        if not stripped or PREVIOUS.match(stripped):
            continue
        row = _parse_line(stripped)
        if not row:
            continue
        key = row["test_name"].lower()
        if key in seen:
            continue
        seen.add(key)
        row["source_page"] = page
        row["source_line"] = line_no
        row["source_text"] = stripped
        row["previous_value"] = previous.get(key)
        row["previous_unit"] = row["unit"] or None
        parsed.append(row)
    return parsed


UNIT = (
    r"(?:microIU/mL|micro g/dL|million/cmm|mmol/L|mm/1hr|mg/dL|ng/mL|mg/mL|pg/mL|g/dL|U/L|IU/L|g/L|/cmm|fL|pg|%)"
)
NAME = r"[A-Za-z][A-Za-z0-9.,/()+\- ]{1,80}?"
RESULT_LAST = re.compile(
    rf"^(?P<name>{NAME})(?:\s+(?P<flag>[HHL]))?\s+(?P<unit>{UNIT})\s+"
    rf"(?P<low>\d+(?:\.\d+)?)\s*-\s*(?P<high>\d+(?:\.\d+)?)(?P<tail>.*)$",
    re.I,
)
RESULT_NO_UNIT = re.compile(
    rf"^(?P<name>{NAME})\s+(?P<low>\d+(?:\.\d+)?)\s*-\s*(?P<blob>\d[\d.]*)\s*$",
    re.I,
)
RESULT_NO_RANGE = re.compile(
    rf"^(?P<name>{NAME})(?:\s+(?P<flag>[HHL]))?\s+(?P<unit>{UNIT})"
    rf"(?P<method>[A-Za-z].*?)\s+(?P<value>\d+(?:\.\d+)?)\s*$",
    re.I,
)


def _parse_line(stripped: str) -> dict | None:
    match = ROW.match(stripped) or LOOSE.match(stripped)
    if match:
        built = _from_named_match(match)
        if built:
            return built
    return _parse_result_last(stripped)


def _from_named_match(match: re.Match) -> dict | None:
    name = _clean_name(match.group("name"))
    if not _usable_name(name):
        return None
    low = match.group("low")
    high = match.group("high")
    unit = (match.group("unit") or "").strip(" .")
    has_range = bool(low and high)
    known = name.lower() in {item.lower() for item in ALIASES.values()} or name in ALIASES.values()
    if not has_range and not known:
        return None
    reference = f"{low} - {high} {unit}".strip() if has_range else ""
    value = _plain_number(match.group("value").replace(",", ""))
    return {"test_name": name, "value": value, "unit": unit, "reference_range": reference}


def _parse_result_last(stripped: str) -> dict | None:
    match = RESULT_LAST.match(stripped)
    if match:
        value = _value_from_tail(match.group("low"), match.group("high"), match.group("tail") or "")
        if value:
            return _row(match.group("name"), value[1], match.group("unit"), match.group("low"), value[0])
    plain_glue = RESULT_NO_UNIT.match(stripped)
    if plain_glue:
        split = _split_glued(plain_glue.group("low"), plain_glue.group("blob"))
        if split and not re.fullmatch(r"0+(?:\.0+)?", split[1]):
            name = plain_glue.group("name")
            unit = ""
            unit_match = re.search(rf"\s+({UNIT})$", name, re.I)
            if unit_match:
                unit = unit_match.group(1)
                name = name[: unit_match.start()].strip()
            return _row(name, split[1], unit, plain_glue.group("low"), split[0])
    plain = RESULT_NO_RANGE.match(stripped)
    if plain and not re.search(r"\d", plain.group("method")):
        return _row(plain.group("name"), plain.group("value"), plain.group("unit"), None, None)
    return None


def _value_from_tail(low: str, high: str, tail: str) -> tuple[str, str] | None:
    tail = tail.strip()
    if re.fullmatch(r"\.\d+", tail):
        split = _split_glued(low, high + tail)
        if split:
            return split[0], _plain_number(split[1])
    found = re.findall(r"\d+(?:\.\d+)?", tail)
    if found:
        return high, _plain_number(found[-1])
    return None


def _split_glued(low: str, blob: str) -> tuple[str, str] | None:
    def is_num(text: str) -> bool:
        return bool(re.fullmatch(r"\d+(?:\.\d+)?", text))

    candidates = []
    for index in range(1, len(blob)):
        left, right = blob[:index], blob[index:]
        if is_num(left) and is_num(right):
            candidates.append((left, right))
    if not candidates:
        return None
    low_value = float(low)

    def places(text: str) -> int:
        return len(text.split(".", 1)[1]) if "." in text else 0

    def rank(pair: tuple[str, str]) -> tuple:
        return (abs(places(low) - places(pair[0])), abs(float(pair[0]) - low_value))

    return min(candidates, key=rank)


def _row(name: str, value: str, unit: str, low: str | None, high: str | None) -> dict | None:
    cleaned = _clean_name(name)
    if not _usable_name(cleaned):
        return None
    reference = f"{low} - {high} {unit}".strip() if low and high else ""
    return {
        "test_name": cleaned,
        "value": _plain_number(value.replace(",", "")),
        "unit": unit,
        "reference_range": reference,
    }


def _usable_name(name: str) -> bool:
    key = name.lower().strip()
    if not key or key in STOP:
        return False
    if any(word in key for word in ("printed", "approved", "registration", "collected", "page", "doctor")):
        return False
    return True


def _plain_number(value: str) -> str:
    if re.fullmatch(r"0+\d+", value):
        return str(int(value))
    return value


def _clean_name(name: str) -> str:
    cleaned = " ".join(re.sub(r"\([^)]*\)", " ", name).split())
    key = cleaned.lower().strip(" .:-")
    if key in ALIASES:
        return ALIASES[key]
    return cleaned
