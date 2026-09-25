-- MediAssist schema for Supabase.
-- Run this in the Supabase SQL editor on an empty project.
-- FastAPI uses the service-role key. Do not put that key in the Next.js app.
-- If you already created an older version of these tables, drop them before running this file.

create table if not exists doctors (
  id text primary key,
  name text not null,
  title text,
  specialty text,
  email text unique not null
);

create table if not exists patients (
  id text primary key,
  name text not null,
  age int,
  sex text,
  email text unique not null,
  mrn text unique
);

create table if not exists users (
  id text primary key,
  email text unique not null,
  password_hash text not null,
  role text not null check (role in ('doctor', 'patient')),
  full_name text not null,
  profile_id text not null
);

create table if not exists reports (
  id text primary key,
  patient_id text not null references patients(id),
  doctor_id text not null references doctors(id),
  title text not null,
  type text,
  file_name text,
  uploaded_at timestamptz not null default now(),
  processing_status text not null default 'processing',
  is_synthetic boolean not null default true,
  notes text,
  extracted_text text
);

create table if not exists ai_findings (
  id text primary key,
  report_id text not null references reports(id) on delete cascade,
  test_name text not null,
  value text not null,
  unit text,
  reference_range text,
  source_page int,
  source_line int,
  source_text text,
  ai_draft text,
  gemini_rewrite text,
  jev jsonb not null,
  checks jsonb not null,
  teach jsonb not null default '{"bullets":[]}'::jsonb,
  overclaim_detail jsonb,
  previous_value numeric,
  previous_unit text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists doctor_reviews (
  id text primary key,
  finding_id text not null references ai_findings(id) on delete cascade,
  doctor_id text references doctors(id),
  doctor_decision text not null,
  doctor_final_text text,
  doctor_final_text_ta text,
  doctor_final_text_kn text,
  reject_reason text,
  decided_at timestamptz not null default now()
);

create table if not exists approved_findings (
  id text primary key,
  finding_id text not null unique references ai_findings(id) on delete cascade,
  patient_visible boolean not null default false,
  approved_text text,
  approved_text_ta text,
  approved_text_kn text
);

create table if not exists visits (
  id text primary key,
  patient_id text not null references patients(id),
  visit_date date,
  label text,
  report_id text,
  file_name text,
  summary text
);

create table if not exists observations (
  id text primary key,
  patient_id text not null references patients(id),
  visit_id text references visits(id),
  report_id text,
  test_name text not null,
  value numeric,
  unit text,
  observed_on date,
  file_name text,
  source_page int,
  source_line int,
  source_text text
);

create table if not exists allergies (
  id text primary key,
  patient_id text not null references patients(id),
  substance text not null,
  source text,
  recorded_at date,
  claim text not null,
  patient_visible boolean not null default false
);

create table if not exists medication_checks (
  id text primary key,
  patient_id text not null references patients(id),
  medication text not null,
  allergy text,
  interaction text,
  evidence text,
  status text not null,
  doctor_decision text not null,
  why text[] not null default '{}',
  patient_visible boolean not null default false,
  decided_at timestamptz
);

create table if not exists record_shares (
  id text primary key,
  patient_id text not null references patients(id),
  shared_with_doctor_id text not null references doctors(id),
  access_token text not null unique,
  permissions text[] not null,
  expires_at timestamptz not null,
  purpose text,
  status text not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table if not exists clinical_handoffs (
  id text primary key,
  patient_id text not null references patients(id),
  created_by text not null,
  assigned_to text not null,
  reason text not null,
  summary text not null,
  ai_summary text,
  status text not null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  closed_at timestamptz
);

create table if not exists audit_events (
  id text primary key,
  report_id text,
  finding_id text,
  actor text not null,
  actor_kind text not null,
  action text not null,
  detail text,
  created_at timestamptz not null default now()
);

create table if not exists data_quality_events (
  id text primary key,
  patient_id text not null references patients(id),
  code text not null,
  detail text not null,
  created_at timestamptz not null default now()
);

create index if not exists ai_findings_report_idx on ai_findings(report_id);
create index if not exists reports_patient_idx on reports(patient_id);
create index if not exists observations_patient_idx on observations(patient_id, test_name);
create index if not exists shares_token_idx on record_shares(access_token);
create index if not exists audit_report_idx on audit_events(report_id);
