# MediAssist AI

Human-centered clinical intelligence prototype (hackathon). Synthetic data only. Not a medical device.

## Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Demo password: any value. There is no role switcher. The account email decides the destination.

- Doctor: `sarah.wilson@mediassist.demo` → `/doctor`
- Patient: `arun.kumar@mediassist.demo` → `/patient`

Sign up at `/signup` stores a mock account in the browser so Supabase can replace it later.

## Demo flow

1. Open Login and show Sign Up.
2. Login as the doctor demo.
3. Open Reports and choose Use Demo Report.
4. Review the original report, AI clinical insight, evidence, and AI ↔ Doctor Cross-Check.
5. Accept, edit, or reject. The audit trail records the decision.
6. Logout and login as the patient demo.
7. Open the doctor-reviewed explanation, play the voice summary, ask what a term means, then open Health Trends and Health Timeline.

Connect FastAPI later with `NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_API_MODE=live`. Keep Gemini and other model keys on the backend. The browser never calls the model directly.
