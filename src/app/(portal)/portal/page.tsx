import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const ROLE_DESTINATIONS: Record<string, string> = {
  organization_owner: "/portal/org",
  independent: "/portal/reporter",
  anonymous: "/portal/reporter",
  system_admin: "/portal/admin",
  admin: "/portal/admin",
  administrator: "/portal/admin",
  "null": "/portal/reporter",
};

export default async function PortalIndexPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/portal");
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("user_type,owned_organization_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const userType = (profile?.user_type ?? "").toString().trim().toLowerCase();
  if (userType === "organization_owner" && profile?.owned_organization_id) {
    const { data: org } = await supabase
      .from("organisations")
      .select("approval_status,is_claimed,account_status")
      .eq("organization_id", profile.owned_organization_id)
      .maybeSingle();
    const approvalStatus = (org?.approval_status ?? (org?.is_claimed ? "approved" : "pending")) as
      | "approved"
      | "pending"
      | "blocked"
      | "removed";
    const accountStatus = (org?.account_status ?? (approvalStatus === "approved" ? "active" : "inactive")) as
      | "active"
      | "inactive";
    if (approvalStatus !== "approved" || accountStatus !== "active") {
      redirect("/portal/org/pending");
    }
  }
  const destination = ROLE_DESTINATIONS[userType];

  if (destination) {
    redirect(destination);
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-5xl flex-col items-center justify-center gap-8 text-center">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">WhiteBox Portal</p>
        <h1 className="mt-3 font-display text-3xl text-slate-900">Choose your workspace</h1>
        <p className="mt-3 text-sm text-slate-600">
          We could not detect a role for this account yet. Choose the portal that matches your
          access.
        </p>
      </div>
      <div className="grid w-full gap-4 md:grid-cols-3">
        <Link
          href="/portal/reporter"
          className="rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Reporter</p>
          <h2 className="mt-3 text-xl font-semibold text-slate-900">Reporter Portal</h2>
          <p className="mt-2 text-sm text-slate-600">
            Track your submitted grievances, follow updates, and share feedback.
          </p>
        </Link>
        <Link
          href="/portal/org"
          className="rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Organisation</p>
          <h2 className="mt-3 text-xl font-semibold text-slate-900">Organisation Portal</h2>
          <p className="mt-2 text-sm text-slate-600">
            Manage investigations, actions, and supply-chain visibility for your teams.
          </p>
        </Link>
        <Link
          href="/portal/admin"
          className="rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">System</p>
          <h2 className="mt-3 text-xl font-semibold text-slate-900">System Admin</h2>
          <p className="mt-2 text-sm text-slate-600">
            Oversee the platform, govern policies, and maintain compliance at scale.
          </p>
        </Link>
      </div>
    </div>
  );
}
