"use client";

import { useDebouncedUpdate } from "@/lib/hooks";
import { Plus } from "lucide-react";

export function Sidebar() {
  const { value: bundleName, setValue: setBundleName, isSaving } = useDebouncedUpdate(
    "Main Portfolio",
    2000,
    async (newValue) => {
      // Normally this hits PATCH /api/bundles/[id]
      console.log("Saved bundle name:", newValue);
    }
  );

  return (
    <aside className="w-[210px] h-screen border-r border-[#1F1F1F] bg-[#0A0A0A] p-4 flex flex-col font-mono text-sm select-none">
      <div className="text-gray-600 mb-6 font-bold tracking-widest text-xs">BUNDLES</div>
      
      <div className="group flex items-center justify-between p-2 -mx-2 rounded hover:bg-[#121212] cursor-text relative transition-colors">
        <input 
          value={bundleName}
          onChange={(e) => setBundleName(e.target.value)}
          className="bg-transparent border-none text-gray-300 outline-none w-full truncate focus:text-accent-blue transition-colors"
        />
        
        {/* UX: Debounced Auto-Save Indicator */}
        {isSaving && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center">
            <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" title="Saving..." />
          </span>
        )}
      </div>
      
      <button className="mt-auto text-accent-blue hover:text-white flex items-center gap-2 py-2 transition-colors uppercase text-xs tracking-widest">
        <Plus size={16} /> NEW_BUNDLE
      </button>
    </aside>
  );
}
