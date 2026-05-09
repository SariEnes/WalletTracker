"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BundleList } from "../../components/wallet/BundleList";
import { supabase } from "../../lib/hooks";

export default function DashboardPage() {
    const [bundles, setBundles] = useState<any[]>([]);
    const [wallets, setWallets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
            router.push("/login");
            return;
        }

        const [bundlesRes, walletsRes] = await Promise.all([
            supabase.from("bundles").select("*").eq("user_id", userData.user.id).order("created_at", { ascending: false }),
            // RLS automatically scopes wallets to the user's bundles.
            // wallets table has no user_id or created_at column.
            supabase.from("wallets").select("*, wallet_cache(*)")
        ]);

        if (walletsRes.error) console.error("Wallets Fetch SQL Error:", walletsRes.error);
        console.log("Fetched Wallets:", walletsRes.data);

        if (bundlesRes.data) setBundles(bundlesRes.data);
        if (walletsRes.data) setWallets(walletsRes.data);
        setLoading(false);
    };

    const handleCreateBundle = async (name: string) => {
        if (!name) return;
        
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
            alert("You must be logged in to create a bundle.");
            router.push("/login");
            return;
        }

        const { data, error } = await supabase.from("bundles").insert({
            name,
            user_id: userData.user.id
        }).select();

        if (data && data.length > 0) {
            setBundles([data[0], ...bundles]);
        } else if (error) {
            console.error("Error creating bundle:", error);
            alert("Failed to create bundle");
        }
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    if (loading) {
        return <div className="h-screen w-full bg-[#121212] flex items-center justify-center font-mono text-accent-green animate-pulse">LOADING_DATA...</div>;
    }

    return (
        <main className="h-screen w-full flex flex-col bg-[#121212] overflow-hidden">
            <div className="flex-1 overflow-hidden relative">
                <BundleList bundles={bundles} wallets={wallets} onCreateBundle={handleCreateBundle} onSignOut={handleSignOut} onRefresh={fetchData} />
            </div>
        </main>
    );
}