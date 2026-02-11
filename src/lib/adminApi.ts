"use client";

import { supabase } from "@/lib/supabase/client";

type AdminResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function adminInvoke<T>(action: string, payload?: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke<AdminResponse<T>>("admin-portal", {
    body: { action, payload },
  });

  if (error) {
    let details = error.message;
    if (error.context) {
      const raw = await error.context.text();
      try {
        const parsed = JSON.parse(raw) as { error?: string };
        details = parsed.error ?? raw;
      } catch {
        details = raw || error.message;
      }
    }
    if (details.toLowerCase().includes("unknown action")) {
      details =
        "Admin API action not found on deployed edge function. Deploy `supabase/functions/admin-portal` to the same Supabase project used by this environment.";
    }
    throw new Error(details);
  }

  if (!data?.success) {
    throw new Error(data?.error || "Admin action failed.");
  }

  return data.data as T;
}
