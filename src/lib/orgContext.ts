import { supabase } from "@/lib/supabase/client";

export type OrgContext = {
  authUserId: string;
  userId: string;
  organizationId: number;
  organizationName: string | null;
  roleName: string | null;
  profile: {
    firstName: string;
    lastName: string;
    displayName: string;
    email: string;
    phone: string;
    location: string;
    avatarUrl: string;
  };
  orgUser: {
    roleId: number | null;
    department: string | null;
    jobTitle: string | null;
  } | null;
};

export const loadOrgContext = async (): Promise<OrgContext> => {
  const { data: authData } = await supabase.auth.getUser();
  const authUserId = authData.user?.id;
  if (!authUserId) {
    throw new Error("Please log in to view the organisation portal.");
  }

  const { data: profileRow, error: profileError } = await supabase
    .from("user_profiles")
    .select(
      "user_id,owned_organization_id,first_name,last_name,display_name,email,phone,location,profile_picture_url"
    )
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (profileError || !profileRow?.user_id) {
    throw new Error(profileError?.message ?? "Organisation profile not found.");
  }

  const { data: orgUsers } = await supabase
    .from("organization_users")
    .select("organization_id,role_id,department,job_title")
    .eq("user_id", profileRow.user_id);

  const orgUser = orgUsers?.[0] ?? null;
  const organizationId = profileRow.owned_organization_id ?? orgUser?.organization_id;

  if (!organizationId) {
    throw new Error("No organisation found for this account.");
  }

  const [{ data: orgRow }, { data: roleRow }] = await Promise.all([
    supabase.from("organisations").select("name").eq("organization_id", organizationId).maybeSingle(),
    orgUser?.role_id
      ? supabase.from("roles").select("name").eq("role_id", orgUser.role_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    authUserId,
    userId: profileRow.user_id,
    organizationId,
    organizationName: orgRow?.name ?? null,
    roleName: roleRow?.name ?? null,
    profile: {
      firstName: profileRow.first_name ?? "",
      lastName: profileRow.last_name ?? "",
      displayName: profileRow.display_name ?? "",
      email: profileRow.email ?? "",
      phone: profileRow.phone ?? "",
      location: profileRow.location ?? "",
      avatarUrl: profileRow.profile_picture_url ?? "",
    },
    orgUser: orgUser
      ? {
          roleId: orgUser.role_id ?? null,
          department: orgUser.department ?? null,
          jobTitle: orgUser.job_title ?? null,
        }
      : null,
  };
};
