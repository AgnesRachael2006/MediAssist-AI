from app.extract import parse_report, read_pdf

REAL_REPORT = """
[[PAGE 1]]
Patient Arun Kumar
Haemoglobin 10.4 g/dL 12.0 - 16.0
Total WBC 8400 cells
Platelet Count 190 x10^3/uL 150 - 450
Age 34 years
""".strip()


def test_result_at_end_of_line_is_the_measured_value():
    text = """
[[PAGE 1]]
Hemoglobin g/dL 13.0 - 16.5Colorimetric 14.5
WBC Count H /cmm 4000 - 10000SF Cube cell analysis 10570
Eosinophils % 1 - 6Microscopic 02
Platelet Count /cmm 150000 - 410000Electrical impedance 150000
T4 - Thyroxine mg/mL 4.87 - 11.727.84
Fasting Blood Sugar H mg/dL 74 - 106GOD-POD 141.0
""".strip()
    rows = {row["test_name"]: row for row in parse_report(text)}
    assert rows["Hemoglobin"]["value"] == "14.5"
    assert rows["Hemoglobin"]["reference_range"].startswith("13.0 - 16.5")
    assert rows["WBC Count"]["value"] == "10570"
    assert rows["Eosinophils"]["value"] == "2"
    assert rows["Platelets"]["value"] == "150000"
    assert rows["T4 - Thyroxine"]["value"] == "7.84"
    assert rows["T4 - Thyroxine"]["reference_range"].startswith("4.87 - 11.72")
    assert rows["Fasting Blood Sugar"]["value"] == "141.0"
    glued = parse_report("Total Iron Binding Capacity (TIBC) 261 - 462352.00\nHb A L % 96.8 - 97.884.4\nCreatinine, Serum mg/dL 0.66 - 1.25Creatinine Amidohydrolase 0.83")
    by_name = {row["test_name"]: row for row in glued}
    assert by_name["Total Iron Binding Capacity"]["value"] == "352.00"
    assert by_name["Total Iron Binding Capacity"]["reference_range"].startswith("261 - 462")
    assert by_name["Hb A"]["value"] == "84.4"
    assert by_name["Hb A"]["reference_range"].startswith("96.8 - 97.8")
    assert by_name["Creatinine, Serum"]["value"] == "0.83"
    assert parse_report("Specific Gravity 1.005 - 1.030") == []


def test_real_report_uses_its_own_values():
    rows = {row["test_name"]: row for row in parse_report(REAL_REPORT)}
    assert rows["Hemoglobin"]["value"] == "10.4"
    assert rows["Hemoglobin"]["source_page"] == 1
    assert rows["Hemoglobin"]["reference_range"].startswith("12.0 - 16.0")
    assert rows["Platelets"]["value"] == "190"
    assert "Age" not in rows
    assert all(row["value"] != "9.8" for row in rows.values())


def _pdf_with_line(text: str) -> bytes:
    parts: list[bytes] = [b"%PDF-1.4\n"]
    offsets = [0]

    def add(data: bytes) -> None:
        parts.append(data)

    def obj(body: bytes) -> None:
        offsets.append(sum(len(part) for part in parts))
        add(f"{len(offsets) - 1} 0 obj\n".encode() + body + b"\nendobj\n")

    stream = f"BT /F1 12 Tf 20 100 Td ({text}) Tj ET".encode()
    obj(b"<< /Type /Catalog /Pages 2 0 R >>")
    obj(b"<< /Type /Pages /Count 1 /Kids [3 0 R] >>")
    obj(b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 200] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>")
    obj(f"<< /Length {len(stream)} >>\nstream\n".encode() + stream + b"\nendstream")
    obj(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    xref = sum(len(part) for part in parts)
    add(b"xref\n0 6\n0000000000 65535 f \n")
    for offset in offsets[1:]:
        add(f"{offset:010d} 00000 n \n".encode())
    add(f"trailer<< /Size 6 /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode())
    return b"".join(parts)


def test_pdf_text_is_what_gets_parsed():
    text = read_pdf(_pdf_with_line("Glucose 110 mg/dL 70 - 99"))
    rows = parse_report(text)
    assert rows[0]["test_name"] == "Glucose"
    assert rows[0]["value"] == "110"
    assert rows[0]["source_page"] == 1
