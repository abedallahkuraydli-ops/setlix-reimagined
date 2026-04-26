import { supabase } from "@/integrations/supabase/client";

/**
 * Find an open conversation between the client and Setlix to use for
 * service-request decisions (or any admin reply). If none exist, create one
 * with the given subject. Returns the conversation id (or null on failure).
 */
export async function findOrCreateAdminConversation(
  clientProfileId: string,
  subject: string,
): Promise<string | null> {
  // Prefer an existing open conversation
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("client_id", clientProfileId)
    .eq("status", "open")
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({ client_id: clientProfileId, subject })
    .select("id")
    .single();
  if (error || !created) {
    console.error("findOrCreateAdminConversation failed", error);
    return null;
  }
  return created.id;
}

/**
 * Post an admin reply into the client's messages thread. The message is
 * authored by the currently-signed-in admin (their profile id).
 */
export async function postAdminMessageToClient(
  clientProfileId: string,
  body: string,
  subject = "Service request update",
): Promise<boolean> {
  const conversationId = await findOrCreateAdminConversation(clientProfileId, subject);
  if (!conversationId) return false;

  // Get the admin's profile id
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!adminProfile?.id) return false;

  const { error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: adminProfile.id,
      body,
    });
  if (error) {
    console.error("postAdminMessageToClient failed", error);
    return false;
  }
  return true;
}
