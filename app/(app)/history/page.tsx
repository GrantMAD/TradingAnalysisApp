import { Metadata } from "next";

export const metadata: Metadata = {
  title: "History",
};

export default function HistoryPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="glass p-12 rounded-2xl flex flex-col items-center justify-center text-center min-h-[400px] border-dashed border-2 border-border/50">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
        </div>
        <h2 className="text-2xl font-bold tracking-tight mb-3">Analysis History</h2>
        <p className="text-muted-foreground max-w-md">
          This feature is scheduled for Phase 7 (History and Review). It will allow you to review and audit past trade setups and AI reasoning.
        </p>
      </div>
    </div>
  );
}
