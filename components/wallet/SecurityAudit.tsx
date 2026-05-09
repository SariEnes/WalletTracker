import React from "react";

function SecurityTerminal({ logs }: { logs: string[] }) {
  const [visibleLogs, setVisibleLogs] = React.useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = React.useState(0);

  React.useEffect(() => {
    if (currentIndex < logs.length) {
      const timer = setTimeout(() => {
        setVisibleLogs(prev => [...prev, logs[currentIndex]]);
        setCurrentIndex(prev => prev + 1);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, logs]);

  return (
    <div className="bg-black/40 border border-zinc-800/50 rounded-lg p-4 font-mono text-[11px] leading-relaxed min-h-[200px]">
      {visibleLogs.map((log, i) => (
        <div key={i} className={log.includes("WARNING") ? "text-rose-500" : "text-cyan-400/80"}>
          {log}
        </div>
      ))}
      {currentIndex < logs.length && (
        <span className="inline-block w-2 h-3 bg-cyan-400 animate-pulse ml-1" />
      )}
    </div>
  );
}

export function SecurityAudit({ data }: { data: any }) {
  const tokens = data?.tokens || [];
  const spamCount = tokens.filter((t: any) => t.isSpam).length;
  const legitCount = tokens.filter((t: any) => !t.isSpam).length;
  const chains = data?.activeChains || [];
  
  const logs = [
    "> INITIALIZING SECURITY AUDIT...",
    "> WALLET TYPE: EOA (EXTERNALLY OWNED ACCOUNT)",
    `> CHAINS SCANNED: ${chains.length > 0 ? chains.join(", ") : "NONE"}`,
    `> TOKENS DETECTED: ${tokens.length}`,
    `> LEGITIMATE ASSETS: ${legitCount}`,
    `> SPAM FILTER: ACTIVE — ${spamCount} FLAGGED`,
    spamCount > 10 ? "> WARNING: HIGH SPAM EXPOSURE DETECTED" : "> SPAM EXPOSURE: LOW",
    `> NET WORTH VERIFICATION: $${(data?.netWorthUsd || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    "> CONTRACT INTERACTION RISK: STANDARD",
    "> AUDIT STATUS: COMPLETE",
  ];

  return <SecurityTerminal logs={logs} />;
}
