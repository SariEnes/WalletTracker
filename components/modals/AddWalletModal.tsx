"use client";
import React, { useState } from "react";

export function AddWalletModal({ 
  onClose, 
  onAdd,
  bundles = [],
  initialBundleId = ""
}: { 
  onClose: () => void, 
  onAdd: (address: string, label: string, bundleId: string) => void,
  bundles?: { id: string, name: string }[],
  initialBundleId?: string
}) {
  const [address, setAddress] = useState("");
  const [label, setLabel] = useState("");
  const [bundleId, setBundleId] = useState(initialBundleId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(address, label, bundleId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm font-mono">
      <div className="w-full max-w-md bg-[#121212] border border-[#1F1F1F] p-6 shadow-[0_0_30px_rgba(0,255,65,0.1)]">
        <h2 className="text-accent-green text-lg mb-4">ADD_NEW_WALLET</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-gray-500 uppercase">Address</label>
            <input 
              type="text" 
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="0x... or G..." 
              className="w-full mt-1 bg-[#0A0A0A] border border-[#1F1F1F] p-2 text-gray-200 focus:outline-none focus:border-accent-green"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase">Label (Optional)</label>
            <input 
              type="text" 
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Main Vault" 
              className="w-full mt-1 bg-[#0A0A0A] border border-[#1F1F1F] p-2 text-gray-200 focus:outline-none focus:border-accent-green"
            />
          </div>
          {bundles && bundles.length > 0 && (
            <div>
              <label className="text-xs text-gray-500 uppercase">Bundle</label>
              <select
                value={bundleId}
                onChange={(e) => setBundleId(e.target.value)}
                className="w-full mt-1 bg-[#0A0A0A] border border-[#1F1F1F] p-2 text-gray-200 focus:outline-none focus:border-accent-green appearance-none"
              >
                <option value="">No Bundle</option>
                {bundles.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex justify-end gap-3 mt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-500 hover:text-gray-300 transition-colors">CANCEL</button>
            <button type="submit" className="px-4 py-2 bg-accent-green text-black hover:bg-[#00cc33] font-bold transition-colors">ADD</button>
          </div>
        </form>
      </div>
    </div>
  );
}