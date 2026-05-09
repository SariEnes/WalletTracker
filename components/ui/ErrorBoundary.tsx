"use client";

import React, { Component, ReactNode } from "react";
import { AlertOctagon } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMsg: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMsg: ""
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMsg: error.message };
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-[#0A0A0A] border border-red-900/50 font-mono text-red-500">
          <AlertOctagon size={48} className="mb-4 text-red-500 animate-pulse" />
          <h2 className="text-xl font-bold mb-2 tracking-widest uppercase">SIGNAL_LOST</h2>
          <p className="text-xs text-red-400 opacity-80 uppercase tracking-widest text-center max-w-sm">
            {this.state.errorMsg || "A critical rendering fault has occurred in this subsystem."}
          </p>
          <button 
            onClick={() => this.setState({ hasError: false })}
            className="mt-6 border border-red-900 px-4 py-2 hover:bg-red-950 transition-colors text-xs tracking-widest"
          >
            REBOOT_COMPONENT
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
