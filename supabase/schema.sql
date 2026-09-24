-- MediAssist demo schema. Apply in Supabase when the FastAPI service is connected.
-- The Next.js mock store uses the same separation until NEXT_PUBLIC_API_MODE=live.

create table if not exists ai_findings (
  id text primary key,
  report_id text not null,
  test_name text not null,
  value text not null,
  unit text,
  reference_range text,
  source_page int,
  source_line int,
  source_text text,
  ai_draft text,
  jev_triage text,
  jev_evidence text,
  jev_overclaim boolean,
  jev_reason_codes text[],
  created_at timestamptz
);

create table if not exists doctor_reviews (
  id text primary key,
  finding_id text not null,
  doctor_decision text not null,
  doctor_final_text text,
  doctor_final_text_ta text,
  reject_reason text,
  decided_at timestamptz
);

create table if not exists approved_findings (
  id text primary key,
  finding_id text not null,
  patient_visible boolean not null default false,
  approved_text text,
  approved_text_ta text
);
