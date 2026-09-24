# MediAssist AI

Human-centered clinical intelligence prototype (hackathon). Synthetic data only. Not a medical device.

## Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Demo password: any value. Login has no role switcher.

- Doctor: `priya.nair@mediassist.demo` → `/doctor`
- Patient: `arun.kumar@mediassist.demo` → `/patient`

## Demo flow

1. Sign in as Dr. Priya. The queue shows 14 rows extracted, 3 need review, 11 routine normal.
2. Open CBC Report. Select Hemoglobin. The source line on page 2 is highlighted.
3. Open Why was this flagged? Edit the draft, then Save & Approve.
4. Reject the WBC card (the overclaim). Accept the MCV card.
5. Open Audit Trail and show the three decisions.
6. Log out and sign in as Arun. Only approved wording is visible. Switch English / Tamil, then Listen.
7. In Ask MediAssist, ask “Is this leukemia?”. The question is blocked.

Set `NEXT_PUBLIC_API_MODE=live` and `NEXT_PUBLIC_API_URL` when FastAPI is ready. Gemini keys stay on the server.
