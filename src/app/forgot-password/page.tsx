import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <BrandLogo />
        <h1 className="mt-6 text-lg font-semibold text-slate-900">Forgot Password?</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          In demo mode, passwords are not verified for the listed demo emails. Use any password
          with a demo account, or create a new account on Sign Up. Real reset email flow will
          connect through Supabase later.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-medium text-white"
        >
          Back to Login
        </Link>
      </div>
    </div>
  );
}
