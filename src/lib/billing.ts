// Shared billing computation for client + admin views.
import { supabase } from "@/integrations/supabase/client";

export const ACTIVE_BILLING_STATUSES = ["requested", "in_review", "in_progress", "awaiting_client"] as const;

export type BillingRow = {
  id: string;
  client_id: string;
  total_override_cents: number | null;
  currency: string;
  next_payment_due_at: string | null;
  last_payment_at: string | null;
  late_fee_percentage: number;
  late_fee_enabled: boolean;
  late_fee_applied_count: number;
  late_fee_last_applied_at: string | null;
  notes: string | null;
};

export type PaymentRow = {
  id: string;
  amount_cents: number;
  currency: string;
  paid_at: string;
  note: string | null;
};

export type ServicePriceRow = {
  status: string;
  price_cents: number | null;
  quantity: number;
};

export interface BillingSummary {
  /** Sum of active services (price_cents * quantity). */
  servicesTotalCents: number;
  /** Final base total (override if set, else services total). */
  baseTotalCents: number;
  /** True if the override is lower than the services total. */
  hasDiscount: boolean;
  /** Discount amount (services - override) when override is lower. */
  discountCents: number;
  /** Late fee currently applied (compounded). */
  lateFeeCents: number;
  /** baseTotal + lateFee. */
  grandTotalCents: number;
  /** Sum of payments. */
  paidCents: number;
  /** grandTotal - paid (>=0). */
  remainingCents: number;
  /** Days until next due (negative = overdue). null if no due date. */
  daysUntilDue: number | null;
  /** True when next due date has passed and balance remains. */
  isOverdue: boolean;
  currency: string;
}

export function computeBilling(
  services: ServicePriceRow[],
  billing: BillingRow | null,
  payments: PaymentRow[],
): BillingSummary {
  const servicesTotalCents = services
    .filter((s) => (ACTIVE_BILLING_STATUSES as readonly string[]).includes(s.status))
    .reduce((sum, s) => sum + (s.price_cents ?? 0) * (s.quantity ?? 1), 0);

  const override = billing?.total_override_cents ?? null;
  const baseTotalCents = override ?? servicesTotalCents;

  const hasDiscount = override !== null && override < servicesTotalCents;
  const discountCents = hasDiscount ? servicesTotalCents - (override as number) : 0;

  const feePct = billing?.late_fee_enabled ? (billing?.late_fee_percentage ?? 0) : 0;
  const appliedCount = billing?.late_fee_applied_count ?? 0;
  // Compounded fee: total * ((1 + pct/100)^count - 1)
  let lateFeeCents = 0;
  if (feePct > 0 && appliedCount > 0) {
    const multiplier = Math.pow(1 + feePct / 100, appliedCount);
    lateFeeCents = Math.round(baseTotalCents * (multiplier - 1));
  }

  const grandTotalCents = baseTotalCents + lateFeeCents;
  const paidCents = payments.reduce((s, p) => s + p.amount_cents, 0);
  const remainingCents = Math.max(grandTotalCents - paidCents, 0);

  let daysUntilDue: number | null = null;
  let isOverdue = false;
  if (billing?.next_payment_due_at) {
    const now = new Date();
    const due = new Date(billing.next_payment_due_at);
    const ms = due.getTime() - now.getTime();
    daysUntilDue = Math.ceil(ms / 86400000);
    isOverdue = daysUntilDue < 0 && remainingCents > 0;
  }

  return {
    servicesTotalCents,
    baseTotalCents,
    hasDiscount,
    discountCents,
    lateFeeCents,
    grandTotalCents,
    paidCents,
    remainingCents,
    daysUntilDue,
    isOverdue,
    currency: billing?.currency ?? "EUR",
  };
}

export function formatMoney(cents: number, currency = "EUR") {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency }).format(cents / 100);
}

export async function loadBillingForClient(clientId: string) {
  const [services, billing, payments] = await Promise.all([
    supabase.from("client_services").select("status, price_cents, quantity").eq("client_id", clientId),
    supabase.from("client_billing").select("*").eq("client_id", clientId).maybeSingle(),
    supabase.from("client_payments").select("*").eq("client_id", clientId).order("paid_at", { ascending: false }),
  ]);
  return {
    services: (services.data ?? []) as ServicePriceRow[],
    billing: (billing.data ?? null) as BillingRow | null,
    payments: (payments.data ?? []) as PaymentRow[],
  };
}

/**
 * Apply any new late-fee periods that have elapsed since the last application.
 * Returns the updated billing row (or null if nothing changed / no due date / disabled).
 */
export async function applyDueLateFees(
  clientId: string,
  billing: BillingRow,
): Promise<BillingRow | null> {
  if (!billing.late_fee_enabled || !billing.next_payment_due_at) return null;
  const now = new Date();
  const due = new Date(billing.next_payment_due_at);
  if (now <= due) return null;

  // One late-fee period = the original due interval, but we don't have it.
  // Use a simple monthly cadence (30 days) per overdue period after the due date.
  const PERIOD_DAYS = 30;
  const elapsedDays = Math.floor((now.getTime() - due.getTime()) / 86400000);
  const periodsExpected = 1 + Math.floor(elapsedDays / PERIOD_DAYS);
  if (periodsExpected <= billing.late_fee_applied_count) return null;

  const { data, error } = await supabase
    .from("client_billing")
    .update({
      late_fee_applied_count: periodsExpected,
      late_fee_last_applied_at: now.toISOString(),
    })
    .eq("id", billing.id)
    .select()
    .maybeSingle();

  if (error || !data) return null;
  return data as BillingRow;
}
