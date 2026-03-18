import { supabase } from "@/lib/supabase";

export async function logActivity(action: string, subject?: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    await supabase.from("activity_log").insert({
      user_id: user.id,
      action,
      subject: subject ?? null
    });
  } catch (err) {
    console.error("Failed to log activity:", err);
  }
}
