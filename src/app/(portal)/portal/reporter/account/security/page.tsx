"use client";

import { useEffect, useState } from "react";
import SectionCard from "@/components/portal/SectionCard";
import { supabase } from "@/lib/supabase/client";

export default function ReporterSecurityPage() {
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!isMounted) return;
      setEmail(data.user?.email ?? "");
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const updatePassword = async () => {
    setError(null);
    setStatus(null);
    if (!currentPassword.trim() || !newPassword.trim()) {
      setError("Enter your current and new password.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (!email) {
      setError("Please log in to update your password.");
      return;
    }
    setIsSaving(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (signInError) throw new Error("Current password is incorrect.");

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) throw updateError;
      setCurrentPassword("");
      setNewPassword("");
      setStatus("Password updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update password.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <SectionCard title="Change password" description="Update your login credentials.">
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
            type="button"
            className="rounded-full bg-[var(--wb-cobalt)] px-4 py-2 text-xs font-semibold text-white"
            onClick={updatePassword}
            disabled={isSaving}
          >
            Change password
          </button>
          {error ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-600">
              {error}
            </p>
          ) : null}
          {status ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-600">
              {status}
            </p>
          ) : null}
        </div>
      </SectionCard>
    </div>
  );
}
