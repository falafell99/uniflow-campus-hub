import { supabase } from "@/lib/supabase";

export async function logTeamActivity(teamId: string, action: string, entityType?: string, entityTitle?: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    await supabase.from("team_activity").insert({
      team_id: teamId, 
      user_id: user.id,
      action, 
      entity_type: entityType ?? null, 
      entity_title: entityTitle ?? null
    });
  } catch (err) {
    console.error("Failed to log team activity:", err);
  }
}
