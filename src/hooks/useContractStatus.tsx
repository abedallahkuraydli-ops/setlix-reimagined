import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
  const { user } = useAuth();
  const [contract, setContract] = useState<ContractRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!user) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!profile) {
      setLoading(false);
      return;
    }
    setProfileId(profile.id);
    const { data } = await supabase
      .from("contracts")
      .select("id,client_id,status,contract_file_path,contract_file_name,signature_method,signed_at,signed_file_path,signed_file_name,signature_hash,sealed_at")
      .eq("client_id", profile.id)
      .neq("status", "superseded")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setContract((data as ContractRecord) ?? null);
    setLoading(false);
  }, [user]);

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
