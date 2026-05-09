export default function HomePage() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-black text-green-500">
            <div className="border border-green-500/30 p-8 rounded-lg bg-green-500/5 backdrop-blur-sm">
                <h1 className="text-4xl font-mono mb-4 tracking-tighter">
                    SYSTEM_STATUS: ONLINE
                </h1>
                <p className="font-mono text-lg text-green-400/80">
                    ODTÜ Blockchain Terminal // Vibe Wallet Tracker
                </p>
                <div className="mt-8 pt-4 border-t border-green-500/20 text-sm font-mono text-green-600">
                    [ DEPLOYMENT_SUCCESSFUL ]
                </div>
            </div>
        </main>
    );
}