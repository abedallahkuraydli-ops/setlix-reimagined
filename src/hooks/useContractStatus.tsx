import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";

export interface ContractRecord {
  id: string;
  client_id: string;
  status: "pending_signature" | "signed" | "superseded";
  contract_file_path: string;
  contract_file_name: string;
  signature_method: string | null;
  signed_at: string | null;
  signed_file_path: string | null;
  signed_file_name: string | null;
  signature_hash: string | null;
  sealed_at: string | null;
}

export function useContractStatus() {
  const { profile, loading: profileLoading } = useProfile();
  const [contract, setContract] = useState<ContractRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const profileId = profile?.id ?? null;

  const refetch = useCallback(async () => {
    if (!profileId) {
      if (!profileLoading) setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("contracts")
      .select("id,client_id,status,contract_file_path,contract_file_name,signature_method,signed_at,signed_file_path,signed_file_name,signature_hash,sealed_at")
      .eq("client_id", profileId)
      .neq("status", "superseded")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setContract((data as ContractRecord) ?? null);
    setLoading(false);
  }, [profileId, profileLoading]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (!profileId) return;
    const channel = supabase
      .channel(`contract-${profileId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contracts", filter: `client_id=eq.${profileId}` },
        () => refetch()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId, refetch]);

  const hasContract = !!contract;
  const isSigned = contract?.status === "signed";
  const needsSignature = !!contract && contract.status === "pending_signature";

  return { contract, loading, hasContract, isSigned, needsSignature, refetch };
}
