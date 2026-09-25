-- Run once in the Supabase SQL editor after schema.sql.
-- Adds the longitudinal care tables. Existing tables are not recreated.

alter table patients add column if not exists preferred_language text not null default 'en';

create table if not exists medications (
  id text primary key,
  patient_id text not null references patients(id),
  doctor_id text not null references doctors(id),
  name text not null,
  dosage text,
  frequency text,
  route text,
  start_date date,
  end_date date,
  instructions text,
  status text not null default 'active',
  approved_by_doctor boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists medication_reminders (
  id text primary key,
  medication_id text not null references medications(id) on delete cascade,
  patient_id text not null references patients(id),
  reminder_time text not null,
  frequency text not null default 'daily',
  status text not null default 'scheduled',
  last_triggered_at timestamptz
);

create table if not exists appointments (
  id text primary key,
  patient_id text not null references patients(id),
  doctor_id text not null references doctors(id),
  specialty text,
  appointment_date date not null,
  appointment_time text not null,
  reason text,
  status text not null default 'REQUESTED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists follow_up_recommendations (
  id text primary key,
  patient_id text not null references patients(id),
  doctor_id text not null references doctors(id),
  reason text not null,
  recommended_specialty text,
  status text not null default 'draft',
  patient_visible boolean not null default false,
  created_at timestamptz not null default now()
);

insert into medications (id, patient_id, doctor_id, name, dosage, frequency, route, start_date, instructions, status, approved_by_doctor)
values (
  'med-demo-1', 'patient-arun', 'doctor-2', 'Demo tablet', '1 tablet', '08:00 and 20:00', 'oral', '2026-09-01',
  'Synthetic demo medication. Not a prescription.', 'active', true
) on conflict (id) do nothing;

insert into medication_reminders (id, medication_id, patient_id, reminder_time, frequency, status)
values
  ('rem-demo-am', 'med-demo-1', 'patient-arun', '08:00', 'daily', 'scheduled'),
  ('rem-demo-pm', 'med-demo-1', 'patient-arun', '20:00', 'daily', 'scheduled')
on conflict (id) do nothing;

insert into appointments (id, patient_id, doctor_id, specialty, appointment_date, appointment_time, reason, status)
values (
  'appt-demo-1', 'patient-arun', 'doctor-2', 'Internal Medicine', '2026-10-02', '10:30',
  'Follow-up review of recent laboratory reports', 'REQUESTED'
) on conflict (id) do nothing;

insert into follow_up_recommendations (id, patient_id, doctor_id, reason, recommended_specialty, status, patient_visible)
values (
  'rec-demo-1', 'patient-arun', 'doctor-2',
  'Your doctor recommends a follow-up consultation.',
  'General Medicine', 'approved', true
) on conflict (id) do nothing;
