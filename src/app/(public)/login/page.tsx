"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/portal";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (!data.session) {
      setError("Login succeeded but no session was created. Please try again.");
      setLoading(false);
      return;
    }

    setLoading(false);
    router.replace(redirectTo);
    router.refresh();
  }

  return (
    <main className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[1fr_0.9fr]">
      <section className="rounded-3xl bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--wb-navy)]">
          Organisation access
        </p>
        <h1 className="font-display mt-3 text-3xl">Log in to WhiteBox</h1>
        <p className="mt-3 text-sm text-slate-600">
          Access organisation reports, procedures, and secure communications.
        </p>
        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input
              type="email"
              name="email"
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
              autoComplete="email"
              required
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Password
            <input
              type="password"
              name="password"
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
              autoComplete="current-password"
              required
            />
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            className="w-full rounded-full bg-[var(--wb-navy)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--wb-cobalt)] disabled:opacity-60"
            type="submit"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Continue"}
          </button>
          <button
            type="button"
            className="w-full rounded-full border border-slate-200 px-4 py-3 text-sm text-slate-700"
          >
            Forgot your password?
          </button>
        </form>
      </section>
      <aside className="rounded-3xl border border-white/80 bg-gradient-to-br from-white via-[var(--wb-mist)] to-white p-8 shadow-sm">
        <div className="rounded-2xl bg-[var(--wb-navy)] p-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
            Secure collaboration
          </p>
          <p className="mt-3 text-lg">
            Coordinate actions, maintain evidence, and keep stakeholders informed.
          </p>
        </div>
        <div className="mt-6 space-y-4 text-sm text-slate-600">
          <div className="flex items-start gap-3">
            <span className="mt-1 h-2 w-2 rounded-full bg-[var(--wb-cobalt)]" />
            <p>Visibility rules enforce consent-aware access.</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="mt-1 h-2 w-2 rounded-full bg-[var(--wb-cobalt)]" />
            <p>Deadline reminders keep procedures on schedule.</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="mt-1 h-2 w-2 rounded-full bg-[var(--wb-cobalt)]" />
            <p>Audit-ready trail stored for two years.</p>
          </div>
        </div>
      </aside>
    </main>
  );
}
