"use client";

import { useEffect, useState } from "react";
import SectionCard from "@/components/portal/SectionCard";
import { supabase } from "@/lib/supabase/client";

export default function AccountSecurityPage() {
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? "");
    });
  }, []);

  const updatePassword = async () => {
    setError(null);
    setSuccess(null);
    if (!email) {
      setError("Please log in to update your password.");
      return;
    }
    if (newPassword.trim().length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSaving(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (signInError) throw signInError;

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) throw updateError;
      setCurrentPassword("");
      setNewPassword("");
      setSuccess("Password updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <SectionCard title="2FA Authentication" description="Enable MFA to secure admin accounts.">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500">Enter your password</label>
            <input
              type="password"
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </div>
          <button
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
            disabled
          >
            2FA setup coming soon
          </button>
        </div>
      </SectionCard>
      <SectionCard title="Change password" description="Update account credentials regularly.">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500">Current password</label>
            <input
              type="password"
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">New password</label>
            <input
              type="password"
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </div>
          <button
            className="rounded-full bg-[var(--wb-cobalt)] px-4 py-2 text-xs font-semibold text-white"
            onClick={updatePassword}
            disabled={saving}
          >
            Change password
          </button>
        </div>
      </SectionCard>
      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600">
          {success}
        </p>
      ) : null}
    </div>
  );
}
