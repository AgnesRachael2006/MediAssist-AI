"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Stethoscope, HeartPulse } from "lucide-react";
import { signup } from "@/lib/api";
import { setSession } from "@/lib/session";
import { BrandLogo } from "@/components/brand/BrandLogo";
import type { UserRole } from "@/lib/types";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState<UserRole>("doctor");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const session = await signup({ fullName, email, password, role });
      setSession(session);
      router.push(role === "doctor" ? "/doctor" : "/patient");
    } catch {
      setError("Unable to create account. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-lg">
        <BrandLogo />
        <p className="mt-2 text-sm text-slate-500">
          Human-centered AI for safer clinical decisions
        </p>
        <form
          onSubmit={onSubmit}
          className="mt-8 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-slate-900">Create account</h1>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-800">
              Demo Mode
            </span>
          </div>
          <label className="block text-sm font-medium text-slate-700">
            Full Name
            <input
              required
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-indigo-200 focus:ring-2"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-indigo-200 focus:ring-2"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Password
            <input
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-indigo-200 focus:ring-2"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Confirm Password
            <input
              required
              type="password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-indigo-200 focus:ring-2"
            />
          </label>
          <fieldset>
            <legend className="text-sm font-medium text-slate-700">Role</legend>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setRole("doctor")}
                className={`rounded-2xl border p-4 text-left ${
                  role === "doctor"
                    ? "border-indigo-300 bg-indigo-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <Stethoscope size={18} className="text-indigo-700" />
                <p className="mt-2 text-sm font-semibold text-slate-900">Doctor</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Access clinical review and AI-assisted decision tools.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setRole("patient")}
                className={`rounded-2xl border p-4 text-left ${
                  role === "patient"
                    ? "border-indigo-300 bg-indigo-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <HeartPulse size={18} className="text-indigo-700" />
                <p className="mt-2 text-sm font-semibold text-slate-900">Patient</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Understand your health reports in simple language.
                </p>
              </button>
            </div>
          </fieldset>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-indigo-700 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {busy ? "Creating account..." : "Create Account"}
          </button>
          <p className="text-sm text-slate-600">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-indigo-700 hover:underline">
              Login
            </Link>
          </p>
          <p className="text-xs text-slate-500">
            Mock authentication for the hackathon. Structure is ready for Supabase later.
          </p>
        </form>
      </div>
    </div>
  );
}
