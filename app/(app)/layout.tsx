import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id,email,display_name,is_authorized")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_authorized) {
    redirect("/login?error=unauthorized");
  }

  return <AppShell email={profile.email}>{children}</AppShell>;
}
