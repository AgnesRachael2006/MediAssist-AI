import type {
  ApprovedExplanation,
  AskResult,
  FindingCard,
  QuestionClass,
  RewriteStyle,
} from "./types";

const BLOCKED_WORDING = [/leukemia/i, /cancer/i, /diagnos/i, /\byou have\b/i, /anemia/i];

function hasDiagnosticClaim(text: string) {
  const withoutDisclaimer = text.replace(/\bnot a diagnosis\b\.?/gi, "");
  return BLOCKED_WORDING.some((pattern) => pattern.test(withoutDisclaimer));
}

export function assertPublishable(text: string, finding: FindingCard) {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Approved wording cannot be empty.");
  }
  if (!finding.checks.source_found || !finding.source.excerpt || !finding.source.page || !finding.source.line_start) {
    throw new Error("Approval is disabled because this finding has no pinned source.");
  }
  if (!finding.checks.reference_available || !finding.reference_range.trim()) {
    throw new Error("Approval is disabled because the reference range is missing.");
  }
  if (!finding.jev || finding.jev.evidence === "insufficient") {
    throw new Error("Approval is disabled because Jev marked the evidence insufficient.");
  }
  if (finding.jev.overclaim && trimmed === (finding.ai_draft ?? "").trim()) {
    throw new Error(
      "Policy blocked publication of an overclaim draft. Edit the wording or reject the card.",
    );
  }
  if (hasDiagnosticClaim(trimmed)) {
    throw new Error("Policy blocked diagnostic wording. Remove it before publishing.");
  }
}

export function rewriteFromStructure(finding: FindingCard, style: RewriteStyle) {
  const within = finding.checks.outside_range
    ? "below the reference range supplied on this report"
    : "within the reference range supplied on this report";
  const safe = finding.checks.outside_range
    ? `Your ${finding.test_name.toLowerCase()} level is below the reference range provided in the report.`
    : `Your ${finding.test_name.toLowerCase()} level is within the reference range provided in the report.`;
  if (style === "patient_friendly") return safe;
  const base = `${finding.test_name} is ${finding.value} ${finding.unit}, which is ${within}.`;
  if (style === "concise") return base;
  if (style === "formal") {
    return `${base} This wording describes the printed result only.`;
  }
  const previous =
    finding.previous_value === null
      ? " A previous result was not included with this file."
      : ` The previous recorded value was ${finding.previous_value} ${finding.previous_unit ?? finding.unit}.`;
  return `${base}${previous} This is not a diagnosis.`;
}

const TAMIL_SENTENCES: Record<string, string> = {
  "Value is below the reference range provided in this report.":
    "இந்த அறிக்கையில் கொடுக்கப்பட்ட குறிப்பு வரம்பை விட இந்த மதிப்பு குறைவாக உள்ளது.",
  "Value is within the reference range provided in this report.":
    "இந்த மதிப்பு இந்த அறிக்கையில் கொடுக்கப்பட்ட குறிப்பு வரம்பிற்குள் உள்ளது.",
  "Value is within the reference range printed on this report. A previous result was not included with this file.":
    "இந்த மதிப்பு அறிக்கையில் அச்சிடப்பட்ட குறிப்பு வரம்பிற்குள் உள்ளது. முந்தைய முடிவு இந்த கோப்புடன் இணைக்கப்படவில்லை.",
};

const KANNADA_SENTENCES: Record<string, string> = {
  "Value is below the reference range provided in this report.":
    "ಈ ಮೌಲ್ಯವು ಈ ವರದಿಯಲ್ಲಿ ನೀಡಿದ ಉಲ್ಲೇಖ ವ್ಯಾಪ್ತಿಗಿಂತ ಕಡಿಮೆಯಿದೆ.",
  "Value is within the reference range provided in this report.":
    "ಈ ಮೌಲ್ಯವು ಈ ವರದಿಯಲ್ಲಿ ನೀಡಿದ ಉಲ್ಲೇಖ ವ್ಯಾಪ್ತಿಯೊಳಗಿದೆ.",
  "Your hemoglobin level is below the reference range provided in the report.":
    "ನಿಮ್ಮ ಹಿಮೋಗ್ಲೋಬಿನ್ ಮಟ್ಟವು ವರದಿಯಲ್ಲಿ ನೀಡಿದ ಉಲ್ಲೇಖ ವ್ಯಾಪ್ತಿಗಿಂತ ಕಡಿಮೆಯಿದೆ.",
  "Your mcv level is below the reference range provided in the report.":
    "ನಿಮ್ಮ ಎಂಸಿವಿ ಮಟ್ಟವು ವರದಿಯಲ್ಲಿ ನೀಡಿದ ಉಲ್ಲೇಖ ವ್ಯಾಪ್ತಿಗಿಂತ ಕಡಿಮೆಯಿದೆ.",
  "Your platelets level is below the reference range provided in the report.":
    "ನಿಮ್ಮ ಪ್ಲೇಟ್‌ಲೆಟ್ ಮಟ್ಟವು ವರದಿಯಲ್ಲಿ ನೀಡಿದ ಉಲ್ಲೇಖ ವ್ಯಾಪ್ತಿಗಿಂತ ಕಡಿಮೆಯಿದೆ.",
};

export function translateApprovedKannada(text: string, finding: FindingCard) {
  const known = KANNADA_SENTENCES[text.trim()];
  if (known) return known;
  const position = finding.checks.outside_range
    ? "ನೀಡಿದ ಉಲ್ಲೇಖ ವ್ಯಾಪ್ತಿಗಿಂತ ಕಡಿಮೆಯಿದೆ"
    : "ನೀಡಿದ ಉಲ್ಲೇಖ ವ್ಯಾಪ್ತಿಯೊಳಗಿದೆ";
  const previous =
    finding.previous_value === null
      ? "ಹಿಂದಿನ ಫಲಿತಾಂಶ ಈ ವರದಿಯಲ್ಲಿಲ್ಲ."
      : `ಹಿಂದಿನ ದಾಖಲೆ ${finding.previous_value} ${finding.previous_unit ?? finding.unit}.`;
  return `${finding.test_name} ಮೌಲ್ಯ ${finding.value} ${finding.unit}. ಉಲ್ಲೇಖ ವ್ಯಾಪ್ತಿ ${finding.reference_range}. ಈ ಮೌಲ್ಯ ${position}. ${previous} ಇದು ರೋಗನಿರ್ಣಯವಲ್ಲ.`;
}

export function translateApproved(text: string, finding: FindingCard) {
  const known = TAMIL_SENTENCES[text.trim()];
  if (known) return known;
  const position = finding.checks.outside_range
    ? "கொடுக்கப்பட்ட குறிப்பு வரம்பை விட குறைவாக உள்ளது"
    : "கொடுக்கப்பட்ட குறிப்பு வரம்பிற்குள் உள்ளது";
  const previous =
    finding.previous_value === null
      ? "முந்தைய முடிவு இந்த அறிக்கையில் இல்லை."
      : `முந்தைய பதிவு ${finding.previous_value} ${finding.previous_unit ?? finding.unit}.`;
  return `${finding.test_name} மதிப்பு ${finding.value} ${finding.unit}. குறிப்பு வரம்பு ${finding.reference_range}. இந்த மதிப்பு ${position}. ${previous} இது ஒரு நோயறிதல் அல்ல.`;
}

export function toApprovedExplanation(
  reportId: string,
  title: string,
  doctorName: string,
  findings: FindingCard[],
): ApprovedExplanation | null {
  const visible = findings.filter(
    (finding) =>
      finding.report_id === reportId &&
      finding.patient_visible === true &&
      finding.doctor_decision !== "rejected" &&
      Boolean(finding.final_text),
  );
  if (visible.length === 0) return null;

  const reviewedAt = visible
    .map((finding) => finding.decided_at)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null;
  const names = visible.map((finding) => finding.test_name).join(", ");
  const missing = visible.filter(
    (finding) => finding.jev.triage === "insufficient" || !finding.checks.previous_available,
  );
  const missingText = missing.length
    ? missing
        .map((finding) => `${finding.test_name}: ${finding.final_text}`)
        .join(" ")
    : "Your doctor did not publish a missing-information note for this report.";
  const missingTa = missing.length
    ? missing.map((finding) => `${finding.test_name}: ${finding.final_text_ta ?? ""}`).join(" ")
    : "இந்த அறிக்கைக்கு விடுபட்ட தகவல் குறிப்பு எதுவும் வெளியிடப்படவில்லை.";
  const missingKn = missing.length
    ? missing
        .map(
          (finding) =>
            `${finding.test_name}: ${finding.final_text_kn || translateApprovedKannada(finding.final_text as string, finding)}`,
        )
        .join(" ")
    : "ಈ ವರದಿಗೆ ಕಾಣೆಯಾದ ಮಾಹಿತಿಯ ಟಿಪ್ಪಣಿ ಪ್ರಕಟವಾಗಿಲ್ಲ.";

  const results = visible.map((finding) => ({
    test_name: finding.test_name,
    text: finding.final_text as string,
    text_ta: finding.final_text_ta || translateApproved(finding.final_text as string, finding),
    text_kn: finding.final_text_kn || translateApprovedKannada(finding.final_text as string, finding),
  }));

  const voice = [
    "Here is your doctor-approved explanation.",
    `Tests with an approved note: ${names}.`,
    ...results.map((item) => `${item.test_name}. ${item.text}`),
    missingText,
    "You can discuss these results with the doctor who reviewed your report.",
    "This is not a diagnosis.",
  ].join(" ");

  const voiceTa = [
    "இது உங்கள் மருத்துவர் அங்கீகரித்த விளக்கம்.",
    ...results.map((item) => `${item.test_name}. ${item.text_ta}`),
    missingTa,
    "இதை உங்கள் அறிக்கையை பரிசீலித்த மருத்துவரிடம் விவாதிக்கவும்.",
    "இது ஒரு நோயறிதல் அல்ல.",
  ].join(" ");

  const voiceKn = [
    "ಇದು ನಿಮ್ಮ ವೈದ್ಯರು ಅನುಮೋದಿಸಿದ ವಿವರಣೆ.",
    ...results.map((item) => `${item.test_name}. ${item.text_kn}`),
    missingKn,
    "ಇದನ್ನು ನಿಮ್ಮ ವರದಿಯನ್ನು ಪರಿಶೀಲಿಸಿದ ವೈದ್ಯರೊಂದಿಗೆ ಚರ್ಚಿಸಿ.",
    "ಇದು ರೋಗನಿರ್ಣಯವಲ್ಲ.",
  ].join(" ");

  return {
    report_id: reportId,
    title,
    doctor_name: doctorName,
    reviewed_at: reviewedAt,
    notice: "This is not a diagnosis.",
    notice_ta: "இது ஒரு நோயறிதல் அல்ல.",
    notice_kn: "ಇದು ರೋಗನಿರ್ಣಯವಲ್ಲ.",
    what_was_checked: `Your doctor approved notes for ${names}.`,
    what_was_checked_ta: `உங்கள் மருத்துவர் ${names} குறித்த விளக்கத்தை அங்கீகரித்தார்.`,
    what_was_checked_kn: `ನಿಮ್ಮ ವೈದ್ಯರು ${names} ಕುರಿತ ಟಿಪ್ಪಣಿಯನ್ನು ಅನುಮೋದಿಸಿದ್ದಾರೆ.`,
    results,
    what_was_missing: missingText,
    what_was_missing_ta: missingTa,
    what_was_missing_kn: missingKn,
    discuss: "Discuss these approved notes with the doctor who reviewed your report.",
    discuss_ta: "இந்த அங்கீகரிக்கப்பட்ட குறிப்புகளை உங்கள் அறிக்கையை பரிசீலித்த மருத்துவரிடம் விவாதிக்கவும்.",
    discuss_kn: "ಈ ಅನುಮೋದಿತ ಟಿಪ್ಪಣಿಗಳನ್ನು ನಿಮ್ಮ ವರದಿಯನ್ನು ಪರಿಶೀಲಿಸಿದ ವೈದ್ಯರೊಂದಿಗೆ ಚರ್ಚಿಸಿ.",
    voice_script: voice,
    voice_script_ta: voiceTa,
    voice_script_kn: voiceKn,
  };
}

const BLOCKED_ANSWER =
  "This question requires discussion with your doctor. MediAssist does not provide diagnosis or treatment instructions.";

export function classifyQuestion(question: string): QuestionClass {
  const text = question.trim();
  if (/leukemia|cancer|diabetes|dengue|do i have|is this|diagnos|disease|tumou?r/i.test(text)) {
    return "diagnosis_request";
  }
  if (/dose|dosage|twice a day|\bmg\b|how much.*take|prescri/i.test(text)) return "medication_dose";
  if (/should i take|treat|medicine|therapy|antibiotic/i.test(text)) return "treatment_request";
  if (/emergency|\ber\b|chest pain|suicid|call ambulance/i.test(text)) return "emergency_decision";
  if (/last report|previous|different|compare|change|last time|lower than|higher than/i.test(text)) return "compare_history";
  if (/what is|what does|mean|mcv|hemoglobin|wbc|platelet|glucose/i.test(text)) return "explain_term";
  if (/my result|my value|this report|approved/i.test(text)) return "explain_approved_content";
  if (/result|value|range/i.test(text)) return "explain_value";
  return "unsupported_question";
}

export function answerQuestion(
  question: string,
  explanation: ApprovedExplanation | null,
  trends: { metric: string; unit: string; points: { value: number }[] }[],
): AskResult {
  const classification = classifyQuestion(question);
  const blocked =
    classification === "diagnosis_request" ||
    classification === "medication_dose" ||
    classification === "treatment_request" ||
    classification === "emergency_decision" ||
    classification === "unsupported_question";
  if (blocked) {
    return {
      classification,
      allowed: false,
      status_label: "Doctor discussion required",
      answer: BLOCKED_ANSWER,
    };
  }

  if (classification === "compare_history") {
    const matched = trends.find((series) => question.toLowerCase().includes(series.metric.toLowerCase()));
    const series = matched ?? trends[0];
    const approvedHb = explanation?.results.find((item) => /hemoglobin/i.test(item.test_name));
    if (!series || series.points.length < 2 || !approvedHb) {
      return {
        classification,
        allowed: true,
        status_label: "Educational question",
        answer:
          "A comparison will appear here after your doctor publishes the related note. Please discuss unpublished results with your doctor.",
      };
    }
    const current = series.points[series.points.length - 1].value;
    const previous = series.points[series.points.length - 2].value;
    const delta = Math.round((current - previous) * 10) / 10;
    const word = delta < 0 ? "decreased" : delta > 0 ? "increased" : "stayed the same";
    const amount = delta === 0 ? "" : ` by ${Math.abs(delta)} ${series.unit}`;
    return {
      classification,
      allowed: true,
      status_label: "Educational question",
      answer: `Your ${series.metric.toLowerCase()} ${word}${amount} from the previous recorded value. ${approvedHb.text} This is not a diagnosis.`,
    };
  }

  if (/mcv/i.test(question)) {
    const note = explanation?.results.find((item) => item.test_name === "MCV");
    return {
      classification,
      allowed: true,
      status_label: "Educational question",
      answer: note
        ? `MCV is the average size of red blood cells printed on a blood count. ${note.text} This is not a diagnosis.`
        : "MCV means mean corpuscular volume, the average size of red blood cells on a blood count. Your doctor has not published an MCV note yet. This is not a diagnosis.",
    };
  }

  if (/hemoglobin|hb\b/i.test(question)) {
    const note = explanation?.results.find((item) => /hemoglobin/i.test(item.test_name));
    return {
      classification,
      allowed: true,
      status_label: "Educational question",
      answer: note
        ? `Hemoglobin is a protein in red blood cells that carries oxygen. ${note.text} This is not a diagnosis.`
        : "Hemoglobin is a protein in red blood cells that carries oxygen. Your doctor has not published a hemoglobin note yet. This is not a diagnosis.",
    };
  }

  if (explanation && explanation.results.length > 0 && classification !== "explain_term") {
    return {
      classification,
      allowed: true,
      status_label: "Educational question",
      answer: `${explanation.results.map((item) => `${item.test_name}: ${item.text}`).join(" ")} This is not a diagnosis.`,
    };
  }

  return {
    classification: "explain_term",
    allowed: true,
    status_label: "Educational question",
    answer:
      "I can explain a term such as hemoglobin, MCV, WBC, platelets, or glucose. I cannot diagnose or recommend a medicine. Your doctor publishes the report wording you can rely on.",
  };
}

export function trendSentence(metric: string, unit: string, current: number, previous: number) {
  const delta = Math.round((current - previous) * 10) / 10;
  if (delta === 0) {
    return `Your ${metric.toLowerCase()} is unchanged from the previous recorded value.`;
  }
  const direction = delta < 0 ? "decreased" : "increased";
  return `Your ${metric.toLowerCase()} ${direction} by ${Math.abs(delta)} ${unit} from the previous recorded value.`;
}
