import { useState, useEffect, useRef } from "react";

export function useDebouncedUpdate<T>(
  initialValue: T,
  delay: number,
  onSave: (value: T) => Promise<void>
) {
  const [value, setValue] = useState<T>(initialValue);
  const [isSaving, setIsSaving] = useState(false);
  const latestValue = useRef(initialValue);
  const initialValueRef = useRef(initialValue);

  useEffect(() => {
    latestValue.current = value;
  }, [value]);

  useEffect(() => {
    if (value === initialValueRef.current) return;

    const handler = setTimeout(async () => {
      setIsSaving(true);
      await onSave(value);
      initialValueRef.current = value;
      setIsSaving(false);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay, onSave]);

  // Flush handler for visibilitychange/beforeunload
  useEffect(() => {
    const flushSave = () => {
      if (latestValue.current !== initialValueRef.current) {
        onSave(latestValue.current);
        initialValueRef.current = latestValue.current;
      }
    };

    window.addEventListener("beforeunload", flushSave);
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") flushSave();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("beforeunload", flushSave);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [onSave]);

  return { value, setValue, isSaving };
}

// Added for Phase 4 Realtime Sync
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export function useWallets(bundleId: string) {
  const [wallets, setWallets] = useState<any[]>([]);

  useEffect(() => {
    if (!bundleId) return;

    let channel: any;

    const fetchAndSubscribe = async () => {
      const { data } = await supabase.from('wallets').select('*, wallet_cache(*)').eq('bundle_id', bundleId);
      if (data) {
        setWallets(data);
        
        const walletIds = data.map(w => w.id);
        if (walletIds.length > 0) {
          const filter = `wallet_id=in.(${walletIds.join(',')})`;
          channel = supabase.channel(`wallet_updates_${bundleId}`)
            .on('postgres_changes', {
              event: 'UPDATE',
              schema: 'public',
              table: 'wallet_cache',
              filter: filter
            }, (payload) => {
              setWallets(prev => prev.map(w => w.id === payload.new.wallet_id ? { ...w, wallet_cache: payload.new } : w));
            })
            .subscribe();
        }
      }
    };
    
    fetchAndSubscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [bundleId]);

  return { wallets };
}
