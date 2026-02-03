import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function OrgPendingApprovalPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let orgName = "your organisation";
  let approvalStatus: "pending" | "blocked" | "removed" = "pending";

  if (user) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("owned_organization_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (profile?.owned_organization_id) {
      const { data: org } = await supabase
        .from("organisations")
        .select("name,approval_status,is_claimed,account_status")
        .eq("organization_id", profile.owned_organization_id)
        .maybeSingle();
      if (org?.name) orgName = org.name;
      const status = (org?.approval_status ?? (org?.is_claimed ? "approved" : "pending")) as
        | "approved"
        | "pending"
        | "blocked"
        | "removed";
      if (status === "blocked") approvalStatus = "blocked";
      else if (status === "removed") approvalStatus = "removed";
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
      <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Organisation Access</p>
      <h1 className="font-display text-3xl text-slate-900">
        {approvalStatus === "pending"
          ? "Waiting for approval"
          : approvalStatus === "blocked"
            ? "Organisation is blocked"
            : "Access not available"}
      </h1>
      <p className="text-sm text-slate-600">
        {approvalStatus === "pending"
          ? `${orgName} is waiting for a System Admin approval before it can receive and manage reports.`
          : approvalStatus === "blocked"
            ? `${orgName} is blocked and currently cannot access the organisation portal.`
          : `${orgName} has been removed or disabled. Please contact WhiteBox support.`}
      </p>
      <div className="flex items-center justify-center gap-3">
        <Link
          href="/portal"
          className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700"
        >
          Refresh status
        </Link>
        <Link
          href="/login"
          className="rounded-full bg-[var(--wb-cobalt)] px-5 py-2 text-sm font-semibold text-white"
        >
          Back to login
        </Link>
      </div>
    </div>
  );
}
