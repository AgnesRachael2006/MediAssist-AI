# MediAssist API

FastAPI service for the MediAssist frontend. Gemini is called only from this folder. Supabase holds the records. Jev is deterministic Python and does not call a model.

## 1. Create the Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run `backend/sql/schema.sql`.
3. In **Project Settings → API**, copy:
   - Project URL
   - `service_role` key

Use the service role key only in this backend. Do not put it in Next.js, and do not use the anon key for these server routes.

## 2. Add the Gemini key

1. Create a key at [Google AI Studio](https://aistudio.google.com/apikey).
2. Copy `backend/.env.example` to `backend/.env`.
3. Set:

```env
GEMINI_API_KEY=the-key-from-ai-studio
GEMINI_MODEL=gemini-2.5-flash
```

Leave `GEMINI_API_KEY` empty if you want the demo to run without Gemini. Extraction, Jev review, and doctor decisions still work. Drafts then come from `app/jev.py`. The hemoglobin row keeps the teach-mode overclaim sentence so Accept stays blocked until a doctor edits it. Every other row uses the fixed safe sentence.

The key is read only by `app/gemini_client.py`. It is sent to Google as a server-side request. It is never returned by `/health` or `/system/status`.

## 3. Run the API

From the `backend` folder:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python -m app.seed
uvicorn app.main:app --reload --port 8000
```

On macOS or Linux, activate with `source .venv/bin/activate`.

Demo sign-in, after seeding:

| Email | Password |
| --- | --- |
| priya.nair@mediassist.demo | demo |
| arun.kumar@mediassist.demo | demo |
| rahul.menon@mediassist.demo | demo |

`DEMO_ALLOW_ANY_PASSWORD=true` also accepts any non-empty password for those `@mediassist.demo` emails. Set it to `false` before a real deployment.

## 4. Point the frontend at the API

In the project root `.env.local`:

```env
NEXT_PUBLIC_API_MODE=live
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Do not add `GEMINI_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`.

Restart `npm run dev`. Login then calls `POST /auth/login` and stores the returned token. Later requests send `Authorization: Bearer ...`.

## What the server enforces

- A patient only receives approved finding text.
- A doctor who is not the treating doctor and does not hold an active share receives 403.
- Expired and revoked share codes are rejected.
- A finding with no source, no reference range, insufficient Jev evidence, or an unchanged overclaim draft cannot be accepted.
- Diagnosis and dose questions are answered locally and are not sent to Gemini.
