"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function AdminPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (!data.session) {
        router.replace("/login");
        return;
      }
      setChecking(false);
    });
  
    return () => {    
      mounted = false;
    };
  }, [router]);

  if (checking) {
    return <div className="p-6 text-sm text-slate-600">Checking session...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="font-display text-3xl">Admin</h1>
      <p className="mt-2 text-sm text-slate-600">
        System admin tools will live here.
      </p>
    </div>
  );
}
