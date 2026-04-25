import { supabase } from "@/integrations/supabase/client";

export type ClientChangeType =
  | "service_added"
  | "service_status_changed"
  | "service_removed"
  | "service_request_approved"
  | "service_request_rejected"
  | "payment_recorded"
  | "billing_updated"
  | "document_uploaded"
  | "document_requested"
  | "document_deleted";

interface NotifyClientParams {
  clientProfileId: string;
  type: ClientChangeType;
  title: string;
  body: string;
  linkPath?: string;
  metadata?: Record<string, unknown>;
  emailTemplateData?: Record<string, unknown>;
}

/**
 * Sends an in-portal notification AND an email to the client about a change
 * made by an admin. Fire-and-forget — failures are logged, not surfaced.
 */
export async function notifyClientOfChange({
  clientProfileId,
  type,
  title,
  body,
  linkPath,
  metadata,
  emailTemplateData,
}: NotifyClientParams): Promise<void> {
  try {
    // Fetch the client's user_id and email
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id, full_name, first_name")
      .eq("id", clientProfileId)
      .maybeSingle();

    if (!profile?.user_id) return;

    const recipientUserId = profile.user_id;
    const clientName =
      profile.full_name || profile.first_name || "there";

    // Insert in-portal notification
    await supabase.from("notifications").insert([
      {
        recipient_user_id: recipientUserId,
        audience: "client",
        type,
        title,
        body,
        link_path: linkPath ?? null,
        metadata: (metadata ?? null) as never,
      },
    ]);

    // Look up client email from auth.users via admin? Not available client-side.
    // Use the service request notification pattern: invoke the email function
    // and let it derive recipient from auth.users via admin lookup.
    // Simpler: fetch from auth via current session? Not possible for other users.
    // We rely on storing emails on profiles isn't done; instead use an edge function call:
    const { data: emailLookup } = await supabase.functions.invoke<{
      email: string | null;
    }>("get-user-email", {
      body: { userId: recipientUserId },
    });

    const recipientEmail = emailLookup?.email;
    if (!recipientEmail) return;

    await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "client-account-update",
        recipientEmail,
        idempotencyKey: `client-update-${clientProfileId}-${type}-${Date.now()}`,
        templateData: {
          clientName,
          changeTitle: title,
          changeBody: body,
          changeType: type,
          ...(emailTemplateData || {}),
        },
      },
    });
  } catch (err) {
    console.error("notifyClientOfChange failed", err);
  }
}
