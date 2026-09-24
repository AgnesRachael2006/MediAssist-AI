"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, ShieldCheck, Stethoscope } from "lucide-react";
import { login } from "@/lib/api";
import { setSession } from "@/lib/session";
import { hydrateDemoState } from "@/lib/store";
import { BrandLogo } from "@/components/brand/BrandLogo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      hydrateDemoState();
      const session = await login(email, password);
      setSession(session);
      router.push(session.role === "doctor" ? "/doctor" : "/patient");
    } catch {
      setError("Unable to sign in. Use a demo email or create an account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-indigo-950 px-12 py-16 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.28),transparent_55%)]" />
        <div className="relative">
          <BrandLogo light />
          <h1 className="mt-16 max-w-md text-4xl font-semibold leading-tight">
            AI suggests. Evidence is pinned to the report. The doctor decides. The patient understands.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-indigo-100">
            AI analyzes. The doctor reviews. Patients see only approved information.
          </p>
        </div>
        <div className="relative grid grid-cols-3 gap-3">
          {[
            { icon: Stethoscope, label: "Clinician in control" },
            { icon: ShieldCheck, label: "Review gate" },
            { icon: Activity, label: "Full audit trail" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <Icon size={18} className="text-indigo-200" />
                <p className="mt-3 text-sm font-medium">{item.label}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <BrandLogo />
            <p className="mt-2 text-sm text-slate-500">
              Human-centered AI for safer clinical decisions
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Login</h2>
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-800">
                Demo Mode
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Human-centered AI for safer clinical decisions
            </p>
            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              <div>
                <label htmlFor="email" className="text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-indigo-200 focus:ring-2"
                />
              </div>
              <div>
                <label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-indigo-200 focus:ring-2"
                />
              </div>
              {error ? <p className="text-sm text-red-700">{error}</p> : null}
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-indigo-700 py-2.5 text-sm font-medium text-white hover:bg-indigo-800 disabled:opacity-60"
              >
                {busy ? "Signing in..." : "Login"}
              </button>
            </form>
            <div className="mt-4 flex items-center justify-between text-sm">
              <Link href="/forgot-password" className="font-medium text-indigo-700 hover:underline">
                Forgot Password?
              </Link>
            </div>
            <p className="mt-4 text-sm text-slate-600">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="font-medium text-indigo-700 hover:underline">
                Sign Up
              </Link>
            </p>
            <div className="mt-5 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
              <p className="font-medium text-slate-700">Demo accounts (any password)</p>
              <p className="mt-1">Doctor → priya.nair@mediassist.demo</p>
              <p>Patient → arun.kumar@mediassist.demo</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
