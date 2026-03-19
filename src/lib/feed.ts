import { supabase } from "./supabase";

export async function publishToFeed(
  actionType: string,
  entityId: string,
  entityTitle: string,
  entitySubject?: string,
  isPublic = true
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("activity_feed").insert({
    user_id: user.id,
    action_type: actionType,
    entity_id: entityId,
    entity_title: entityTitle,
    entity_subject: entitySubject ?? null,
    is_public: isPublic
  });
}
